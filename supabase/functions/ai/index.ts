// Supabase Edge Function "ai": lets the signed-in family ask Claude for interview questions and stories.
// Needs the secret ANTHROPIC_API_KEY (Supabase > Edge Functions > Secrets).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const publishable: Record<string, string> = (() => { try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}"); } catch { return {}; } })();
const publicKey = publishable.default ?? Object.values(publishable)[0] ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, publicKey, { auth: { persistSession: false } });

type Turn = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  // Only the family account may use the AI: the public key alone is not enough, Supabase must recognise
  // the person's sign-in. New projects have publishable keys, older ones the anon key: either will do.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!user) return json({ error: "not_signed_in" }, 401);

  try {
    const { turns, images } = await req.json() as { turns: Turn[]; images?: string[] };
    if (!Array.isArray(turns) || !turns.length || turns.length > 30) return json({ error: "bad_request" }, 400);
    const messages = turns.map((t, i) => {
      if (i === 0 && images?.length) {
        return {
          role: "user" as const,
          content: [
            ...images.slice(0, 6).map((data) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data } })),
            { type: "text" as const, text: t.content },
          ],
        };
      }
      return { role: t.role, content: t.content };
    });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    } as any);
    if (response.stop_reason === "refusal") return json({ error: "refusal" }, 422);
    const text = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    return json({ text });
  } catch (e) {
    console.error(e);
    return json({ error: "ai_failed" }, 502);
  }
});
