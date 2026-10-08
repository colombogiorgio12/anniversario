// Supabase Edge Function "voce": reads the album's words aloud with Google's natural voices (Chirp 3 HD, Italian).
// Needs the secret GOOGLE_TTS_KEY (Supabase > Edge Functions > Secrets): a Google Cloud API key limited to the
// Cloud Text-to-Speech API. Each sentence is made once and kept in the album's storage, so hearing it again costs
// nothing, and a monthly limit (voice_take in schema.sql) keeps the voices inside Google's free allowance: past it the
// function says no, and the album reads with the phone's own voice until the next month.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const KEY = Deno.env.get("GOOGLE_TTS_KEY") ?? "";
const URL_ = Deno.env.get("SUPABASE_URL")!;
const publishable: Record<string, string> = (() => { try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}"); } catch { return {}; } })();
const publicKey = publishable.default ?? Object.values(publishable)[0] ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const auth = createClient(URL_, publicKey, { auth: { persistSession: false } });

// The voices the album offers, gentlest first. The first one reads when nobody has chosen.
const VOICES = ["Sulafat", "Vindemiatrix", "Achernar", "Algieba", "Achird", "Iapetus"];
const MAX_TEXT = 1500;
const WEEK = 60 * 60 * 24 * 7;

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Only the family may use the voices: Supabase must recognise the person's sign-in.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await auth.auth.getUser(token) : { data: { user: null } };
  if (!user) return json({ error: "not_signed_in" }, 401);
  if (!KEY) return json({ error: "not_configured" }, 503);

  // Storage and the monthly count are reached as the person who asked, so the family's own rules apply.
  const sb = createClient(URL_, publicKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  try {
    const body = await req.json();
    if (body.check) {
      const { data: left } = await sb.rpc("voice_left");
      return json({ ok: true, voices: VOICES, left: left ?? null });
    }
    const text = String(body.text ?? "").replace(/\s+/g, " ").trim();
    const name = VOICES.includes(body.voice) ? body.voice : VOICES[0];
    const rate = Math.round(Math.min(1.3, Math.max(0.7, Number(body.rate) || 1)) * 100) / 100;
    if (!text || text.length > MAX_TEXT) return json({ error: "bad_request" }, 400);

    // The same words in the same voice and speed are made only once.
    const path = `voce/${await sha256(`${name}|${rate}|${text}`)}.mp3`;
    const store = sb.storage.from("album");
    const have = await store.createSignedUrl(path, WEEK);
    if (have.data?.signedUrl) return json({ url: have.data.signedUrl });

    // Counted before asking Google, and never given back: a failed try still counts, so the limit can only err on the safe side.
    const { data: ok, error: countError } = await sb.rpc("voice_take", { n: text.length });
    if (countError) { console.error(countError); return json({ error: "voice_failed" }, 502); }
    if (!ok) return json({ error: "limit" }, 429);

    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "it-IT", name: `it-IT-Chirp3-HD-${name}` },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate },
      }),
    });
    if (!r.ok) { console.error("google", r.status, await r.text()); return json({ error: "voice_failed" }, 502); }
    const { audioContent } = await r.json();
    if (!audioContent) return json({ error: "voice_failed" }, 502);
    const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
    const up = await store.upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (up.error) { console.error(up.error); return json({ error: "voice_failed" }, 502); }
    const made = await store.createSignedUrl(path, WEEK);
    return made.data?.signedUrl ? json({ url: made.data.signedUrl }) : json({ error: "voice_failed" }, 502);
  } catch (e) {
    console.error(e);
    return json({ error: "voice_failed" }, 502);
  }
});
