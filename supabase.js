// Online storage for the real site. Photos, memories and stories are shared by the whole family;
// favourites and personal albums belong to whoever is signed in and nobody else can read them.
// Everyone signs in with their own name and password. Loaded only when CONFIG.mode is "supabase".
(() => {
  const C = window.CONFIG;
  if (C.mode !== "supabase" || !window.supabase) return;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const WEEK = 60 * 60 * 24 * 7;
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let meId = null;

  async function signedMap(paths) {
    const out = {};
    for (let i = 0; i < paths.length; i += 200) {
      const { data } = await sb.storage.from("album").createSignedUrls(paths.slice(i, i + 200), WEEK);
      (data || []).forEach(d => { if (d.signedUrl) out[d.path] = d.signedUrl; });
    }
    return out;
  }
  const dataURLToBlob = async u => (await fetch(u)).blob();
  const blobToB64 = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(String(f.result).split(",")[1]); f.readAsDataURL(b); });
  const personFor = email => C.people.find(p => p.email && email && p.email.toLowerCase() === email.toLowerCase());
  const check = ({ error }) => { if (error) throw error; };
  // Photo details as the app names them, and the columns that hold them.
  const COLS = { place: "place", people: "people", caption: "caption", tags: "tags", aiTags: "ai_tags", aiCaption: "ai_caption", aiPlace: "ai_place", aiArea: "ai_area", aiGroup: "ai_group", date: "date" };
  const toRow = m => Object.fromEntries(Object.entries(m || {}).filter(([k]) => k in COLS).map(([k, v]) => [COLS[k], v]));

  // Step 1: tap your name. Step 2: type your own password. Done once per phone.
  function loginScreen() {
    $("#tabs").hidden = true;
    return new Promise(resolve => {
      const pickName = () => {
        $("#app").innerHTML = `<header class="hero"><span class="mono mute">Quarant'anni insieme</span>
          <h1 class="h1" style="margin-top:18px">Ben<br><span class="serif">venuti</span></h1></header>
          <p class="lede">Tocca il tuo nome.</p>
          <div class="who-grid">${C.people.map(p => `<button type="button" class="who-card" data-login="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.desc || "")}</span></button>`).join("")}</div>`;
        document.querySelectorAll("[data-login]").forEach(b => b.onclick = () => askPassword(C.people.find(p => p.id === b.dataset.login)));
      };
      const askPassword = (p, message) => {
        $("#app").innerHTML = `<header class="hero"><span class="mono mute">Quarant'anni insieme</span>
          <h1 class="h1" style="margin-top:18px">Ciao<br><span class="serif">${esc(p.name)}</span></h1></header>
          <form id="login" style="display:grid;gap:16px;max-width:520px">
            <div class="field"><label for="pw">La tua password</label><input id="pw" type="password" autocomplete="current-password" required></div>
            ${message ? `<p class="hint" role="alert" style="color:var(--ink);font-weight:600">${esc(message)}</p>` : ""}
            <button class="btn block" type="submit">Entra nell'album</button>
            <button class="link" type="button" id="notMe" style="justify-self:start">Non sono ${esc(p.name)}</button>
            <p class="hint">Basta farlo una volta: questo telefono se lo ricorderà.</p>
          </form>`;
        $("#notMe").onclick = pickName;
        setTimeout(() => $("#pw") && $("#pw").focus(), 200);
        $("#login").onsubmit = async e => {
          e.preventDefault();
          const btn = $("#login button[type=submit]"); btn.disabled = true; btn.textContent = "Un attimo…";
          const { data, error } = await sb.auth.signInWithPassword({ email: p.email, password: $("#pw").value });
          if (error || !data.session) { askPassword(p, error && /fetch|network/i.test(error.message) ? "Non c'è connessione. Riprova tra poco." : "Password non corretta. Riprova."); return; }
          meId = p.id; resolve();
        };
      };
      pickName();
    });
  }

  window.SupabaseStore = {
    async init() {
      const { data } = await sb.auth.getSession();
      const p = data.session && personFor(data.session.user.email);
      if (p) { meId = p.id; return; }
      if (data.session) await sb.auth.signOut();
      await loginScreen();
    },
    me() { return meId; },
    async signOut() { await sb.auth.signOut(); },

    // Shared by the family
    async addedPhotos() {
      const { data: rows, error } = await sb.from("photos").select("*").order("date");
      if (error) throw error;
      const urls = await signedMap(rows.flatMap(r => [r.path, r.thumb_path, r.video_path].filter(Boolean)));
      // A video is shown by a still frame of it (path) and plays from video_path.
      return rows.map(r => ({ id: r.id, date: r.date, ar: r.ar || 1, full: urls[r.path], thumb: urls[r.thumb_path] || urls[r.path],
        ...(r.video_path && urls[r.video_path] ? { video: urls[r.video_path], dur: r.dur || 0 } : {}),
        gps: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : null, created: r.created_at ? Date.parse(r.created_at) : 0,
        meta: { place: r.place || "", people: r.people || "", caption: r.caption || "", tags: r.tags || [], aiTags: r.ai_tags || [], aiCaption: r.ai_caption || "", aiPlace: r.ai_place || "", aiArea: r.ai_area || "", aiGroup: r.ai_group || "" },
        by: r.added_by }));
    },
    async photoMeta() { return {}; },
    // Only what changed is written, so two people editing different details don't undo each other.
    async savePhotoMeta(id, meta) {
      const row = toRow(meta);
      if (Object.keys(row).length) check(await sb.from("photos").update(row).eq("id", id));
    },
    async addPhoto(p) {
      const path = `full/${p.id}.jpg`, thumbPath = `thumb/${p.id}.jpg`;
      const up1 = await sb.storage.from("album").upload(path, p.blob, { contentType: "image/jpeg", upsert: true });
      const up2 = await sb.storage.from("album").upload(thumbPath, await dataURLToBlob(p.thumb), { contentType: "image/jpeg", upsert: true });
      if (up1.error || up2.error) throw up1.error || up2.error;
      let videoPath = null;
      if (p.videoBlob) {
        const ext = ((p.videoBlob.name || "").match(/\.(mov|mp4|m4v)$/i) || [0, "mp4"])[1].toLowerCase();
        videoPath = `video/${p.id}.${ext}`;
        const up3 = await sb.storage.from("album").upload(videoPath, p.videoBlob, { contentType: p.videoBlob.type || (ext === "mov" ? "video/quicktime" : "video/mp4"), upsert: true });
        if (up3.error) throw up3.error;
      }
      const m = p.meta || {};
      check(await sb.from("photos").insert({ ...toRow(m), id: p.id, date: p.date, ar: p.ar, path, thumb_path: thumbPath, video_path: videoPath, dur: p.dur || null, added_by: p.by, lat: p.gps ? p.gps.lat : null, lon: p.gps ? p.gps.lon : null }));
      return { id: p.id, date: p.date, ar: p.ar, thumb: p.thumb, full: URL.createObjectURL(p.blob), ...(p.videoBlob ? { video: URL.createObjectURL(p.videoBlob), dur: p.dur } : {}), gps: p.gps || null, meta: m, by: p.by, created: p.created, saved: true };
    },
    // Asking to take a photo out of the album: one row per person and photo. The photo itself is kept.
    async removals() {
      const { data, error } = await sb.from("removals").select("photo_id, who");
      if (error) throw error;
      const out = {};
      data.forEach(r => (out[r.photo_id] = out[r.photo_id] || []).push(r.who));
      return out;
    },
    async setRemoval(who, id, on) {
      check(on ? await sb.from("removals").upsert({ photo_id: id, who }, { onConflict: "photo_id,who", ignoreDuplicates: true })
               : await sb.from("removals").delete().eq("photo_id", id).eq("who", who));
    },
    async clearRemovals(id) { check(await sb.from("removals").delete().eq("photo_id", id)); },
    async memories() {
      const { data, error } = await sb.from("memories").select("*");
      if (error) throw error;
      return data.map(r => ({ ...r, photoIds: r.photo_ids || [] }));
    },
    async saveMemory(m) {
      const { photoIds, ...rest } = m;
      check(await sb.from("memories").upsert({ ...rest, photo_ids: photoIds || [] }));
      return m;
    },
    async deleteMemory(id) { check(await sb.from("memories").delete().eq("id", id)); },
    async stories() {
      const { data, error } = await sb.from("stories").select("*");
      if (error) throw error;
      return Object.fromEntries(data.map(r => [r.chapter, { story: r.story, details: r.details || [], count: r.count, updated: r.updated }]));
    },
    async saveStory(chapter, s) {
      check(await sb.from("stories").upsert({ chapter, story: s.story, details: s.details, count: s.count, updated: s.updated }));
    },
    // Chapters kept as data: the album's own (from the SQL of the private guide) and the ones the family adds. A name
    // and the days it spans, the photos of those days go in it by themselves; maybe a label, a first question, a cover.
    async chapters() {
      const { data, error } = await sb.from("chapters").select("*");
      if (error) throw error;
      return data.map(r => ({ id: r.id, title: r.title, from: r.date_from, to: r.date_to, by: r.added_by, created: r.created,
        ...(r.label ? { label: r.label } : {}), ...(r.starter ? { starter: r.starter } : {}), ...(r.cover ? { cover: r.cover } : {}) }));
    },
    async saveChapter(c) {
      check(await sb.from("chapters").upsert({ id: c.id, title: c.title, date_from: c.from, date_to: c.to, added_by: c.by, created: c.created,
        label: c.label || null, starter: c.starter || null, cover: c.cover || null }));
    },
    async deleteChapter(id) { check(await sb.from("chapters").delete().eq("id", id)); },

    // Personal: the database only ever returns the signed-in person's own rows.
    async favorites() {
      const { data, error } = await sb.from("favorites").select("photo_id");
      if (error) throw error;
      return data.map(r => r.photo_id);
    },
    async setFavorite(_who, id, on) {
      check(on ? await sb.from("favorites").upsert({ photo_id: id }, { onConflict: "owner,photo_id", ignoreDuplicates: true })
               : await sb.from("favorites").delete().eq("photo_id", id));
    },
    async albums() {
      const { data, error } = await sb.from("albums").select("*");
      if (error) throw error;
      return data.map(r => ({ id: r.id, name: r.name, photoIds: r.photo_ids || [], created: r.created }));
    },
    async saveAlbum(_who, a) {
      check(await sb.from("albums").upsert({ id: a.id, name: a.name, photo_ids: a.photoIds, created: a.created }));
      return a;
    },
    async deleteAlbum(_who, id) { check(await sb.from("albums").delete().eq("id", id)); },
  };

  window.SupabaseAI = {
    async text(turns, { images } = {}) {
      const body = { turns };
      if (images && images.length) body.images = await Promise.all(images.map(blobToB64));
      const { data, error } = await sb.functions.invoke("ai", { body });
      if (error || !data || !data.text) throw { code: "ai_failed" };
      return data.text;
    },
  };

  // Google's natural voices, through the "voce" function: each sentence comes back as a link to its recording, made
  // once and kept. A refusal says why: "limit" once the month's free allowance is used, "not_configured" until the
  // Google key is in place. The album then reads with the device's own voice.
  async function voice(body) {
    const { data, error } = await sb.functions.invoke("voce", { body });
    if (!error && data) return data;
    let code = "voice_failed";
    try { code = (await error.context.json()).error || code; } catch {}
    throw { code };
  }
  window.SupabaseVoice = {
    async status() { const d = await voice({ check: true }); if (!d.ok) throw { code: "voice_failed" }; return d; },
    async url(text, name, rate) { const d = await voice({ text, voice: name, rate }); if (!d.url) throw { code: d.error || "voice_failed" }; return d.url; },
  };
})();
