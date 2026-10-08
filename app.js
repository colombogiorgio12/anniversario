(() => {
"use strict";
const C = window.CONFIG;
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
const fmtDate = d => { if (!d) return ""; const [y, m, g] = d.split("-").map(Number); return m && g ? `${g} ${MESI[m-1]} ${y}` : m ? `${MESI[m-1]} ${y}` : String(y); };
// Dates can be partial: "1992-00-00" is some time in 1992, "1992-08-00" is August 1992.
const dkey = d => { const [y, m, g] = String(d || "").split("-"); return `${y}-${m && m !== "00" ? m : "06"}-${g && g !== "00" ? g : "15"}`; };
const byDate = (a, b) => { const x = dkey(a.date), y = dkey(b.date); return x < y ? -1 : x > y ? 1 : 0; };
const THIS_YEAR = new Date().getFullYear();
const yearsTxt = (a, b) => a === b ? `del ${a}` : `dal ${a} al ${b}`;
const monthSelect = (id, m) => `<span class="sel"><select id="${id}"><option value="0">Non lo so</option>${MESI.map((x, k) => `<option value="${k + 1}"${m === k + 1 ? " selected" : ""}>${x}</option>`).join("")}</select></span>`;
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n, w = 2) => String(n).padStart(w, "0");
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// A repeatable shuffle, so the home keeps its order until someone asks for a new one.
const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffleWith = (a, r) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// Sentences, without look-behind patterns: older iPhones cannot read them and the whole page would stop.
const sentences = t => (String(t || "").replace(/\s+/g, " ").trim().match(/[^.!?…]+(?:[.!?…]+["'»”)]*\s*|$)/g) || []).map(s => s.trim()).filter(Boolean);
const speechChunks = t => sentences(t).flatMap(s => s.length <= 220 ? [s] : s.split(/,\s+/).reduce((a, x) => { const l = a[a.length - 1]; if (l && (l + ", " + x).length <= 220) a[a.length - 1] = l + ", " + x; else a.push(x); return a; }, []));
const firstSentence = t => { const s = sentences(t)[0] || ""; return s.length > 180 ? s.slice(0, 177) + "…" : s; };
const RM = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const ls = {
  get(k, d) { try { const v = localStorage.getItem("album40:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("album40:" + k, JSON.stringify(v)); return true; } catch { return false; } },
};

// ---------- Icons ----------
const I = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
  speaker: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M4 7h3c5 0 5 10 10 10h3M4 17h3c2 0 3-1.5 4-3.5M20 7h-3c-2 0-3 1.5-4 3.5M17 4l3 3-3 3M17 14l3 3-3 3"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2-6z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  album: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="13" height="14" rx="1.5"/><path d="M8 3h11a1 1 0 0 1 1 1v12"/><path d="M10.5 10v6M7.5 13h6"/></svg>',
  photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 13.4A8 8 0 1 1 10.6 4a6.2 6.2 0 0 0 9.4 9.4z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6"/><path d="M12 3.2v1.9M12 18.9v1.9M3.2 12h1.9M18.9 12h1.9M5.8 5.8l1.3 1.3M16.9 16.9l1.3 1.3M5.8 18.2l1.3-1.3M16.9 7.1l1.3-1.3"/></svg>',
};

// ---------- Light or dark ----------
// The album follows the device (or the page it sits in) until someone taps the switch; then the choice stays on this device.
const Look = {
  dark() { return getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#141414"; },
  init() {
    const v = ls.get("look", null);
    if (v === "dark" || v === "light") document.documentElement.dataset.look = v;
    const upd = () => this.sync();
    try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", upd); } catch {}
    try { new MutationObserver(upd).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); } catch {}
    this.sync();
  },
  sync() {
    const d = this.dark(), forced = !!document.documentElement.dataset.look;
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (!m.dataset.c) m.dataset.c = m.content; m.content = forced ? (d ? "#141414" : "#f6f6f6") : m.dataset.c; });
    const b = $("#lookBtn"); if (!b) return;
    const lbl = d ? "Sfondo chiaro" : "Sfondo scuro";
    if (b.getAttribute("aria-label") !== lbl) { b.innerHTML = d ? I.sun : I.moon; b.setAttribute("aria-label", lbl); b.title = lbl; }
  },
  toggle(from) {
    const to = this.dark() ? "light" : "dark";
    const apply = () => { document.documentElement.dataset.look = to; ls.set("look", to); this.sync(); };
    if (!document.startViewTransition || RM() || !from) { apply(); return; }
    const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    try {
      const vt = document.startViewTransition(apply);
      vt.ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 760, easing: "cubic-bezier(.65,0,.2,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
    } catch { apply(); }
  },
};

// ---------- Chapters ----------
// The album's own chapters are the years every family has. This family's own seasons and trips are chapters kept
// as data, like the ones the family adds (Store.chapters), so they never sit in the site's public code; such a
// chapter may carry its own label ("Estate 1995"), first question and cover photo.
const BASE_CHAPTERS = [
  { id:"incontro", from:"1900-01-01", to:"1985-12-31", when:"1976 — 1985", title:"Come vi siete conosciuti", starter:"Ti ricordi la prima volta che vi siete visti? Dove eravate, e cosa hai pensato?" },
  { id:"matrimonio", from:"1986-01-01", to:"1986-12-31", when:"1986", title:"Il matrimonio", starter:"Raccontami il giorno del vostro matrimonio. Cosa ricordi di quella mattina?" },
  { id:"famiglia", from:"1987-01-01", to:"1999-12-31", when:"1987 — 1999", title:"Gli anni della famiglia", starter:"Com'era la prima casa in cui avete vissuto insieme?" },
  { id:"duemila", from:"2000-01-01", to:"2030-12-31", when:"Dal 2000", title:"Gli anni Duemila", starter:"C'è un viaggio di quegli anni che ti è rimasto nel cuore? Dove eravate?" },
];
const withLen = c => ({ ...c, len: Date.parse(c.to) - Date.parse(c.from) });
let CHAPTERS = BASE_CHAPTERS.map(withLen);
const _chOf = new Map();
// "1995", "Agosto 1995", "Giugno — Agosto 1995", "1995 — 1997", "Giugno 1995 — Marzo 1996"
function rangeLabel(from, to) {
  const [y1, m1] = from.split("-").map(Number), [y2, m2] = to.split("-").map(Number), M = m => cap1(MESI[m - 1]);
  if (m1 === 1 && m2 === 12) return y1 === y2 ? `${y1}` : `${y1} — ${y2}`;
  if (y1 === y2) return m1 === m2 ? `${M(m1)} ${y1}` : `${M(m1)} — ${M(m2)} ${y1}`;
  return `${M(m1)} ${y1} — ${M(m2)} ${y2}`;
}
function setChapters(rows) {
  S.chapters = (rows || []).filter(c => c && c.id && c.title && /^\d{4}-\d\d-\d\d$/.test(c.from) && /^\d{4}-\d\d-\d\d$/.test(c.to));
  const mine = S.chapters.map(c => ({ ...c, custom: true, when: c.label || rangeLabel(c.from, c.to), starter: c.starter || `Cosa ti torna in mente di «${c.title}»? Raccontami un momento.` }));
  CHAPTERS = [...BASE_CHAPTERS, ...mine].map(withLen).sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : b.len - a.len);
  _chOf.clear();
}
// The days a date may stand for: "1992-08-00" is any day of that August, "1992-00-00" any day of 1992.
const drange = d => {
  const [y, m, g] = String(d || "").split("-");
  if (!m || m === "00") return [`${y}-01-01`, `${y}-12-31`];
  if (!g || g === "00") return [`${y}-${m}-01`, `${y}-${m}-${pad(new Date(+y, +m, 0).getDate())}`];
  return [`${y}-${m}-${g}`, `${y}-${m}-${g}`];
};
// A photo goes in the chapter its days fit in: one the family made comes before the album's own, and a shorter one
// before a longer one around it. A photo dated only roughly, across two chapters, goes in the broader one.
function chOfDate(d) {
  const key = String(d || ""); let c = _chOf.get(key); if (c) return c;
  const k = dkey(d), [lo, hi] = drange(d);
  for (const x of CHAPTERS) if (lo >= x.from && hi <= x.to && (!c || (x.custom !== c.custom ? x.custom : x.len < c.len))) c = x;
  if (!c) for (const x of CHAPTERS) if (k >= x.from && k <= x.to && (!c || x.len > c.len)) c = x;
  c = c || chById(BASE_CHAPTERS[BASE_CHAPTERS.length - 1].id);
  _chOf.set(key, c); return c;
}
const chById = id => CHAPTERS.find(c => c.id === id);
const chNum = id => pad(CHAPTERS.findIndex(c => c.id === id) + 1);

const DAILY = [
  "Qual è la prima cosa che hai notato di lui o di lei?",
  "C'è una canzone che vi riporta subito indietro nel tempo?",
  "Qual è stato il viaggio più avventuroso che avete fatto insieme?",
  "Racconta una volta in cui avete riso fino alle lacrime.",
  "Che cosa vi siete detti il giorno del matrimonio, appena soli?",
  "Qual è il regalo più bello che hai ricevuto da lui o da lei?",
  "Com'era una domenica tipica quando i figli erano piccoli?",
  "C'è un piatto che ti ricorda un momento preciso della vostra vita?",
  "Qual è il posto dove vorresti tornare insieme?",
  "Cosa hai imparato in quarant'anni di matrimonio?",
];

// ---------- People ----------
let PEOPLE = ls.get("people", null) || C.people;
const person = id => PEOPLE.find(p => p.id === id) || { id, name: id || "Qualcuno" };
let me = (C.mode === "supabase" && window.SupabaseStore && window.SupabaseStore.me) ? window.SupabaseStore.me() : ls.get("me", null);
const initial = p => esc((p.name || "?").slice(0, 1));

// ---------- Photos ----------
const _P = typeof PHOTOS !== "undefined" ? PHOTOS : [], _T = typeof THUMBS !== "undefined" ? THUMBS : {};
// What the AI saw in each photo (tags, caption) and where it was taken (from the GPS in the original file).
const _A = typeof AITAGS !== "undefined" ? AITAGS : {}, _G = typeof PLACES !== "undefined" ? PLACES : {};
const BASE = _P.map(([id, date, ar, dur]) => ({ id, date, ar, thumb: _T[id] || `f/${id}.jpg`, full: `f/${id}.jpg`, ...(dur ? { video: `v/${id}.mp4`, dur } : {}), ai: _A[id] || null, geo: _G[id] || null }));
// A video is shown by a still frame of it (thumb and full) and plays from "video".
const isVid = p => !!(p && p.video);
const durTxt = s => { s = Math.max(1, Math.round(s || 0)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const vidMark = p => isVid(p) ? `<span class="vb" aria-hidden="true">${I.play}${p.dur >= 3 ? `<span>${durTxt(p.dur)}</span>` : ""}</span>` : "";
const kindOf = p => isVid(p) ? "Video" : "Foto";
// Short clips (like the moving part of a Live Photo) play once; longer ones go round.
const loops = p => (p.dur || 0) >= 2.5;
// Removing a playing video from the page does not stop its sound everywhere: pause it first.
const stopVideos = el => el && el.querySelectorAll("video").forEach(v => { try { v.pause(); } catch {} });

// ---------- Local store (preview) ----------
const IDB = {
  db: null,
  async open() { try { this.db = await new Promise((res, rej) => { const r = indexedDB.open("album40-app", 1); r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch { this.db = null; } },
  async all() { if (!this.db) return []; try { return await new Promise((res, rej) => { const q = this.db.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); } catch { return []; } },
  async put(v) { if (!this.db) return false; try { await new Promise((res, rej) => { const t = this.db.transaction("photos", "readwrite"); t.objectStore("photos").put(v); t.oncomplete = res; t.onerror = () => rej(t.error); }); return true; } catch { return false; } },
};
// A save that did not happen must say so (this browser's storage can be full or switched off): the page then
// tells the person instead of showing a change that will be gone next time.
const keep = (k, v) => { if (!ls.set(k, v)) throw { code: "storage" }; };
const LocalStore = {
  async init() { await IDB.open(); },
  async memories() { return ls.get("memories", []); },
  async saveMemory(m) { const all = ls.get("memories", []).filter(x => x.id !== m.id); all.push(m); keep("memories", all); return m; },
  async deleteMemory(id) { keep("memories", ls.get("memories", []).filter(x => x.id !== id)); },
  async stories() { return ls.get("stories", {}); },
  async saveStory(chId, s) { const all = ls.get("stories", {}); all[chId] = s; keep("stories", all); },
  // Chapters kept as data: { id, title, from, to, by, created, label?, starter?, cover? }. The preview's own
  // (config.js) join the browser's list once, and from then on change like the ones the family adds.
  async chapters() {
    if (Array.isArray(C.chapters) && !ls.get("chaptersIn", false)) {
      const all = ls.get("chapters", []), have = new Set(all.map(c => c.id));
      keep("chapters", [...C.chapters.filter(c => !have.has(c.id)), ...all]); ls.set("chaptersIn", true);
    }
    return ls.get("chapters", []);
  },
  async saveChapter(c) { const all = ls.get("chapters", []).filter(x => x.id !== c.id); all.push(c); keep("chapters", all); },
  async deleteChapter(id) { keep("chapters", ls.get("chapters", []).filter(x => x.id !== id)); },
  async photoMeta() { return ls.get("photoMeta", {}); },
  async savePhotoMeta(id, meta) { const all = ls.get("photoMeta", {}); all[id] = { ...(all[id] || {}), ...meta }; keep("photoMeta", all); },
  async addedPhotos() { return (await IDB.all()).map(p => ({ ...p, full: URL.createObjectURL(p.blob), ...(p.videoBlob ? { video: URL.createObjectURL(p.videoBlob) } : {}) })); },
  async addPhoto(p) { const ok = await IDB.put(p); return { ...p, full: URL.createObjectURL(p.blob), ...(p.videoBlob ? { video: URL.createObjectURL(p.videoBlob) } : {}), saved: ok }; },
  // Who asked to take each photo out of the album, shared by the family: { photoId: [who] }.
  async removals() { return ls.get("removals", {}); },
  async setRemoval(who, id, on) { const all = ls.get("removals", {}), s = new Set(all[id] || []); on ? s.add(who) : s.delete(who); if (s.size) all[id] = [...s]; else delete all[id]; keep("removals", all); },
  async clearRemovals(id) { const all = ls.get("removals", {}); delete all[id]; keep("removals", all); },
  // Personal, per person. On the real site these rows belong to the signed-in person only.
  async favorites(who) { return ls.get("favs:" + who, []); },
  async setFavorite(who, id, on) { const s = new Set(ls.get("favs:" + who, [])); on ? s.add(id) : s.delete(id); keep("favs:" + who, [...s]); },
  async albums(who) { return ls.get("albums:" + who, []); },
  async saveAlbum(who, a) { const all = ls.get("albums:" + who, []).filter(x => x.id !== a.id); all.push(a); keep("albums:" + who, all); return a; },
  async deleteAlbum(who, id) { keep("albums:" + who, ls.get("albums:" + who, []).filter(x => x.id !== id)); },
};
const Store = (C.mode === "supabase" && window.SupabaseStore) ? window.SupabaseStore : LocalStore;

// ---------- AI ----------
let sampleFn = null;
const AI = {
  ready: false, imgMax: 0,
  async init() {
    if (C.mode === "supabase" && window.SupabaseAI) { this.impl = window.SupabaseAI; this.ready = true; this.imgMax = 6; return; }
    try {
      const s = window.claude && await window.claude.use("sample");
      if (s) { sampleFn = s; this.ready = true; try { const l = await s.limits(); this.imgMax = (l && l.images && l.images.maxCount) || 0; } catch {} }
    } catch {}
  },
  async text(turns, { images, quick } = {}) {
    images = images && this.imgMax ? images.filter(Boolean).slice(0, this.imgMax) : null;
    if (this.impl) return this.impl.text(turns, { images });
    if (!sampleFn) throw { code: "unavailable" };
    const opts = { cache: false, modelTier: quick ? "quick" : "default" };
    if (images && images.length) opts.images = images;
    const r = await sampleFn(turns, opts);
    return r.text.trim();
  },
  async json(prompt, opts) {
    const t = await this.text([{ role: "user", content: prompt + "\n\nRispondi solo con JSON valido, senza testo prima o dopo." }], opts);
    const m = t.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : t);
  },
};
async function photoBlob(p) {
  try { if (p.blob) return p.blob; const r = await fetch(p.full); return await r.blob(); } catch { return null; }
}
// A smaller copy for the AI to look at: quicker to send, and plenty to see what is in the photo.
async function aiBlob(p) {
  try { const b = await photoBlob(p); if (!b) return null; return await resizeTo(await loadBitmap(b), 1024, .8); } catch { return null; }
}

// ---------- Speech (read aloud) ----------
// Two kinds of voices: Google's natural ones, on the real site once they are set up (the "voce" function makes each
// sentence once and keeps it), and the ones this device has. The natural ones come first; if they cannot speak (no
// connection, or the free allowance of the month is used up) the device's voice carries on from the same sentence.
const SILENT = (() => { let u = null; return () => {
  if (u) return u;
  const n = 800, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
  b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
  return (u = URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
}; })();
const Voice = {
  btn: null, run: 0, done: null, active: false,
  // Google's voices offered in the album: [name, how it sounds, who]. Known after signing in; null until then or when not set up.
  GOOGLE: [["Sulafat", "calda", "Donna"], ["Vindemiatrix", "gentile", "Donna"], ["Achernar", "morbida", "Donna"], ["Algieba", "pacata", "Uomo"], ["Achird", "amichevole", "Uomo"], ["Iapetus", "chiara", "Uomo"]],
  cloud: null, spent: false, checked: false, why: "", urls: new Map(), audio: null, unlocking: null,
  // Asked once after signing in: are the natural voices set up, and is some of this month's free allowance left?
  async check() {
    if (this.checked || C.mode !== "supabase" || !window.SupabaseVoice) return;
    this.checked = true;
    try { const s = await window.SupabaseVoice.status(); const vs = (s.voices || []).filter(v => this.GOOGLE.some(g => g[0] === v)); this.cloud = vs.length ? vs : null; this.spent = s.left != null && s.left < 300; this.why = ""; }
    catch (e) { this.cloud = null; this.why = (e && e.code) || "voice_failed"; }
  },
  // The voices that sound most like a person come first: Apple's premium and enhanced ones, Microsoft's natural
  // ones, Google's. The one chosen under "Voce e musica" wins on this device.
  rank(v) { const s = `${v.name} ${v.voiceURI}`.toLowerCase(); return /premium/.test(s) ? 4 : /enhanced|avanzat|migliorat|natural|neural/.test(s) ? 3 : /google|microsoft/.test(s) ? 2 : /alice|federica|emma/.test(s) ? 1 : 0; },
  // Apple's playful voices (Eddy, Flo, Nonna, Nonno, Reed, Rocko, Sandy, Shelley) sound broken reading memories: left out.
  odd: /\b(eddy|flo|nonna|nonno|grandma|grandpa|reed|rocko|sandy|shelley)\b/i,
  list() { try { const all = speechSynthesis.getVoices().filter(v => /^it/i.test(v.lang)), ok = all.filter(v => !this.odd.test(v.name)); return (ok.length ? ok : all).sort((a, b) => this.rank(b) - this.rank(a) || a.name.localeCompare(b.name)); } catch { return []; } },
  pick() { const want = ls.get("voice", ""), vs = this.list(); return (want && vs.find(v => v.voiceURI === want)) || vs[0] || null; },
  // The natural voice that reads ("g:Sulafat" in the settings), or null when a device voice was chosen or none is available.
  google() {
    if (!this.cloud || this.spent) return null;
    const want = ls.get("voice", "");
    if (/^g:/.test(want)) return this.cloud.includes(want.slice(2)) ? want.slice(2) : this.cloud[0];
    return want && this.list().some(v => v.voiceURI === want) ? null : this.cloud[0];
  },
  rate() { return ls.get("rate", .92); },
  ok() { if (this.google() || "speechSynthesis" in window) return true; toast("Questo dispositivo non può leggere ad alta voce"); return false; },
  el() { if (!this.audio) { this.audio = new Audio(); this.audio.preload = "auto"; } return this.audio; },
  // iPhones read aloud only after a tap: a silent word said during the tap, and a silent sound played on the player
  // the natural voices use, let later readings start on their own.
  unlock() {
    Music.prime();
    try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; u.lang = "it-IT"; speechSynthesis.speak(u); } catch {}
    this.prime();
  },
  prime() { if (!this.google() || this.unlocking) return; const a = this.el(); a.src = SILENT(); this.unlocking = a.play().catch(() => { this.unlocking = null; }); },
  // A link to the recording of one sentence in a natural voice: asked once, then kept for the visit.
  fetch(p, g) {
    if (p == null) return null;
    const text = String(typeof p === "string" ? p : p.t).replace(/\s+/g, " ").trim(), rate = this.rate(), k = `${g}|${rate}|${text}`;
    if (!text) return Promise.reject({ code: "empty" });
    // A refusal for the month's allowance is kept, so the sentences after it are not asked for again.
    if (!this.urls.has(k)) { const pr = window.SupabaseVoice.url(text, g, rate); this.urls.set(k, pr); pr.catch(e => { if (!e || e.code !== "limit") this.urls.delete(k); }); }
    return this.urls.get(k);
  },
  // Reads one sentence at a time: some browsers stop long readings halfway, and the page can follow along.
  play(parts, { btn, onPart, onEnd, onStop } = {}) {
    if (!this.ok() || !parts.length) return false;
    Music.prime();
    let g = this.google();
    const busy = !g && "speechSynthesis" in window && (speechSynthesis.speaking || speechSynthesis.pending);
    this.stop();
    if (g) this.prime();
    this.active = true; Music.sync();
    const run = this.run; let i = 0;
    this.btn = btn || null; this.done = onStop || null;
    if (btn) { btn.classList.add("on"); btn.dataset.label = btn.innerHTML; btn.innerHTML = I.stop + "Ferma"; }
    const finish = () => { const d = this.done; this.done = null; this.active = false; Music.sync(); this.reset(); d && d(); onEnd && onEnd(); };
    // The natural voice could not go on: the device reads from this sentence to the end.
    const fallback = (k, e) => {
      if (run !== this.run) return;
      if (e && e.code === "limit" && !this.spent) { this.spent = true; toast("Per questo mese la voce naturale ha finito: continuo con un'altra voce", 3200); }
      g = null; i = k;
      if ("speechSynthesis" in window) next(); else finish();
    };
    const next = () => {
      if (run !== this.run) return;
      if (i >= parts.length) return finish();
      const k = i++, p = parts[k], text = typeof p === "string" ? p : p.t;
      const said = () => { if (run === this.run && onPart) onPart(p, k); };
      if (g) {
        const now = this.fetch(p, g); this.fetch(parts[k + 1], g);   // the next sentence is made while this one is heard
        now.then(async url => {
          await this.unlocking;
          if (run !== this.run) return;
          const a = this.el(); let heard = false, gone = false;
          const on = () => { if (gone || run !== this.run) return; gone = true; clearInterval(dog); next(); };
          a.onplaying = () => { if (!heard) { heard = true; said(); } };
          a.onended = on;
          a.onerror = () => { if (!gone && run === this.run) { gone = true; clearInterval(dog); fallback(k); } };
          // If the player forgets to say it has finished, carry on once it has stopped at the end.
          const dog = setInterval(() => { if (run !== this.run) return clearInterval(dog); if (a.ended || (heard && a.paused && a.duration && a.currentTime >= a.duration - .05)) on(); }, 700);
          a.src = url;
          a.play().catch(() => { if (!gone && run === this.run) { gone = true; clearInterval(dog); fallback(k); } });
        }, e => fallback(k, e));
        return;
      }
      const u = new SpeechSynthesisUtterance(text); let moved = false;
      const go = () => { if (moved || run !== this.run) return; moved = true; clearInterval(dog); next(); };
      u.lang = "it-IT"; u.rate = this.rate(); const v = this.pick(); if (v) u.voice = v;
      u.onstart = said;
      u.onend = go;
      u.onerror = e => { if (e.error !== "interrupted" && e.error !== "canceled") go(); };
      // If a browser forgets to say it has finished, carry on once it has gone quiet.
      const t0 = Date.now(), dog = setInterval(() => { if (run !== this.run) { clearInterval(dog); return; } if (Date.now() - t0 > 1500 + text.length * 60 && !speechSynthesis.speaking && !speechSynthesis.pending) go(); }, 700);
      speechSynthesis.speak(u);
    };
    busy ? setTimeout(next, 90) : next();
    return true;
  },
  speak(text, btn) {
    if (!text) return;
    if (btn && this.btn === btn) { this.stop(); return; }
    this.play(speechChunks(text), { btn });
  },
  reset() { if (this.btn && this.btn.dataset.label) { this.btn.innerHTML = this.btn.dataset.label; this.btn.classList.remove("on"); } this.btn = null; },
  stop() {
    this.run++; this.active = false; Music.sync();
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch {}
    const a = this.audio; if (a) { a.onplaying = a.onended = a.onerror = null; try { a.pause(); } catch {} }
    const d = this.done; this.done = null; this.reset(); d && d();
  },
};

// ---------- Soft music under the voice ----------
// Played here, note by note, so there is nothing to download and no rights to clear: a slow piano over warm chords
// in F major. It plays while the album reads aloud, softer while the voice speaks, and can be switched off.
const Music = {
  ctx: null, master: null, bus: null, playing: false, timer: 0, st: 0, hold: 0, t: 0, beat: 0, idx: 3, ducked: false,
  VOL: .6, DUCK: .45, BPM: 64,
  // F major pentatonic, for the melody: F4 G4 A4 C5 D5 F5 G5 A5.
  SCALE: [65, 67, 69, 72, 74, 77, 79, 81],
  // Two bars per chord: the bass note, the chord held softly, and the melody notes that sit well on it.
  PROG: [[41, [57, 60, 64, 67], [65, 69, 72, 77, 81]], [45, [57, 60, 64, 67], [69, 72, 81]], [46, [58, 62, 65, 69], [65, 69, 74, 77, 81]], [48, [55, 60, 62, 64], [67, 72, 74, 79]],
         [41, [57, 60, 64, 67], [65, 69, 72, 77, 81]], [50, [57, 60, 62, 65], [65, 69, 74, 77, 81]], [46, [58, 62, 65, 69], [65, 69, 74, 77, 81]], [48, [55, 60, 62, 64], [67, 72, 74, 79]]],
  wanted() { return ls.get("music", true); },
  set(on) { ls.set("music", !!on); if (on) { this.prime(); this.hold = Date.now() + 9000; } this.sync(); },
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch {}
    try {
      const c = this.ctx = new AC();
      const master = this.master = c.createGain(); master.gain.value = 0;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = .02; comp.release.value = .4;
      master.connect(comp); comp.connect(c.destination);
      const bus = this.bus = c.createGain(); bus.gain.value = .75; bus.connect(master);
      const rev = c.createConvolver(), wet = c.createGain(); rev.buffer = this.room(c, 3.4); wet.gain.value = .5;
      bus.connect(rev); rev.connect(wet); wet.connect(master);
      return c;
    } catch { this.ctx = null; return null; }
  },
  // The sound of a room: a short noise that dies away, softer in the highs.
  room(c, sec) {
    const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0; for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * .3; d[i] = lp * Math.pow(1 - i / n, 3); } }
    return b;
  },
  // Browsers let sound start only from a tap: every reading starts with one, so the music is woken there.
  prime() { if (!this.wanted()) return; const c = this.ensure(); if (c && c.state !== "running") c.resume().catch(() => {}); },
  // Plays while the album reads aloud or tells its memories one after another; stops a moment after.
  sync() {
    clearTimeout(this.st);
    this.st = setTimeout(() => {
      const want = this.wanted() && (Voice.active || Tour.on || Date.now() < this.hold);
      if (want) this.start(); else this.stop();
      this.duck(Voice.active || !!(Focus.el && Focus.loud));
      if (this.hold > Date.now()) this.st = setTimeout(() => this.sync(), this.hold - Date.now() + 50);
    }, 400);
  },
  start() {
    const c = this.ensure(); if (!c || this.playing) return;
    if (c.state !== "running") c.resume().catch(() => {});
    this.playing = true; this.t = c.currentTime + .2; this.beat = 0;
    this.level(this.ducked ? this.DUCK : 1, 2.4);
    this.tick(); this.timer = setInterval(() => this.tick(), 250);
  },
  stop() { if (!this.playing) return; this.playing = false; clearInterval(this.timer); this.level(0, 2.2); },
  level(v, sec) { if (!this.master) return; const g = this.master.gain, now = this.ctx.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.setTargetAtTime(v * this.VOL, now, sec / 3); },
  duck(on) { if (on === this.ducked) return; this.ducked = on; if (this.playing) this.level(on ? this.DUCK : 1, on ? .6 : 2); },
  tick() { const c = this.ctx, bd = 60 / this.BPM; while (this.playing && this.t < c.currentTime + 1.5) { this.play(this.beat++, this.t, bd); this.t += bd; } },
  play(b, t, bd) {
    const [bass, pad, tones] = this.PROG[Math.floor(b / 8) % this.PROG.length], pos = b % 8, R = Math.random;
    if (pos === 0) { this.pad(pad, t, bd * 8); this.note(bass, t, .8, bd * 7, 650, [[1, 1], [2, .35], [3, .08]]); }
    // The left hand plays the chord's notes one at a time, softly, so the music keeps flowing between the melody's notes.
    if (pos % 2 && R() < .75) this.note(pad[(pos >> 1) % pad.length], t + (R() - .5) * .02, .26 + R() * .08, 2.6, 1100, [[1, 1], [2, .2]]);
    // The melody breathes: some bars are left almost empty.
    const p = (pos === 0 ? .85 : pos % 2 ? .22 : .5) * (Math.floor(b / 4) % 4 === 3 ? .35 : 1);
    if (R() > p) return;
    if (pos === 0) { const near = tones.reduce((a, m) => Math.abs(m - this.SCALE[this.idx]) < Math.abs(a - this.SCALE[this.idx]) ? m : a, tones[0]); const k = this.SCALE.indexOf(near); this.idx = k >= 0 ? k : this.idx; }
    else this.idx = clamp(this.idx + [-2, -1, -1, 1, 1, 2][Math.floor(R() * 6)], 0, this.SCALE.length - 1);
    const v = (pos === 0 ? .62 : .45) + R() * .2, at = t + (R() - .5) * .03;
    this.note(this.SCALE[this.idx], at, v, 3.4, 1700 + v * 1500, [[1, 1], [2, .26], [3, .06]]);
    if (pos % 2 === 0 && R() < .16) this.note(this.SCALE[clamp(this.idx + (R() < .5 ? -1 : 1), 0, this.SCALE.length - 1)], at + bd / 2, v * .8, 2.6, 1700 + v * 1200, [[1, 1], [2, .22]]);
  },
  // One note: a soft piano-like strike that fades, a little to the left or to the right.
  note(m, t, v, d, cut, parts) {
    const c = this.ctx, f = 440 * Math.pow(2, (m - 69) / 12), g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = cut; lp.Q.value = .4;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .2, t + .012); g.gain.setTargetAtTime(v * .06, t + .015, .32); g.gain.setTargetAtTime(0, t + d * .55, d * .18);
    parts.forEach(([h, a]) => { const o = c.createOscillator(), og = c.createGain(); o.frequency.value = f * h; og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + d + .3); });
    lp.connect(g);
    if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = (Math.random() - .5) * .5; g.connect(pn); pn.connect(this.bus); } else g.connect(this.bus);
  },
  // The chord, held softly under the melody.
  pad(ms, t, d) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 850; lp.Q.value = .3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.022, t + 2.6); g.gain.setValueAtTime(.022, t + d - .3); g.gain.linearRampToValueAtTime(0, t + d + 2.4);
    ms.forEach(m => [-4, 4].forEach(cents => { const o = c.createOscillator(); o.type = "triangle"; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12); o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + d + 2.6); }));
    lp.connect(g); g.connect(this.bus);
  },
};
// ---------- Choosing the voice, its speed and the music ----------
const voiceName = v => v.name.replace(/^Microsoft\s+/i, "").replace(/\s+-\s+.*$/, "").replace(/\s*\(.*?\)/g, "").replace(/\s+Online\b/i, "").trim() || v.name;
const voiceKind = v => { const r = Voice.rank(v); return r >= 4 ? "La più naturale" : r === 3 ? "Più naturale" : ""; };
const VOICE_WHY = { not_configured: "in Supabase manca il segreto GOOGLE_TTS_KEY", not_signed_in: "Supabase non riconosce l'accesso, esci e rientra", http_404: "in Supabase non c'è la funzione «voce»", http_401: "la funzione «voce» chiede la verifica JWT, va spenta", voice_failed: "la funzione «voce» non risponde" };
function openVoice() {
  const draw = () => {
    const vs = Voice.list(), cur = Voice.pick(), g = Voice.google(), rate = Voice.rate(), music = Music.wanted();
    // Google's natural voices first, when the real site has them; then the ones of this phone or computer.
    const nat = Voice.cloud ? Voice.GOOGLE.filter(v => Voice.cloud.includes(v[0])) : [];
    const apple = !nat.length && /Mac|iPhone|iPad/.test(navigator.userAgent) && !vs.some(v => Voice.rank(v) >= 3);
    const natBtn = ([n, how, who]) => `<button type="button" class="voice" data-voice="g:${n}" aria-pressed="${g === n}"${Voice.spent ? " disabled" : ""}><span class="vn">Voce ${how}</span><span class="mono vk">${who}</span><span class="vc">${I.check}</span></button>`;
    const devBtn = v => `<button type="button" class="voice" data-voice="${esc(v.voiceURI)}" aria-pressed="${!g && !!cur && v.voiceURI === cur.voiceURI}"><span class="vn">${esc(voiceName(v))}</span><span class="mono vk">${esc(voiceKind(v))}</span><span class="vc">${I.check}</span></button>`;
    return sheetTop("Voce e musica") + `<h1 class="h1">La <span class="serif">voce</span></h1>
      <p class="lede" style="margin:0">Scegli chi legge i ricordi: tocca una voce per sentirla.</p>
      ${nat.length ? `<p class="mono vgroup">Voci naturali</p><div class="voices">${nat.map(natBtn).join("")}</div>
        ${Voice.spent ? `<p class="hint">Per questo mese le voci naturali hanno finito: tornano il mese prossimo. Intanto legge una delle altre voci.</p>` : ""}
        ${vs.length ? `<p class="mono vgroup">Altre voci</p>` : ""}` : ""}
      ${!nat.length && C.mode === "supabase" && Voice.why ? `<p class="hint">Le voci naturali non sono attive: ${esc(VOICE_WHY[Voice.why] || `errore «${Voice.why}»`)}.</p>` : ""}
      ${vs.length ? `<div class="voices">${vs.map(devBtn).join("")}</div>`
        : nat.length ? "" : `<p class="hint">Su questo dispositivo non ci sono voci italiane: i ricordi si possono leggere, ma non ascoltare.</p>`}
      ${apple ? `<p class="hint">Su iPhone, iPad e Mac si possono scaricare voci più naturali, gratis: Impostazioni › Accessibilità › Contenuto letto › Voci › Italiano. Poi riapri l'album e sceglila qui.</p>` : ""}
      <fieldset class="period"><legend>Velocità</legend><div class="chips">${[[.8, "Più lenta"], [.92, "Normale"], [1.04, "Più veloce"]].map(([r, t]) => `<button type="button" class="chip" data-rate="${r}" aria-pressed="${Math.abs(rate - r) < .01}">${t}</button>`).join("")}</div></fieldset>
      <fieldset class="period"><legend>Musica</legend><div class="chips">${[["1", "Con la musica"], ["0", "Senza musica"]].map(([k, t]) => `<button type="button" class="chip" data-music="${k}" aria-pressed="${music === (k === "1")}">${t}</button>`).join("")}</div>
        <p class="hint" style="margin-top:12px">Un pianoforte leggero sotto la voce, mentre l'album racconta.</p></fieldset>`;
  };
  const s = sheet(draw(), { z: 60 }), redraw = () => { const y = s.el.scrollTop; s.set(draw()); s.el.scrollTop = y; };
  if (!Voice.cloud && C.mode === "supabase") { Voice.checked = false; Voice.check().then(() => { if (!s.closed) redraw(); }); }
  s.el.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || b.closest("[data-close]")) return;
    if (b.dataset.voice) { ls.set("voice", b.dataset.voice); redraw(); const v = Voice.pick(); Voice.play([`Ciao, sono ${!Voice.google() && v ? voiceName(v) : "la voce dell'album"}. Vi racconterò i vostri ricordi.`]); }
    else if (b.dataset.rate) { ls.set("rate", +b.dataset.rate); redraw(); Voice.play(["Così vi leggerò i ricordi."]); }
    else if (b.dataset.music) { Music.set(b.dataset.music === "1"); redraw(); const nb = $("#narrMusic"); if (nb) nb.setAttribute("aria-pressed", Music.wanted()); }
  });
  // On some devices the voices arrive a moment after the page.
  if (!Voice.list().length && "speechSynthesis" in window) speechSynthesis.addEventListener("voiceschanged", () => { if (!s.closed) redraw(); }, { once: true });
}

// Every "Ascolta" button points at a text kept here, so one click handler serves them all.
const SAY = new Map(); let sayN = 0;
const listenBtn = (text, label = "Ascolta", cls = "btn line") => { const k = "s" + (++sayN); SAY.set(k, text); return `<button type="button" class="${cls}" data-say="${k}">${I.speaker}${label}</button>`; };

// ---------- Dictation ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function attachDictation(btn, area, onChange) {
  if (!SR) { btn.hidden = true; return; }
  let rec = null, base = "";
  btn.onclick = () => {
    if (rec) { rec.stop(); return; }
    try { rec = new SR(); } catch { btn.hidden = true; return; }
    rec.lang = "it-IT"; rec.continuous = true; rec.interimResults = true;
    base = area.value ? area.value.replace(/\s*$/, " ") : "";
    rec.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; area.value = base + t; onChange && onChange(); };
    rec.onerror = ev => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { btn.hidden = true; toast("Usa il microfono della tastiera per dettare"); } };
    rec.onend = () => { rec = null; btn.classList.remove("rec"); btn.setAttribute("aria-label", "Parla"); };
    try { rec.start(); btn.classList.add("rec"); btn.setAttribute("aria-label", "Smetti di registrare"); } catch { rec = null; btn.hidden = true; }
  };
}

// ---------- Images ----------
async function loadBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
  catch { return await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); }); }
}
async function resizeTo(bmp, max, q) {
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  return await new Promise(r => cv.toBlob(r, "image/jpeg", q));
}
const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
const isVideoFile = f => /^video\//.test(f.type) || /\.(mov|mp4|m4v)$/i.test(f.name);
const isMediaFile = f => /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name) || isVideoFile(f);
const VIDEO_MAX = 50 * 1024 * 1024;
const quanti = (n, v) => [n - v && `${n - v} foto`, v && `${v} video`].filter(Boolean).join(" e ");
// A still frame of the video for the album, and how long and how wide it is.
async function videoFrame(f) {
  const url = URL.createObjectURL(f), v = document.createElement("video");
  v.muted = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.src = url;
  try {
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = () => rej(new Error("video")); setTimeout(() => rej(new Error("tempo")), 20000); v.play().then(() => v.pause()).catch(() => {}); });
    const dur = isFinite(v.duration) ? v.duration : 0;
    await new Promise(res => { v.onseeked = res; setTimeout(res, 4000); v.currentTime = dur > 1 ? Math.min(dur * .35, dur - .1) : 0; });
    const cv = document.createElement("canvas"); cv.width = v.videoWidth; cv.height = v.videoHeight; cv.getContext("2d").drawImage(v, 0, 0);
    return { cv, dur, ar: v.videoWidth / v.videoHeight };
  } finally { v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); }
}
// When and where a video was recorded: iPhones write both as text in the file ("2026-07-12T22:25:40+0200",
// "+45.1489+010.7652+039.841/"). Videos prepared for this album also carry what the AI already saw.
async function videoInfo(f) {
  const out = { date: null, gps: null, hint: null }, W = 4 * 1024 * 1024;
  const look = async (a, b) => {
    const s = new TextDecoder("latin1").decode(new Uint8Array(await f.slice(a, b).arrayBuffer()));
    const d = s.match(/(19|20)\d\d-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d[+-]\d\d:?\d\d/), g = s.match(/([+-]\d\d\.\d{4,})([+-]\d{3}\.\d{4,})(?:[+-]\d+\.\d+)?\//), h = s.match(/\{"album40": ?1[^{}]*\}/);
    if (d && !out.date) out.date = d[0].slice(0, 10);
    if (g && !out.gps && (+g[1] || +g[2])) out.gps = { lat: +(+g[1]).toFixed(5), lon: +(+g[2]).toFixed(5) };
    if (h && !out.hint) try { out.hint = JSON.parse(h[0]); } catch {}
  };
  try { await look(Math.max(0, f.size - W), f.size); if (f.size > W) await look(0, W); } catch {}
  return out;
}
async function exifInfo(file) {
  const out = { date: null, gps: null, hint: null };
  try {
    const buf = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    if (buf.getUint16(0) !== 0xFFD8) return out;
    let o = 2;
    while (o < buf.byteLength - 4) {
      const marker = buf.getUint16(o), len = buf.getUint16(o + 2);
      if (marker === 0xFFE1 && buf.getUint32(o + 4) === 0x45786966) {
        const t = o + 10, le = buf.getUint16(t) === 0x4949;
        const u16 = p => buf.getUint16(p, le), u32 = p => buf.getUint32(p, le);
        const readStr = (p, n) => { let s = ""; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(buf.getUint8(p + i)); return s; };
        const scan = ifd => { const n = u16(t + ifd); const out = {}; for (let i = 0; i < n; i++) { const e = t + ifd + 2 + i * 12, tag = u16(e); out[tag] = e; } return out; };
        const ifd0 = scan(u32(t + 4));
        let date = null;
        if (ifd0[0x8769]) { const ex = scan(u32(ifd0[0x8769] + 8)); if (ex[0x9003]) date = readStr(t + u32(ex[0x9003] + 8), 20); }
        if (!date && ifd0[0x0132]) date = readStr(t + u32(ifd0[0x0132] + 8), 20);
        if (date && /^\d{4}:\d\d:\d\d/.test(date)) out.date = date.slice(0, 10).replace(/:/g, "-");
        // Photos prepared for this album carry what the AI already saw in the description field.
        if (ifd0[0x010E]) {
          const n = u32(ifd0[0x010E] + 4), at = n > 4 ? t + u32(ifd0[0x010E] + 8) : ifd0[0x010E] + 8;
          try { const h = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, at, n)).replace(/\0+$/, "")); if (h && h.album40) out.hint = h; } catch {}
        }
        if (ifd0[0x8825]) {
          const g = scan(u32(ifd0[0x8825] + 8));
          const rat = (e, k) => { const at = t + u32(e + 8) + k * 8; return u32(at) / (u32(at + 4) || 1); };
          const deg = e => rat(e, 0) + rat(e, 1) / 60 + rat(e, 2) / 3600;
          const ref = e => String.fromCharCode(buf.getUint8(e + 8));
          if (g[2] && g[4]) {
            let lat = deg(g[2]), lon = deg(g[4]);
            if (g[1] && ref(g[1]) === "S") lat = -lat; if (g[3] && ref(g[3]) === "W") lon = -lon;
            if (isFinite(lat) && isFinite(lon) && (lat || lon)) out.gps = { lat: +lat.toFixed(5), lon: +lon.toFixed(5) };
          }
        }
        return out;
      }
      o += 2 + len;
    }
  } catch {}
  return out;
}

// ---------- State ----------
const S = { tab: "storia", photos: [], gone: [], rm: {}, meta: {}, memories: [], stories: {}, chapters: [], filter: "tutti", q: "", view: ls.get("fotoView", "grid"), deck: 0, weaving: new Set(), favs: new Set(), albums: [], v: 0 };
const bump = () => { S.v++; };
const photoById = id => S.photos.find(p => p.id === id);
const photosIn = chId => S.photos.filter(p => chOfDate(p.date).id === chId);
// A memory belongs to the chapter of its first photo, so it follows the photo when its date is corrected or a
// chapter is added. Without a photo, the chapter it was told in (or its year).
const memChapter = m => { const p = (m.photoIds || []).map(photoById).find(Boolean); return p ? chOfDate(p.date).id : chById(m.chapter) ? m.chapter : m.year ? chOfDate(`${m.year}-00-00`).id : m.chapter; };
const memsIn = chId => S.memories.filter(m => memChapter(m) === chId);
const memsFor = pid => S.memories.filter(m => (m.photoIds || []).includes(pid));
const metaOf = p => ({ ...(p.meta || {}), ...(S.meta[p.id] || {}) });
const albumById = id => S.albums.find(a => a.id === id);
// A photo leaves the album when both partners ask for it, or when whoever added it takes it back.
// Nothing is lost: removed photos wait under "Foto tolte", where anyone can put them back.
const COUPLE = PEOPLE.filter(p => p.partner).map(p => p.id);
const votesOf = id => S.rm[id] || [];
const goneWith = (p, v) => v.length > 0 && (!!(p.by && v.includes(p.by)) || COUPLE.every(w => v.includes(w)));
const isGone = p => goneWith(p, votesOf(p.id));
const pendingRm = () => S.photos.filter(p => votesOf(p.id).length);
const nameList = ids => { const n = ids.map(w => person(w).name); return n.length > 1 ? n.slice(0, -1).join(", ") + " e " + n[n.length - 1] : n[0] || ""; };
// A list key names what the viewer steps through: "tutti", a chapter id, "fav" or "album:<id>".
function listFor(key) {
  if (!key || key === "tutti") return S.photos;
  if (key === "fav") return S.photos.filter(p => S.favs.has(p.id));
  if (key === "rm") return pendingRm();
  if (key.startsWith("album:")) { const a = albumById(key.slice(6)); return a ? a.photoIds.map(photoById).filter(Boolean) : []; }
  if (key.startsWith("r:")) { const r = racById(key.slice(2)); return r ? r.photos : []; }
  if (key.startsWith("y:")) return S.photos.filter(p => p.date.startsWith(key.slice(2)));
  return photosIn(key);
}
const fotoList = () => listFor(S.filter).filter(p => matches(p, S.q));

// ---------- Finding photos: what the AI saw, where and when, and what people told ----------
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set("di a da in con su per tra fra il lo la i gli le l un una uno e ed o al allo alla ai agli alle del dello della dei degli delle nel nella nei nelle sul sulla dove quando che foto fotografia quella quelle quello quelli quel mia mio miei mie nostra nostro nostri nostre".split(" "));
const SEASON = m => m === 12 || m <= 2 ? "inverno" : m <= 5 ? "primavera" : m <= 8 ? "estate" : "autunno";
const SYN = { mare: "spiaggia costa", spiaggia: "mare sabbia", montagna: "monti", neve: "inverno", natale: "feste", capodanno: "feste", pranzo: "tavola mangiare", cena: "tavola mangiare sera", colazione: "mattina tavola", aperitivo: "bere", ristorante: "mangiare tavola", cibo: "mangiare piatto", vino: "bere", coppia: "insieme noi due", famiglia: "tutti insieme", amici: "compagnia", viaggio: "vacanza estero", vacanza: "viaggio", giardino: "prato verde", fiori: "giardino", notte: "sera", tramonto: "sera", grattacieli: "citta", "centro storico": "citta", ritratto: "primo piano", "albero di natale": "natale" };
const tagsOf = p => { const m = metaOf(p); return [...new Set([...(m.tags || []), ...(m.aiTags || []), ...((p.ai && p.ai.t) || [])])]; };
const placeOf = p => { const m = metaOf(p); return m.place || m.aiPlace || (p.geo && p.geo.n) || ""; };
// Collections join nearby towns of one trip abroad under their country.
const groupOf = p => { const m = metaOf(p); return m.place || m.aiGroup || m.aiPlace || (p.geo && (p.geo.g || p.geo.n)) || ""; };
const captionOf = p => { const m = metaOf(p); return m.caption || m.aiCaption || (p.ai && p.ai.c) || ""; };
const HAY = new Map();
function hay(p) {
  const c = HAY.get(p.id); if (c && c.v === S.v) return c.s;
  const m = metaOf(p), d = p.date, mo = +d.slice(5, 7), t = tagsOf(p);
  const s = " " + norm([fmtDate(d), mo ? MESI[mo - 1] : "", mo ? SEASON(mo) : "", chOfDate(d).title, p.geo && p.geo.n, p.geo && p.geo.r, p.geo && p.geo.g, m.place, m.aiPlace, m.aiArea, m.aiGroup, m.people, m.caption, m.aiCaption, p.ai && p.ai.c, isVid(p) ? "video filmato" : "",
    t.join(" "), t.map(x => SYN[x] || "").join(" "), ...memsFor(p.id).map(x => [x.title, x.text, x.place, x.people, x.year, (x.tags || []).join(" ")].join(" "))].join(" ")) + " ";
  HAY.set(p.id, { v: S.v, s }); return s;
}
const terms = q => norm(q).split(" ").filter(w => w && !STOP.has(w));
function matches(p, q) {
  const ws = Array.isArray(q) ? q : terms(q); if (!ws.length) return true;
  const h = hay(p);
  return ws.every(w => h.includes(w) || (w.length > 4 && h.includes(w.slice(0, -1))));
}
const years = () => [...new Set(S.photos.map(p => +p.date.slice(0, 4)))].sort((a, b) => a - b);
const fmtMonth = d => { const m = +d.slice(5, 7); return m ? `${MESI[m - 1]} ${d.slice(0, 4)}` : d.slice(0, 4); };
const spanOf = ps => { if (!ps.length) return ""; const a = fmtMonth(ps[0].date), b = fmtMonth(ps[ps.length - 1].date); return a === b ? a : `${a} — ${b}`; };
const coverOf = ps => ps.find(p => tagsOf(p).includes("coppia")) || ps[Math.floor(ps.length / 2)];

// ---------- Collections the AI makes from what it saw: places and themes ----------
const THEMES = [
  { id: "mare", title: "Al mare", sub: "Spiagge, scogli e onde", tags: ["mare", "spiaggia"] },
  { id: "coppia", title: "Voi due", sub: "Le foto di coppia", tags: ["coppia"] },
  { id: "tavola", title: "A tavola", sub: "Pranzi, cene e brindisi", tags: ["pranzo", "cena", "colazione", "aperitivo", "brindisi", "ristorante"] },
  { id: "feste", title: "Le feste", sub: "Natale, compleanni e giorni speciali", tags: ["natale", "capodanno", "festa", "compleanno", "matrimonio", "albero di natale"] },
  { id: "casa", title: "A casa", sub: "Giardino, veranda e cucina", tags: ["casa", "giardino", "veranda", "cucina", "salotto"] },
  { id: "sera", title: "Di sera", sub: "Tramonti e luci della notte", tags: ["notte", "tramonto"] },
  { id: "natura", title: "Natura e fiori", sub: "Laghi, montagne e prati", tags: ["fiori", "natura", "parco", "montagna", "lago", "neve"] },
  { id: "animali", title: "Gli animali", sub: "Gatti, cani e altri amici", tags: ["gatto", "cane", "animali"] },
  { id: "citta", title: "In città", sub: "Strade, piazze e monumenti", tags: ["città", "centro storico", "monumento", "museo", "mercato", "grattacieli"] },
];
let _rac = null;
function raccolte() {
  if (_rac && _rac.v === S.v && _rac.n === S.photos.length) return _rac.list;
  const list = [], byPlace = new Map();
  S.photos.forEach(p => { const n = groupOf(p); if (n) { const k = norm(n); if (!byPlace.has(k)) byPlace.set(k, { n, ps: [] }); byPlace.get(k).ps.push(p); } });
  [...byPlace.values()].filter(g => g.ps.length >= 6).sort((a, b) => b.ps.length - a.ps.length)
    .forEach(g => list.push({ id: "luogo:" + norm(g.n), title: g.n, sub: spanOf(g.ps), kind: "Luogo", photos: g.ps }));
  THEMES.forEach(t => { const ps = S.photos.filter(p => tagsOf(p).some(x => t.tags.includes(x))); if (ps.length >= 4) list.push({ id: t.id, title: t.title, sub: t.sub, kind: "Tema", photos: ps }); });
  const vs = S.photos.filter(isVid);
  if (vs.length >= 2) list.push({ id: "video", title: "I video", sub: "Momenti che si muovono", kind: "Video", photos: vs });
  _rac = { v: S.v, n: S.photos.length, list };
  return list;
}
const racById = id => raccolte().find(r => r.id === id);
// Chips shared by the photo search and the Foto tab
function chipKeys(cur, withRm) {
  const nrm = withRm ? pendingRm().length : 0;
  const ks = [["tutti", "Tutte"], ["fav", "Preferite"], ...(nrm || (withRm && cur === "rm") ? [["rm", `Da decidere${nrm ? ` (${nrm})` : ""}`]] : []), ...raccolte().map(r => ["r:" + r.id, r.title]), ...years().map(y => ["y:" + y, String(y)])];
  if (cur && !ks.some(k => k[0] === cur)) { const c = chById(cur); if (c) ks.splice(1, 0, [cur, c.title]); }
  return ks;
}

let loaded = false;
async function loadAll() {
  const [added, meta, mems, stories, rm, chs] = await Promise.all([Store.addedPhotos(), Store.photoMeta(), Store.memories(), Store.stories(), Store.removals ? Store.removals().catch(() => ({})) : {}, Store.chapters ? Store.chapters().catch(() => []) : []]);
  S.meta = meta; S.memories = mems; S.stories = stories; S.rm = rm || {};
  setChapters(chs);
  const all = [...BASE, ...added];
  all.forEach(p => { const d = S.meta[p.id] && S.meta[p.id].date; if (d) p.date = d; });   // a date someone corrected
  all.sort(byDate);
  S.gone = all.filter(isGone); S.photos = all.filter(p => !isGone(p));
  keepDedication(); loaded = true; Opening.refresh(); Voice.check();
  await loadPersonal();
}
async function loadPersonal() {
  if (!me) { S.favs = new Set(); S.albums = []; return; }
  try { const [f, a] = await Promise.all([Store.favorites(me), Store.albums(me)]); S.favs = new Set(f); S.albums = a.sort((x, y) => (y.created || 0) - (x.created || 0)); }
  catch { S.favs = new Set(); S.albums = []; }
}

function toast(t, ms = 3000) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), ms); }

// ---------- Favourites ----------
async function toggleFav(id) {
  const on = !S.favs.has(id);
  on ? S.favs.add(id) : S.favs.delete(id);
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.classList.remove("pop"); if (on) { void b.offsetWidth; b.classList.add("pop"); } });
  S.dirty = true;
  try { await Store.setFavorite(me, id, on); } catch { toast("Non sono riuscito a salvare. Riprova."); }
  toast(on ? "Aggiunta ai tuoi preferiti" : "Tolta dai preferiti", 1800);
}
const heartBtn = id => { const on = S.favs.has(id); return `<button type="button" class="heart${on ? " on" : ""}" data-fav="${id}" aria-pressed="${on}" aria-label="Preferita">${I.heart}</button>`; };
// Every photo keeps its own shape: boxes take the photo's proportions, so nothing is ever cropped.
const arOf = p => Math.min(4, Math.max(.25, +(p && p.ar) || 1));
const arStyle = p => `--ar:${arOf(p)}`;
const tileHTML = (p, list) => { const n = memsFor(p.id).length + (metaOf(p).caption ? 1 : 0); return `<div class="tile" data-id="${p.id}" style="${arStyle(p)}"><button type="button" class="open" data-photo="${p.id}" data-list="${list}"><img loading="lazy" src="${p.thumb}" alt="${kindOf(p)} del ${esc(fmtDate(p.date))}"></button>${vidMark(p)}${heartBtn(p.id)}${n ? `<span class="badge">${n} ${n > 1 ? "storie" : "storia"}</span>` : ""}</div>`; };

// ---------- Sheets ----------
const Sheets = [];
let locks = 0;
const lock = d => { locks = Math.max(0, locks + d); document.body.style.overflow = locks ? "hidden" : ""; };
function sheet(html, { z, onClose } = {}) {
  const el = document.createElement("div"); el.className = "sheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  if (z) el.style.zIndex = z;
  el.innerHTML = `<div class="sheet-in">${html}</div>`;
  [...el.firstElementChild.children].forEach((c, i) => c.style.setProperty("--k", Math.min(i, 9)));
  document.body.append(el); lock(1);
  setTimeout(() => el.classList.add("ready"), 1300);
  const s = { el, z: z || 30, closed: false,
    set(h) { el.classList.add("ready"); el.firstElementChild.innerHTML = h; },
    close() {
      if (s.closed) return; s.closed = true; Voice.stop(); lock(-1); Sheets.splice(Sheets.indexOf(s), 1);
      // It slides away for a moment; its ids go at once, so a page opened next never finds the old fields.
      if (RM()) el.remove(); else { el.querySelectorAll("[id]").forEach(x => x.removeAttribute("id")); el.inert = true; el.classList.add("out"); setTimeout(() => el.remove(), 480); }
      onClose && onClose();
    } };
  el.addEventListener("click", e => { if (e.target.closest("[data-close]")) s.close(); });
  Sheets.push(s);
  return s;
}
const sheetTop = label => `<div class="sheet-top"><span class="mono">${label}</span><button type="button" class="close" data-close aria-label="Chiudi">${I.x}</button></div>`;
function askName(title, value = "") {
  return new Promise(res => {
    let done = false;
    const s = sheet(`${sheetTop(esc(title))}
      <h1 class="h1">${value ? "Nuovo nome" : "Nuovo album"}</h1>
      <div class="field"><label for="nm">Nome dell'album</label><input id="nm" value="${esc(value)}" placeholder="Per esempio: I nipoti" maxlength="60"></div>
      <button type="button" class="btn block" id="nmOk">${I.check}${value ? "Salva" : "Crea l'album"}</button>`, { z: 60, onClose: () => { if (!done) res(null); } });
    const inp = $("#nm", s.el); setTimeout(() => inp.focus(), 350);
    const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } done = true; s.close(); res(v); };
    $("#nmOk", s.el).onclick = ok; inp.onkeydown = e => { if (e.key === "Enter") ok(); };
  });
}

// ---------- Opening screen, every time the album opens ----------
// The years run from when they met to today while photos flash by, then Giorgio's dedication. A tap opens the album.
const SON = () => PEOPLE.find(p => !p.partner) || null;
const coupleNames = () => PEOPLE.filter(p => p.partner).map(p => p.name).join(" e ");
// The real names, for what the AI writes: kept with the family's data (stories, key "nomi"), never in the public code.
// details: {mamma: "…", papa: "…", others: [{name, who}]}, "who" saying how they appear in the photos.
const NAMES = () => { const st = S.stories && S.stories.nomi; return Object.assign({}, C.names || {}, (st && st.details && !Array.isArray(st.details)) ? st.details : {}); };
const realName = p => (NAMES()[p.id] || "").trim() || p.name;
const coupleReal = () => PEOPLE.filter(p => p.partner).map(realName).reduce((t, n) => t ? t + (/^[eE]/.test(n) ? " ed " : " e ") + n : n, "");
const namesAt = () => { const st = S.stories && S.stories.nomi; return (st && st.updated) || 0; };
// What the AI may call people in photos: the couple by name when it is plainly them, anyone else only when written in "Chi c'è".
function whoRule() {
  const N = NAMES(), w = PEOPLE.find(p => p.id === "mamma"), m = PEOPLE.find(p => p.id === "papa");
  const others = (Array.isArray(N.others) ? N.others : []).filter(o => o && o.name);
  const out = [];
  if (w && m && N.mamma && N.papa) out.push(`- Nella coppia la donna è ${realName(w)} e l'uomo è ${realName(m)}: quando nella foto si vede chiaramente la coppia, chiamali per nome.`);
  if (others.length) out.push(`- ${others.map(o => `${o.name} è ${o.who || "di famiglia"}`).join("; ")}: usa il nome solo se è scritto in "Chi c'è".`);
  return out.join("\n");
}
const TENS = { 30: "trenta", 40: "quaranta", 50: "cinquanta", 60: "sessanta" };
// The dedication is the start of Giorgio's letter, in his words, as he last saved it. Until the letter arrives (on the
// real site it can be read only after signing in) the start of it last seen on this device stands in; the preview's
// copy in the settings, or a few plain words, only when this device has never seen it.
// A closing with his name (on one line or two, like "Vostro figlio, / Giorgio") is the signature; otherwise his name signs it.
function letterParts(all, son) {
  let k = all.length;
  if (son && k > 1 && all[k - 1].length <= 48 && all[k - 1].toLowerCase().includes(son.name.toLowerCase())) { k--; if (k > 1 && all[k - 1].length <= 28 && /,$/.test(all[k - 1])) k--; }
  return { paras: all.slice(0, k), sign: k < all.length ? all.slice(k) : son ? [son.name] : [] };
}
// The opening shows the whole letter, as Giorgio last saved it.
function dedication() {
  const son = SON(), st = S.stories.lettera, since = C.married + 40 - C.met;
  const src = st ? st.story : ls.get("dedica", "") || (C.letter && C.letter.text);
  const all = String(src || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
  if (!all.length) return { head: ["Quarant'anni di matrimonio,", `${TENS[since] || since} da quando vi siete conosciuti.`], paras: ["Questo album è il mio regalo per voi."], sig: son ? [son.name] : [], short: true };
  const { paras: body, sign } = letterParts(all, son), ss = sentences(body[0]), first = ss[0] || body[0];
  // The first sentence is the headline: its last phrase, after the last comma, in italics.
  const cut = first.lastIndexOf(", "), head = cut > 20 && first.length - cut > 12 ? [first.slice(0, cut + 1), first.slice(cut + 2)] : [first];
  return { head, paras: [ss.slice(1).join(" "), ...body.slice(1)].filter(Boolean), sig: sign, short: first.length < 70 };
}
const Opening = {
  el: null, t: [], shown: null, waiting: false, skipped: false, more: () => {},
  show() {
    const still = RM();
    this.shown = null; this.waiting = false; this.skipped = false;
    const el = this.el = document.createElement("div");
    el.className = "loader"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Benvenuti");
    el.innerHTML = `<img class="flash" alt="" aria-hidden="true"><div class="yr" aria-hidden="true">${C.met}</div>
      <div class="ded" tabindex="-1"></div>
      <button type="button" class="enter mono">Entra nell'album</button>`;
    // The page underneath stays still: a wheel or a key on a letter that fits must not scroll the album behind it.
    document.body.append(el); lock(1);
    // The letter stays until "Entra nell'album": it is long enough to scroll, and a stray tap should not close it.
    // A tap while the years run goes straight to it.
    el.addEventListener("click", e => { if (e.target.closest(".enter")) this.close(); else if (!el.classList.contains("text")) this.skip(); });
    // While more of the letter waits below, its last lines fade into the page.
    const ded = $(".ded", el);
    this.more = () => el.classList.toggle("more", ded.scrollHeight - ded.clientHeight - ded.scrollTop > 8);
    ded.addEventListener("scroll", this.more, { passive: true }); addEventListener("resize", this.more);
    if (still) { this.words(); return; }
    const yr = $(".yr", el), fl = $(".flash", el), t0 = performance.now(), dur = 2200;
    let k = 0, last = 0, pool = [];
    const tick = now => {
      if (this.el !== el || this.skipped) return;
      // On the real site the photos arrive a moment later: they join the flashes as soon as they are there.
      if (!pool.length) pool = shuffle(BASE.length ? BASE.filter(p => !ls.get("removals", {})[p.id]) : S.photos).slice(0, 16);
      const x = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - x, 3);
      yr.textContent = Math.round(C.met + (THIS_YEAR - C.met) * e);
      if (now - last > 140 && k < pool.length && x < .96) { last = now; fl.src = pool[k++].thumb; fl.style.left = (8 + Math.random() * 60) + "%"; fl.style.top = (10 + Math.random() * 50) + "%"; fl.style.transform = `rotate(${(Math.random() * 10 - 5).toFixed(1)}deg)`; }
      if (x < 1) requestAnimationFrame(tick);
      else { fl.style.opacity = 0; this.t.push(setTimeout(() => this.words(), 260)); }
    };
    requestAnimationFrame(tick);
  },
  skip() { if (this.skipped || !this.el) return; this.skipped = true; $(".flash", this.el).style.opacity = 0; this.words(); },
  // The words are written only now, when the years have run: by then the letter has usually arrived. If this device
  // has never seen it they wait a moment for it, and if a newer one arrives while they are on screen they change to it.
  words(now) {
    const el = this.el; if (!el) return;
    if (!loaded && !now && !ls.get("dedica", "")) { this.waiting = true; this.t.push(setTimeout(() => this.words(true), 1500)); return; }
    this.waiting = false;
    const d = dedication(), key = JSON.stringify(d); if (key === this.shown) return;
    this.shown = key; let n = 0;
    const ln = (t, cls = "") => `<span class="ln ${cls}"><span style="--d:${n++}">${esc(t)}</span></span>`;
    const ded = $(".ded", el), first = !el.classList.contains("text");
    ded.innerHTML = `<div class="ded-in">${ln(`Per ${coupleNames()}`, "mono k")}
      <p class="big${d.short ? " short" : ""}">${d.head.map(t => ln(t)).join("")}</p>
      ${d.paras.length ? `<div class="txt">${d.paras.map(t => `<p>${ln(t)}</p>`).join("")}</div>` : ""}
      ${d.sig.length ? `<p class="sig">${d.sig.map(t => ln(t)).join("")}</p>` : ""}</div>`;
    el.classList.add("text"); this.more();
    if (first) { ded.scrollTop = 0; ded.focus({ preventScroll: true }); }
  },
  // The family's data has just arrived: the words show the letter as it is now.
  refresh() { if (this.el && (this.waiting || this.shown)) this.words(true); },
  close() {
    const el = this.el; if (!el) return;
    this.el = null; this.t.forEach(clearTimeout); this.t = []; removeEventListener("resize", this.more); lock(-1);
    el.classList.add("done"); setTimeout(() => Band.intro(), RM() ? 0 : 300);
    setTimeout(() => el.remove(), 1250);
  },
};

// ---------- Moments: what the home shows, a few photos with the words that go with them ----------
// Memories told about the same photos make one moment. Photos nobody has told yet are grouped by day
// and place, and show what the AI saw in them until someone tells the real memory.
let _mo = null;
function moments() {
  if (_mo && _mo.v === S.v && _mo.n === S.photos.length && _mo.m === S.memories.length) return _mo.list;
  const groups = [];
  [...S.memories].filter(m => m.text).sort((a, b) => (a.created || 0) - (b.created || 0)).forEach(m => {
    const ids = (m.photoIds || []).filter(id => photoById(id)); if (!ids.length) return;
    const hit = groups.filter(g => ids.some(id => g.ids.has(id)));
    const g = hit[0] || { ids: new Set(), mems: [] };
    if (!hit.length) groups.push(g);
    hit.slice(1).forEach(x => { x.ids.forEach(id => g.ids.add(id)); g.mems.push(...x.mems); groups.splice(groups.indexOf(x), 1); });
    ids.forEach(id => g.ids.add(id)); g.mems.push(m);
  });
  const list = [], used = new Set();
  groups.forEach(g => {
    g.mems.sort((a, b) => (a.created || 0) - (b.created || 0));
    const photos = [...g.ids].map(photoById).sort(byDate), first = g.mems[0].photoIds.find(id => g.ids.has(id));
    photos.forEach(p => used.add(p.id));
    list.push({ key: "m:" + g.mems[0].id, told: true, photos, cover: photoById(first) || photos[0], mems: g.mems });
  });
  let cur = null;
  S.photos.forEach(p => {
    if (used.has(p.id)) return;
    const t = Date.parse(dkey(p.date)), g = norm(groupOf(p));
    if (cur && t - cur.t <= 1.5 * 864e5 && (!g || !cur.g || g === cur.g) && cur.photos.length < 40) { cur.photos.push(p); cur.t = t; cur.g = cur.g || g; }
    else { cur = { key: "e:" + p.id, told: false, photos: [p], t, g }; list.push(cur); }
  });
  list.forEach(mo => { if (!mo.cover) mo.cover = coverOf(mo.photos); });
  _mo = { v: S.v, n: S.photos.length, m: S.memories.length, list };
  return list;
}
const storyKey = mo => "f:" + mo.mems.map(m => m.id).sort().join("+");
const whenOf = ps => { const a = ps[0].date, b = ps[ps.length - 1].date; return a === b ? fmtDate(a) : fmtMonth(a) === fmtMonth(b) ? fmtMonth(a) : spanOf(ps); };
// The words of a moment: what each person remembers, their memories woven into one, or what the AI saw.
function wordsOf(mo) {
  const place = placeOf(mo.cover), when = whenOf(mo.photos);
  if (mo.told) {
    const m0 = mo.mems[0], st = S.stories[storyKey(mo)], by = [...new Set(mo.mems.map(m => m.who))];
    const base = { told: true, title: m0.title || "Un ricordo", when, place: m0.place || place, by, quote: m0.quote || firstSentence(m0.text) };
    if (mo.mems.length > 1 && st && st.story) return { ...base, woven: true, blocks: [{ text: st.story }] };
    return { ...base, blocks: mo.mems.map(m => ({ who: m.who, text: m.text, id: m.id })) };
  }
  // Nobody has told these photos yet: the AI's account of them, photo by photo, or their captions joined up.
  const nar = narrationOf(mo), lines = nar ? nar.lines : seenLines(mo), lead = captionOf(mo.cover) || mo.photos.map(captionOf).find(Boolean) || "";
  return { told: false, ai: !!nar, title: (nar && nar.title) || place || chOfDate(mo.cover.date).title, when, place, by: [], quote: (nar && nar.title) || lead, blocks: lines.length ? [{ lines }] : [] };
}

// ---------- What the AI tells about photos nobody has told yet ----------
// A few sentences that follow the photos in order, each one read while its photo is in the frame. Kept with the
// family's data (stories, key "n:" + the moment), so each moment is written only once, and again if photos join it.
const narrKey = mo => "n:" + mo.key;
const NARR = new Map();
function narrationOf(mo) {
  const st = S.stories[narrKey(mo)], d = st && st.details;
  if (!d || !Array.isArray(d.lines)) return null;
  const lines = d.lines.filter(l => l && l.t);
  return lines.length ? { title: d.title || "", lines, fresh: st.count === mo.photos.length && (st.updated || 0) >= namesAt() } : null;
}
// A caption that goes on after a comma: "Sorrisi in terrazza" becomes "sorrisi in terrazza", "Venezia dal ponte" stays.
const lower1 = (s, place) => { const w = norm(s.split(/\s/)[0]); return w && norm(place).split(" ").includes(w) ? s : s[0].toLowerCase() + s.slice(1); };
// Without the AI: each different caption once, in the order of the photos, joined like a short story.
function seenLines(mo) {
  const out = [], used = new Set(); let prev = null;
  for (const p of mo.photos) {
    const c = captionOf(p).trim(), k = norm(c); if (!c || used.has(k)) continue;
    used.add(k);
    if (!out.length) out.push({ t: cap1(c) + ".", p: p.id });
    else {
      const days = /-00/.test(prev.date + p.date) ? 0 : Math.round((Date.parse(p.date) - Date.parse(prev.date)) / 864e5);
      const link = days === 1 ? "Il giorno dopo" : days > 1 && days < 7 ? "Qualche giorno dopo" : days >= 7 ? "Più avanti" : ["Poi", "Più tardi", "E ancora"][(out.length - 1) % 3];
      out.push({ t: `${link}, ${lower1(c, placeOf(p))}.`, p: p.id });
    }
    prev = p; if (out.length >= 4) break;
  }
  return out;
}
// Asks the AI once per moment (several callers share the same request) and keeps the answer.
function narrate(mo) {
  if (!mo || mo.told || !AI.ready) return Promise.resolve(null);
  const key = narrKey(mo), have = narrationOf(mo);
  if (have && have.fresh) return Promise.resolve(have);
  if (NARR.has(key)) return NARR.get(key);
  const job = (async () => {
    const ps = pickEven(mo.photos, 16), n = ps.length, k = Math.min(AI.imgMax || 0, 6, n);
    const look = k ? pickEven(ps.map((_, i) => i), k) : [], blobs = await Promise.all(look.map(i => aiBlob(ps[i])));
    const seen = look.filter((_, j) => blobs[j]);
    const rows = ps.map((p, i) => { const m = metaOf(p); return `${i + 1}. ${fmtDate(p.date)}${placeOf(p) ? " · " + placeOf(p) : ""}${captionOf(p) ? ` · «${captionOf(p)}»` : ""}${tagsOf(p).length ? " · " + tagsOf(p).slice(0, 6).join(", ") : ""}${m.people ? ` · Chi c'è: ${m.people}` : ""}${isVid(p) ? ` · video di ${Math.max(1, Math.round(p.dur || 0))} secondi` : ""}`; });
    const [lo, hi] = n === 1 ? [1, 2] : n <= 3 ? [2, 3] : n <= 8 ? [3, 5] : [4, 6];
    const out = await AI.json(`Stai raccontando a voce un momento dell'album di famiglia di ${coupleReal()} (si conoscono dal ${C.met}, sposati nel ${C.married}): ${whenOf(mo.photos)}${placeOf(mo.cover) ? ", " + placeOf(mo.cover) : ""}. Nessuno della famiglia l'ha ancora raccontato: lo racconti tu, da quello che si vede.
Le foto, in ordine (data · luogo · didascalia · parole chiave):
${rows.join("\n")}
${seen.length ? `Le immagini allegate sono, nell'ordine, le foto ${seen.map(i => i + 1).join(", ")}.` : ""}

Scrivi il racconto che una voce leggerà mentre le foto scorrono: da ${lo} a ${hi} frasi, ognuna legata alla foto che si vede mentre viene letta, seguendo l'ordine delle foto.
- Descrivi con precisione e calore quello che si vede: il posto, la luce, i colori, cosa si sta facendo, cosa c'è sulla tavola o intorno.
- Fai scorrere il racconto come una piccola storia, con passaggi naturali da una foto all'altra. Non contare le foto e non usare formule come "e altre foto di quel periodo".
${whoRule() ? whoRule() + "\n" : ""}- Per tutti gli altri usa solo i nomi scritti in "Chi c'è"; altrimenti non dare nomi e non provare a riconoscere chi è dal viso: "la coppia", "la famiglia", "gli amici", "una bambina" vanno bene quando si vede.
- Non inventare fatti, luoghi o date che non si vedono e non sono scritti qui.
- Italiano semplice ed elegante, al passato; frasi brevi, al massimo 28 parole.
Dai anche al momento un titolo breve e caldo, da 2 a 5 parole, senza date.
JSON: {"title": "...", "lines": [{"text": "...", "photo": 1}]}`, { images: seen.map(i => blobs[look.indexOf(i)]) });
    const L = (Array.isArray(out && out.lines) ? out.lines : []).map(l => ({ t: String((l && l.text) || "").replace(/\s+/g, " ").trim(), i: Math.round(+(l && l.photo)) || 1 })).filter(l => l.t).slice(0, hi + 1);
    if (!L.length) return null;
    const det = { title: String((out && out.title) || "").replace(/\s+/g, " ").replace(/["«».]/g, "").trim().slice(0, 48),
      lines: L.map(l => ({ t: /[.!?…»"]$/.test(l.t) ? l.t : l.t + ".", p: ps[clamp(l.i, 1, n) - 1].id })) };
    const st = { story: det.lines.map(l => l.t).join(" "), details: det, count: mo.photos.length, updated: Date.now() };
    S.stories[key] = st;
    Store.saveStory(key, st).catch(() => {});
    return narrationOf(mo);
  })().catch(e => { if (e && e.code === "not_granted") AI.ready = false; return null; }).finally(() => NARR.delete(key));
  NARR.set(key, job);
  return job;
}
// The same words as sentences on the page and as what the voice says, so the page can follow the voice.
function wordsView(w) {
  const parts = [{ t: w.told ? `${w.title}.` : `${w.title}, ${w.when}.` }];
  if (w.told && w.blocks.length === 1) parts.push({ t: `${nameList(w.by)} ${w.by.length > 1 ? "ricordano" : "ricorda"}.` });
  let k = 0;
  const html = w.blocks.map(b => {
    const own = w.blocks.length > 1 && b.who;
    if (own) parts.push({ t: `${person(b.who).name} ricorda.` });
    const chunks = b.lines ? b.lines.flatMap(l => speechChunks(l.t).map(t => ({ t, p: l.p }))) : speechChunks(b.text).map(t => ({ t }));
    const ss = chunks.map(c => { parts.push({ t: c.t, s: k, p: c.p }); return `<span class="s" data-s="${k++}">${esc(c.t)}</span>`; }).join(" ");
    return `<div class="fz-b">${own ? `<button type="button" class="fz-who mono" data-fzmem="${b.id}">${esc(person(b.who).name)} ricorda ${I.arrow}</button>` : ""}<p>${ss}</p></div>`;
  }).join("");
  return { html, parts };
}

// The home's band: one photo for each moment. Memories told come first, then the rest, in an order
// that stays the same until someone taps "Mescola". A photo from this day in an earlier year leads.
const M = { seed: (Math.random() * 1e9) | 0, first: null, otd: null };
function bandMoments() {
  const all = moments(); if (!all.length) return [];
  const r = rng(M.seed), told = shuffleWith(all.filter(m => m.told), r), rest = shuffleWith(all.filter(m => !m.told), r);
  let list = [...told, ...rest].slice(0, Math.max(28, told.length));
  const d = new Date(), md = `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, otd = S.photos.filter(p => p.date.slice(5) === md && +p.date.slice(0, 4) < THIS_YEAR);
  M.otd = null;
  if (otd.length) { const p = otd[Math.floor(r() * otd.length)], mo = all.find(m => m.photos.includes(p)); if (mo) { M.otd = { key: mo.key, years: THIS_YEAR - +p.date.slice(0, 4) }; list = [mo, ...list.filter(m => m !== mo)]; } }
  const first = M.first && all.find(m => m.key === M.first);
  if (first) list = [first, ...list.filter(m => m !== first)];
  return list;
}
function bandItem(mo, i, dup) {
  const w = wordsOf(mo), p = mo.cover;
  const kick = M.otd && M.otd.key === mo.key ? `Accadde oggi · ${M.otd.years} ${M.otd.years > 1 ? "anni" : "anno"} fa` : `Nº ${pad(i + 1)} · ${p.date.slice(0, 4)}${mo.told ? " · " + nameList(w.by) : ""}`;
  return `<button type="button" class="bi${mo.told ? " told" : ""}" data-mo="${esc(mo.key)}" style="--ar:${arOf(p)};--i:${Math.min(i, 9)}"${dup ? ' tabindex="-1" aria-hidden="true"' : ` aria-label="${esc(`${w.title}, ${w.when}. Tocca per guardarla da vicino`)}"`}>
    <span class="bi-ph"><img src="${p.thumb}" data-full="${p.full}" alt="" draggable="false">${vidMark(p)}</span>
    <span class="bi-k mono">${esc(kick)}</span><span class="bi-t">${mo.told ? `<q>${esc(w.quote)}</q>` : esc(cap1(w.quote) || w.title)}</span></button>`;
}

// ---------- The band moves by itself ----------
// It slows down under the pointer, follows a drag or a swipe, and stops while a photo is open.
const rectOf = el => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
const Band = {
  el: null, track: null, list: [], x: 0, px: 0, w: 0, v: 0, spd: 0, sk: 0, raf: 0, last: 0, drag: null, hover: false, hold: false, vis: true, prog: null, eat: false, io: null, imgIO: null, wantIntro: true,
  speed() { return innerWidth >= 900 ? .034 : .026; },   // pixels per millisecond
  mount() {
    this.unmount();
    const el = $("#band"); if (!el) return;
    this.el = el; this.track = $("#bandTrack", el);
    if (RM()) { el.classList.add("still"); this.upgrade(true); return; }
    this.measure();
    this.paint();
    el.addEventListener("pointerdown", e => this.down(e));
    el.addEventListener("pointermove", e => this.move(e));
    el.addEventListener("pointerup", e => this.up(e));
    el.addEventListener("pointercancel", e => this.up(e, true));
    el.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") { this.hover = true; this.wake(); } });
    el.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { this.hover = false; this.wake(); } });
    el.addEventListener("wheel", e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) { e.preventDefault(); this.x -= e.deltaX; this.v = 0; this.wake(); } }, { passive: false });
    el.addEventListener("click", e => { if (this.eat) { e.preventDefault(); e.stopPropagation(); this.eat = false; } }, true);
    el.addEventListener("dragstart", e => e.preventDefault());
    if ("IntersectionObserver" in window) { this.io = new IntersectionObserver(es => { this.vis = es[es.length - 1].isIntersecting; this.wake(); }); this.io.observe(el); }
    this.upgrade();
    if (this.wantIntro && !Opening.el) this.intro();
    this.wake();
  },
  unmount() { cancelAnimationFrame(this.raf); this.raf = 0; if (this.io) this.io.disconnect(); if (this.imgIO) this.imgIO.disconnect(); this.io = this.imgIO = this.el = this.track = this.drag = this.prog = null; this.hover = false; },
  // One copy's width, and enough copies to fill the widest screen.
  measure() {
    const tr = this.track, n = +tr.dataset.n, items = tr.querySelectorAll(".bi");
    this.w = items[n] ? items[n].offsetLeft - items[0].offsetLeft : 0;
    let copies = items.length / n;
    while (this.w > 0 && this.w * (copies - 1) < innerWidth + 200) { [...items].slice(0, n).forEach(it => { const c = it.cloneNode(true); c.tabIndex = -1; c.setAttribute("aria-hidden", "true"); c.removeAttribute("aria-label"); tr.append(c); }); copies++; }
    if (this.w) { this.x = this.x % this.w; if (this.x > 0) this.x -= this.w; }
  },
  // Sharp photos only for what is on screen or about to be.
  upgrade(all) {
    const load = img => { const f = img.dataset.full; if (!f) return; img.removeAttribute("data-full"); const im = new Image(); im.onload = () => { img.src = f; }; im.src = f; };
    const imgs = this.track.querySelectorAll("img[data-full]");
    if (all || !("IntersectionObserver" in window)) { imgs.forEach(load); return; }
    this.imgIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { load(e.target); this.imgIO.unobserve(e.target); } }), { rootMargin: "0px 60% 0px 60%" });
    imgs.forEach(i => this.imgIO.observe(i));
  },
  intro() {
    const el = this.el; if (!el) return;
    this.wantIntro = false; if (RM()) return;
    el.classList.remove("intro"); void el.offsetWidth; el.classList.add("intro");
    clearTimeout(this.introT); this.introT = setTimeout(() => el.classList.remove("intro"), 2400);
  },
  alive() { return !!this.el && this.vis && !document.hidden && S.tab === "storia"; },
  wake() { if (!this.raf && this.alive()) { this.last = 0; this.raf = requestAnimationFrame(t => this.tick(t)); } },
  tick(now) {
    this.raf = 0; if (!this.alive()) return;
    const dt = this.last ? Math.min(50, now - this.last) : 16; this.last = now;
    const stopped = this.hold || !!Focus.el;
    if (this.prog) {
      const q = Math.min(1, (now - this.prog.t0) / this.prog.dur), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      this.x = this.prog.x0 + this.prog.d * e; this.spd = 0;
      if (q >= 1) { const cb = this.prog.cb; this.prog = null; if (cb) setTimeout(cb, 0); }
    } else if (!this.drag) {
      const want = stopped ? 0 : this.speed() * (this.hover ? .16 : 1);
      this.spd += (want - this.spd) * Math.min(1, dt / 500);
      this.x -= this.spd * dt;
      if (Math.abs(this.v) > .003) { this.x += this.v * dt; this.v *= Math.pow(.95, dt / 16.7); } else this.v = 0;
    }
    const vel = (this.x - this.px) / dt;
    if (this.w > 0) { while (this.x <= -this.w) { this.x += this.w; if (this.prog) this.prog.x0 += this.w; } while (this.x > 0) { this.x -= this.w; if (this.prog) this.prog.x0 -= this.w; } }
    this.px = this.x;
    // A quick drag leans the photos a little, like paper moving through the air.
    this.sk += (clamp(vel * 2.4, -5, 5) - this.sk) * Math.min(1, dt / 110);
    this.paint();
    if (this.drag || this.prog || Math.abs(this.v) > .003 || Math.abs(this.sk) > .01 || !stopped || this.spd > .0004) this.raf = requestAnimationFrame(t => this.tick(t));
  },
  paint() { if (!this.track) return; this.track.style.transform = `translate3d(${this.x.toFixed(2)}px,0,0)`; this.track.style.setProperty("--sk", this.sk.toFixed(2) + "deg"); },
  down(e) {
    if (e.button > 0 || this.prog) return;
    this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, bx: this.x, on: false, pts: [[performance.now(), e.clientX]] };
  },
  move(e) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.on) {
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) { d.on = true; d.x0 = e.clientX; d.bx = this.x; this.el.classList.add("grab"); try { this.el.setPointerCapture(e.pointerId); } catch {} this.wake(); }
      else if (Math.abs(dy) > 10) { this.drag = null; return; }
      else return;
    }
    this.x = d.bx + (e.clientX - d.x0); this.v = 0;
    d.pts.push([performance.now(), e.clientX]); if (d.pts.length > 6) d.pts.shift();
  },
  up(e, cancel) {
    const d = this.drag; if (!d || e.pointerId !== d.id) return;
    this.drag = null; if (this.el) this.el.classList.remove("grab");
    if (!d.on) return;
    if (!cancel) { this.eat = true; setTimeout(() => { this.eat = false; }, 350); }
    const a = d.pts[0], b = d.pts[d.pts.length - 1], dt = b[0] - a[0];
    this.v = dt > 0 && performance.now() - b[0] < 100 ? clamp((b[1] - a[1]) / dt, -3, 3) : 0;
    this.wake();
  },
  // The copy of a moment's photo closest to the middle of the screen.
  nearest(key) {
    if (!this.track) return null;
    let best = null, bd = 1e9; const cx = innerWidth / 2;
    this.track.querySelectorAll(`.bi[data-mo="${CSS.escape(key)}"]`).forEach(b => { const r = b.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - cx); if (dd < bd) { bd = dd; best = b; } });
    return best;
  },
  middleKey() {
    if (!this.track) return null;
    let best = null, bd = 1e9; const cx = innerWidth / 2;
    this.track.querySelectorAll(".bi").forEach(b => { const r = b.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - cx); if (dd < bd) { bd = dd; best = b; } });
    return best && best.dataset.mo;
  },
  shuffle() {
    const el = this.el; if (!el) return;
    el.classList.add("out");
    setTimeout(() => {
      if (!el.isConnected) return;
      const box = document.createElement("div"); box.innerHTML = bandHTML(this.list = bandMoments());
      el.replaceWith(box.firstElementChild); this.x = 0; this.wantIntro = true; this.mount();
    }, RM() ? 0 : 420);
  },
  // Glide a photo to the middle of the screen, then carry on.
  centerOn(el, cb) {
    if (!el || !this.el || RM() || !this.alive()) { cb && cb(); return; }
    const r = el.getBoundingClientRect(), d = innerWidth / 2 - (r.left + r.width / 2);
    this.v = 0; this.prog = { x0: this.x, d, t0: performance.now(), dur: clamp(500 + Math.abs(d) * .6, 600, 1500), cb };
    this.wake();
  },
};
const onScreen = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; };

// ---------- A moment up close: the first tap enlarges the photo, the second tells its memory ----------
const Focus = {
  el: null, mo: null, cur: null, frame: null, state: null, g: null, cyc: 0,
  open(mo, { from = null, state = "big" } = {}) {
    if (!mo) return;
    if (this.el) this.close(true);
    Band.hold = true;
    this.mo = mo; this.cur = this.frame = mo.cover; this.state = state;
    const el = this.el = document.createElement("div");
    el.className = "focus s-" + state; el.tabIndex = -1;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", wordsOf(mo).title);
    el.innerHTML = `<div class="fz-veil"></div><div class="fz-fr" role="button" tabindex="0"><img alt="" draggable="false"></div>
      <button type="button" class="fz-snd" hidden aria-label="Senti l'audio del video">${I.mute}</button>
      <div class="fz-meta"></div><div class="fz-story"></div><button type="button" class="close fz-x" aria-label="Chiudi">${I.x}</button>`;
    document.body.append(el); lock(1);
    this.ask(mo);
    this.fill();
    const img = $(".fz-fr img", el), fromImg = from && $("img", from);
    img.src = fromImg ? (fromImg.currentSrc || fromImg.src) : this.cur.thumb; img.alt = `Foto del ${fmtDate(this.cur.date)}`;
    this.sharp(img, this.cur);
    this.place(state);
    if (fromImg && onScreen(fromImg) && !RM()) { const r0 = rectOf(fromImg); from.classList.add("away"); this.flip(r0, this.g, 900); }
    else el.classList.add("rise");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    el.addEventListener("click", e => this.click(e));
    el.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("fz-fr")) { e.preventDefault(); this.tapPhoto(); } });
    el.focus({ preventScroll: true }); Cur.refresh(950);
    if (state === "story") this.storyOpened();
    // A video starts moving once the photo has settled in its place.
    if (isVid(this.cur)) { const p = this.cur; setTimeout(() => { if (this.el === el && this.cur === p) this.show(p, true); }, RM() ? 0 : 820); }
    this.sound();
  },
  // The AI's account of photos nobody has told: asked for as they open, shown as soon as it arrives.
  ask(mo) {
    const n = narrationOf(mo); if (mo.told || !AI.ready || (n && n.fresh)) return;
    narrate(mo).then(() => { if (this.el && this.mo === mo) this.refresh(); });
  },
  sharp(img, p) { if (!p.full || img.src === p.full || img.tagName !== "IMG") return; const im = new Image(); im.onload = () => { if (img.isConnected && img.dataset.id === p.id) img.src = p.full; }; img.dataset.id = p.id; im.src = p.full; },
  fill() {
    const mo = this.mo, w = wordsOf(mo), v = wordsView(w), i = Band.list.indexOf(mo), el = this.el;
    const kick = [i >= 0 ? `Nº ${pad(i + 1)}` : "", w.when, w.place && w.place !== w.title ? w.place : ""].filter(Boolean).map(esc).join(" · ");
    const mine = mo.told && mo.mems.some(m => m.who === me);
    const tell = mo.told ? (mine ? "" : "Racconta anche tu") : "Racconta il tuo ricordo";
    const title = esc(w.title).split(" ").map((x, k) => `<span class="w"><span style="--wi:${k}">${x}</span></span>`).join(" ");
    const by = w.told && w.blocks.length === 1 ? `<span class="fz-by"><span class="avs">${w.by.map(id => `<span class="av">${initial(person(id))}</span>`).join("")}</span>${esc(nameList(w.by))} ${w.by.length > 1 ? "ricordano" : "ricorda"}${w.woven ? " · unito da Claude" : ""}</span>` : "";
    const say = `<button type="button" class="btn${mo.told ? "" : " line"}" data-fzsay>${I.speaker}Ascolta</button>`;
    const tellB = tell ? `<button type="button" class="btn${mo.told ? " line" : ""}" data-fztell>${I.mic}${tell}</button>` : "";
    let d = 0; const D = () => `style="--d:${d++}"`;
    $(".fz-meta", el).innerHTML = `<span class="mono">${kick}</span><span class="fz-hint">Tocca la foto per ${mo.told ? "leggere il ricordo" : "saperne di più"}</span>`;
    $(".fz-story", el).innerHTML = `<div class="fz-in">
      <div class="fz-top" ${D()}><span class="mono mute">${kick}</span>${heartBtn(this.cur.id).replace('class="heart', 'class="heart fz-heart')}</div>
      <h2 class="fz-t" ${D()}>${title}</h2>
      ${by ? `<div ${D()}>${by}</div>` : ""}
      <div class="fz-txt${w.told ? "" : " seen"}" ${D()}>${v.html}</div>
      ${w.told ? "" : `<p class="hint" ${D()}>${NARR.has(narrKey(mo)) ? `<span class="fz-wait">Claude sta guardando le foto per raccontarle…</span>` : w.ai ? `Raccontato da Claude guardando le foto. Nessuno della famiglia l'ha ancora raccontato.` : `Nessuno ha ancora raccontato ${mo.photos.length > 1 ? "queste foto" : "questa foto"}.`}</p>`}
      <div class="row fz-act" ${D()}>${mo.told ? say + tellB : tellB + say}</div>
      ${mo.photos.length > 1 ? `<div class="fz-th" ${D()}>${mo.photos.slice(0, 12).map(p => `<button type="button" data-fzph="${p.id}" style="--ar:${arOf(p)}" aria-label="Foto del ${esc(fmtDate(p.date))}" aria-current="${p === this.cur}"><img loading="lazy" src="${p.thumb}" alt=""></button>`).join("")}</div>
        <button type="button" class="link" data-fzall ${D()}>Guarda tutte le ${mo.photos.length} foto ${I.arrow}</button>` : `<button type="button" class="link" data-fzall ${D()}>Apri la foto ${I.arrow}</button>`}
      ${w.woven ? `<div class="row" ${D()}>${mo.mems.map(m => `<button type="button" class="link" data-fzmem="${m.id}">Le parole di ${esc(person(m.who).name)}</button>`).join("")}</div>` : ""}
    </div>`;
    $(".fz-fr", el).setAttribute("aria-label", this.state === "big" ? "Tocca per leggere il ricordo" : "Tocca per chiudere");
  },
  // Where the photo sits: centred and large, or beside its words (above them on a phone).
  geo(state) {
    const W = innerWidth, H = innerHeight, g = W < 600 ? 18 : clamp(W * .04, 18, 48), ar = arOf(this.frame), desk = W >= 900;
    if (state === "big") {
      // While the album tells its memories, its player sits at the bottom: the photo leaves it room on a computer.
      const top = 78, bot = desk ? (Tour.on ? 190 : 120) : 150, ah = Math.max(160, H - top - bot), w = Math.min(Math.min(W - 2 * g, 1500), ah * ar), h = w / ar;
      return { x: (W - w) / 2, y: top + (ah - h) / 2, w, h };
    }
    if (desk) {
      const cw = Math.min(W - 2 * g, 1360), x0 = (W - cw) / 2, colW = cw * .55, ah = H - 150, w = Math.min(colW, ah * ar), h = w / ar;
      return { x: x0 + (colW - w) / 2, y: (H - h) / 2, w, h, tx: x0 + colW + 56, tw: cw - colW - 56 };
    }
    const ah = Math.min(H * .42, 470), w = Math.min(W - 2 * g, ah * ar), h = w / ar;
    return { x: (W - w) / 2, y: 74, w, h, ty: 74 + h + 6 };
  },
  place(state, anim) {
    const el = this.el, fr = $(".fz-fr", el), g0 = this.g, g = this.g = this.geo(state);
    Object.assign(fr.style, { left: g.x + "px", top: g.y + "px", width: g.w + "px", height: g.h + "px" });
    const st = $(".fz-story", el), mt = $(".fz-meta", el), W = innerWidth;
    if (g.tx != null) Object.assign(st.style, { left: g.tx + "px", width: g.tw + "px", right: "auto", top: "0px" });
    else Object.assign(st.style, { left: "0px", width: "auto", right: "0px", top: (g.ty != null ? g.ty : this.geo("story").ty) + "px" });
    const mw = Math.min(W - 36, Math.max(g.w, 300));
    if (state === "big") Object.assign(mt.style, { left: clamp(g.x, 18, W - mw - 18) + "px", top: (g.y + g.h + 14) + "px", width: mw + "px" });
    if (anim && g0 && !RM()) this.flip(g0, g, 860);
    this.sound();
  },
  flip(r0, r1, dur) {
    const fr = $(".fz-fr", this.el);
    return fr.animate([{ transform: `translate(${r0.x - r1.x}px, ${r0.y - r1.y}px) scale(${r0.w / r1.w}, ${r0.h / r1.h})` }, { transform: "none" }], { duration: dur, easing: "cubic-bezier(.65,0,.2,1)" });
  },
  go(state) {
    if (!this.el || this.state === state) return;
    this.state = state;
    this.el.classList.remove("s-big", "s-story"); this.el.classList.add("s-" + state);
    this.place(state, true);
    $(".fz-fr", this.el).setAttribute("aria-label", state === "big" ? "Tocca per leggere il ricordo" : "Tocca per chiudere");
    Cur.refresh(900);
    if (state === "story") this.storyOpened();
  },
  storyOpened() { const s = $(".fz-story", this.el); if (s) s.scrollTop = 0; weaveMoment(this.mo); },
  tapPhoto() { if (this.state === "big") this.go("story"); else { Tour.stop(); this.close(); } },
  click(e) {
    e.stopPropagation();
    const t = e.target;
    if (t.closest(".fz-x")) { Tour.stop(); this.close(); return; }
    if (t.closest(".fz-snd")) { this.toggleSound(); return; }
    if (t.closest(".fz-fr")) { this.tapPhoto(); return; }
    const b = t.closest("button");
    if (!b) { if (t.classList.contains("fz-veil") || t === this.el) { Tour.stop(); this.close(); } return; }
    if (b.dataset.fzsay !== undefined) { if (Tour.on) Tour.stop(); else this.speak(); return; }
    if (b.dataset.fzph) { this.show(photoById(b.dataset.fzph)); return; }
    if (b.dataset.fav) { toggleFav(b.dataset.fav); return; }
    if (b.dataset.fzmem) { Tour.stop(); openMemory(b.dataset.fzmem, 50); return; }
    if (b.dataset.fzall !== undefined) { Tour.stop(); Voice.stop(); openViewer(this.mo.photos, this.cur.id, false); return; }
    if (b.dataset.fztell !== undefined) {
      Tour.stop(); Voice.stop();
      const ids = this.mo.told ? this.mo.mems[0].photoIds.filter(id => photoById(id)) : [this.cur.id, ...this.mo.photos.map(p => p.id).filter(id => id !== this.cur.id)];
      openInterview({ photoIds: ids.slice(0, 6) });
    }
  },
  // Another photo of the same moment, in the same place, so the words do not move. A video plays in its place.
  show(p, again) {
    if (!p || !this.el || (p === this.cur && !again)) return;
    this.cur = p;
    const fr = $(".fz-fr", this.el), olds = [...fr.querySelectorAll("img, video")];
    let m;
    if (isVid(p)) {
      m = document.createElement("video");
      m.muted = !this.loud || !!Voice.btn; m.playsInline = true; m.setAttribute("playsinline", ""); m.loop = loops(p); m.preload = "auto";
      m.poster = p.full; m.src = p.video; m.setAttribute("aria-label", `Video del ${fmtDate(p.date)}`);
    } else {
      m = document.createElement("img"); m.draggable = false; m.src = p.thumb; m.alt = `Foto del ${fmtDate(p.date)}`; this.sharp(m, p);
    }
    m.className = "next";
    fr.append(m);
    if (m.tagName === "VIDEO") m.play().catch(() => { if (!m.muted) { m.muted = true; this.loud = false; this.sound(); m.play().catch(() => {}); } });
    requestAnimationFrame(() => requestAnimationFrame(() => m.classList.remove("next")));
    setTimeout(() => olds.forEach(o => { if (o.tagName === "VIDEO") o.pause(); if (o.isConnected) o.remove(); }), 900);
    this.el.querySelectorAll("[data-fzph]").forEach(b => b.setAttribute("aria-current", b.dataset.fzph === p.id));
    const h = this.el.querySelector(".fz-heart"); if (h) { const on = S.favs.has(p.id); h.dataset.fav = p.id; h.classList.toggle("on", on); h.setAttribute("aria-pressed", on); }
    this.sound();
  },
  // The sound button shows on videos long enough to have something to hear.
  sound() {
    const b = this.el && $(".fz-snd", this.el); if (!b) return;
    const on = isVid(this.cur) && loops(this.cur);
    b.hidden = !on; if (!on) return;
    const loud = this.loud && !Voice.btn;
    b.innerHTML = loud ? I.speaker : I.mute; b.classList.toggle("on", loud);
    b.setAttribute("aria-label", loud ? "Togli l'audio del video" : "Senti l'audio del video");
    const g = this.g; if (g) Object.assign(b.style, { left: (g.x + g.w - 56) + "px", top: (g.y + g.h - 56) + "px" });
  },
  toggleSound() {
    this.loud = !this.loud;
    if (this.loud && Voice.btn) Voice.stop();
    const v = $(".fz-fr video:last-of-type", this.el); if (v) { v.muted = !this.loud; if (this.loud) v.play().catch(() => {}); }
    this.sound(); Music.sync();
  },
  // While the memory is read aloud, its other photos take turns in the frame.
  cycle(on) {
    clearInterval(this.cyc); this.cyc = 0;
    if (!on || !this.mo || this.mo.photos.length < 2) return;
    // A video playing in the frame is not cut short.
    this.cyc = setInterval(() => { if (!this.el) return this.cycle(false); const v = $(".fz-fr video:last-of-type", this.el); if (v && !v.paused && !v.ended && v.currentTime < Math.min(20, v.duration - .3)) return; const ps = this.mo.photos, i = ps.indexOf(this.cur); this.show(ps[(i + 1) % ps.length]); }, 5200);
  },
  speak(onEnd) {
    if (!this.el) return;
    const btn = $("[data-fzsay]", this.el); if (btn && Voice.btn === btn) { Voice.stop(); return; }
    const v = wordsView(wordsOf(this.mo)), txt = $(".fz-txt", this.el), sc = $(".fz-story", this.el), synced = v.parts.some(p => p.p);
    const ok = Voice.play(v.parts, { btn,
      onPart: p => {
        if (p.p) { const ph = photoById(p.p); if (ph && ph !== this.cur) this.show(ph); }
        txt.querySelectorAll(".s.on").forEach(x => x.classList.remove("on"));
        const s = p.s != null && txt.querySelector(`[data-s="${p.s}"]`); if (!s) return;
        s.classList.add("on");
        const r = s.getBoundingClientRect(), rc = sc.getBoundingClientRect();
        if (r.bottom > rc.bottom - 110 || r.top < rc.top + 10) sc.scrollTo({ top: sc.scrollTop + r.top - rc.top - rc.height * .28, behavior: RM() ? "auto" : "smooth" });
      },
      onStop: () => { txt.classList.remove("reading"); txt.querySelectorAll(".s.on").forEach(x => x.classList.remove("on")); this.cycle(false); if (this.later) { this.later = false; setTimeout(() => this.refresh(), 0); } },
      onEnd });
    if (ok) { txt.classList.add("reading"); this.cycle(!synced); this.el.querySelectorAll(".fz-fr video").forEach(v => { v.muted = true; }); this.sound(); }
  },
  refresh() {
    if (!this.el) return;
    if (Voice.btn && this.el.contains(Voice.btn)) { this.later = true; return; }
    const y = $(".fz-story", this.el).scrollTop; this.fill(); this.el.classList.add("still"); $(".fz-story", this.el).scrollTop = y;
  },
  close(instant) {
    const el = this.el; if (!el) return;
    this.el = null; this.cycle(false); Voice.stop(); stopVideos(el); Cur.show(""); Cur.refresh(820);
    const done = () => { el.remove(); lock(-1); document.querySelectorAll(".bi.away").forEach(b => b.classList.remove("away")); Band.hold = false; Band.wake(); };
    if (instant || RM()) { done(); return; }
    const to = Band.nearest(this.mo.key), toImg = to && $("img", to), fr = $(".fz-fr", el), g = this.g;
    el.classList.remove("on"); el.classList.add("off");
    if (toImg && this.cur === this.mo.cover && onScreen(toImg)) {
      to.classList.add("away");
      const r = rectOf(toImg);
      fr.animate([{ transform: "none" }, { transform: `translate(${r.x - g.x}px, ${r.y - g.y}px) scale(${r.w / g.w}, ${r.h / g.h})` }], { duration: 760, easing: "cubic-bezier(.65,0,.2,1)", fill: "forwards" }).onfinish = done;
    } else fr.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(24px) scale(.97)" }], { duration: 420, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }).onfinish = done;
  },
};
addEventListener("resize", () => { if (Focus.el) Focus.place(Focus.state); if (Band.el && !RM()) { clearTimeout(Band.rt); Band.rt = setTimeout(() => { if (Band.track) { Band.measure(); Band.paint(); } }, 200); } });

// On a computer a small round label follows the mouse over the photos: what a click will do.
const Cur = {
  el: null, x: 0, y: 0, tx: 0, ty: 0, raf: 0, label: "",
  init() {
    if (!FINE() || RM()) return;
    const el = this.el = document.createElement("div"); el.className = "cur"; el.setAttribute("aria-hidden", "true"); document.body.append(el);
    addEventListener("pointermove", e => { if (e.pointerType !== "mouse") return; this.tx = e.clientX; this.ty = e.clientY; if (!this.label) { this.x = this.tx; this.y = this.ty; } this.set(e.target); if (!this.raf) this.raf = requestAnimationFrame(() => this.tick()); }, { passive: true });
    document.addEventListener("pointerleave", () => this.show(""));
  },
  set(target) {
    const t = target && target.closest && target.closest(".bi, .fz-fr");
    this.show(!t || (Band.drag && Band.drag.on) ? "" : t.classList.contains("bi") ? "Guarda" : Focus.state === "big" ? "Leggi" : "Chiudi");
  },
  refresh(ms) { if (this.el) setTimeout(() => this.set(document.elementFromPoint(this.tx, this.ty)), ms || 0); },
  show(l) { if (!this.el || l === this.label) return; this.label = l; if (l) this.el.textContent = l; this.el.classList.toggle("on", !!l); },
  tick() {
    this.raf = 0; this.x += (this.tx - this.x) * .2; this.y += (this.ty - this.y) * .2;
    this.el.style.transform = `translate3d(${this.x.toFixed(1)}px, ${this.y.toFixed(1)}px, 0)`;
    if (Math.abs(this.tx - this.x) + Math.abs(this.ty - this.y) > .4) this.raf = requestAnimationFrame(() => this.tick());
  },
};

// ---------- "Ascolta i ricordi": the album tells its memories by itself, one after another ----------
const Narr = {
  el: null,
  show() {
    if (!this.el) {
      const el = this.el = document.createElement("div"); el.className = "narr"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Racconto a voce");
      el.innerHTML = `<span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="narr-t" id="narrT">Ti racconto i ricordi</span>
        <button type="button" class="nbtn" id="narrMusic" aria-pressed="${Music.wanted()}" aria-label="Musica di sottofondo">${I.music}</button>
        <button type="button" class="nbtn" id="narrNext" aria-label="Il prossimo ricordo">${I.right}</button><button type="button" class="nbtn solid" id="narrStop">${I.stop}Ferma</button>`;
      document.body.append(el);
      el.addEventListener("click", e => {
        e.stopPropagation(); const b = e.target.closest("button"); if (!b) return;
        if (b.id === "narrStop") Tour.stop();
        else if (b.id === "narrMusic") { const on = !Music.wanted(); Music.set(on); b.setAttribute("aria-pressed", on); toast(on ? "Musica accesa" : "Musica spenta", 1400); }
        else { Voice.stop(); Tour.next(); }
      });
    }
    requestAnimationFrame(() => requestAnimationFrame(() => this.el && this.el.classList.add("on")));
  },
  set(mo) { const t = this.el && $("#narrT", this.el); if (t) t.textContent = wordsOf(mo).title; },
  hide() { const el = this.el; if (!el) return; this.el = null; el.classList.remove("on"); setTimeout(() => el.remove(), 600); },
};
const Tour = {
  on: false, i: -1, t: 0,
  start() {
    if (!Voice.ok() || !Band.list.length) return;
    Voice.unlock();
    this.on = true; this.btn(); Narr.show(); Music.sync();
    if (Focus.el) { this.i = Band.list.indexOf(Focus.mo); Narr.set(Focus.mo); if (Focus.state === "story") this.read(); else { Focus.go("story"); this.later(950, () => this.read()); } return; }
    this.i = Band.list.findIndex(m => m.key === Band.middleKey()) - 1;
    this.next();
  },
  later(ms, f) { clearTimeout(this.t); this.t = setTimeout(() => { if (this.on) f(); }, ms); },
  next() {
    if (!this.on) return;
    if (Focus.el) { Focus.close(); this.later(1150, () => this.advance()); } else this.advance();
  },
  advance() {
    const list = Band.list; if (!list.length) return this.stop();
    this.i = (this.i + 1 + list.length) % list.length;
    const mo = list[this.i], open = () => {
      if (!this.on) return;
      Focus.open(mo, { from: Band.nearest(mo.key) });
      this.later(1800, () => { Focus.go("story"); this.later(1000, () => this.read()); });
    };
    Narr.set(mo);
    const el = Band.nearest(mo.key);
    if (el && Band.alive()) Band.centerOn(el, open); else open();
  },
  read() {
    if (!Focus.el) return this.next();
    const mo = Focus.mo, list = Band.list, nx = list[(this.i + 1) % list.length];
    const go = () => { if (!this.on || !Focus.el || Focus.mo !== mo) return; Focus.speak(() => this.later(1900, () => this.next())); if (nx && nx !== mo) narrate(nx); };
    const job = !mo.told && NARR.get(narrKey(mo));
    if (!job) return go();
    let done = false; const fin = () => { if (done) return; done = true; clearTimeout(wait); Focus.refresh(); Narr.set(mo); go(); };
    const wait = setTimeout(fin, 9000); job.then(fin, fin);
  },
  stop() { if (!this.on) return; this.on = false; clearTimeout(this.t); Voice.stop(); Narr.hide(); this.btn(); Music.sync(); },
  btn() { const b = $("#tour"); if (b) { b.innerHTML = this.on ? `${I.stop}Ferma il racconto` : `${I.speaker}Ascolta i ricordi`; b.classList.toggle("on", this.on); } document.body.classList.toggle("touring", this.on); },
};

// ---------- Giorgio's letter: his gift to Mamma and Papà ----------
// On the real site it lives with the family's data, not in the site's code; the preview carries a copy.
function letter() {
  const st = S.stories.lettera;
  if (st) return { text: st.story || "", photo: (st.details && st.details[0] && st.details[0].photo) || null };
  return C.letter ? { text: C.letter.text || "", photo: C.letter.photo || null } : null;
}
function letterCard() {
  const son = SON(); if (!son) return "";
  const l = letter(), isSon = me === son.id, p = l && photoById(l.photo);
  if (!(l && l.text) && !isSon) return "";
  const title = isSon ? (l && l.text ? `La tua lettera per ${coupleNames()}` : `Scrivi una lettera per ${coupleNames()}`) : "Il mio regalo per i vostri quarant'anni";
  return `<section class="sec rv"><button type="button" class="letter-card" id="openLetter">
    ${p ? `<span class="lc-ph" style="${arStyle(p)}"><img src="${p.thumb}" alt=""></span>` : ""}
    <span class="lc-t"><span class="mono mute">Da ${esc(son.name)}</span><b>${esc(title)}</b><span class="lc-go">${isSon && !(l && l.text) ? "Scrivila" : "Leggi la lettera"} ${I.arrow}</span></span></button></section>`;
}
function openLetter() {
  const son = SON(), l = letter(); if (!son) return;
  const isSon = me === son.id;
  if (!(l && l.text)) { if (isSon) editLetter(); return; }
  const p = photoById(l.photo), all = l.text.split(/\n+/).map(x => x.trim()).filter(Boolean);
  const parts = letterParts(all, son), paras = parts.paras, sign = parts.sign.map(esc).join("<br>");
  const s = sheet(sheetTop(`Da ${esc(son.name)}`) + `
    <h1 class="letter-h">Per ${esc(coupleNames())}</h1>
    ${p ? `<img class="cover letter-ph" src="${p.full}" alt="${esc(son.name)} con ${esc(coupleNames())}" style="${arStyle(p)};--covh:56vh">` : ""}
    <div class="letter">${paras.map((x, i) => `<p style="--d:${i}">${esc(x)}</p>`).join("")}<p class="sign" style="--d:${paras.length}">${sign}</p></div>
    ${isSon ? `<div class="row"><button type="button" class="btn line" id="lEdit">${I.pen}Modifica il testo</button><button type="button" class="btn line" id="lPhoto">${I.photo}Cambia la foto</button></div>` : ""}`, { z: 55 });
  s.el.classList.add("letter-sheet");
  if (isSon) { $("#lEdit", s.el).onclick = () => { s.close(); editLetter(); }; $("#lPhoto", s.el).onclick = () => { s.close(); pickLetterPhoto(); }; }
}
async function saveLetter(text, photo) {
  const st = { story: text, details: [{ photo: photo || null }], count: 0, updated: Date.now() };
  try { await Store.saveStory("lettera", st); } catch { toast("Non sono riuscito a salvare. Riprova."); return false; }
  S.stories.lettera = st; keepDedication(); return true;
}
// The opening reads the letter from here when it opens before the family's data has arrived.
function keepDedication() { const st = S.stories.lettera; if (st) ls.set("dedica", String(st.story || "")); }
function editLetter() {
  const l = letter() || { text: "", photo: null };
  const s = sheet(sheetTop("La tua lettera") + `<h1 class="h1">Per <span class="serif">${esc(coupleNames())}</span></h1>
    <div class="field"><label for="lText">Il testo</label><textarea id="lText" style="min-height:320px">${esc(l.text)}</textarea></div>
    <p class="hint">La leggono ${esc(coupleNames())} nella prima pagina. Vai a capo per un nuovo paragrafo.</p>
    <button type="button" class="btn block" id="lSave">${I.check}Salva la lettera</button>`, { z: 56 });
  $("#lSave", s.el).onclick = async () => {
    const text = $("#lText", s.el).value.trim(); if (!text) { toast("Scrivi la lettera"); return; }
    if (!(await saveLetter(text, l.photo))) return;
    s.close(); render(); toast("Lettera salvata"); if (!l.photo) pickLetterPhoto(); else openLetter();
  };
}
function pickLetterPhoto() {
  const l = letter() || { text: "", photo: null };
  const s = sheet(sheetTop("La foto della lettera") + `<h1 class="h1">Una foto<br><span class="serif">di voi tre</span></h1>${searchBox("lq", "")}
    <div class="grid" id="lgrid">${S.photos.map(p => `<div class="tile${p.id === l.photo ? " sel" : ""}" data-id="${p.id}" style="${arStyle(p)}"><button type="button" class="open" data-pick1="${p.id}"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button></div>`).join("")}</div>`, { z: 56 });
  const inp = $("#lq", s.el), grid = $("#lgrid", s.el);
  const apply = () => { const ws = terms(inp.value); grid.querySelectorAll(".tile").forEach(t => { t.hidden = !matches(photoById(t.dataset.id), ws); }); };
  inp.oninput = apply; attachDictation($("#lqMic", s.el), inp, apply);
  grid.onclick = async e => {
    const b = e.target.closest("[data-pick1]"); if (!b) return;
    if (!(await saveLetter(l.text, b.dataset.pick1))) return;
    s.close(); render(); toast("Foto della lettera cambiata"); openLetter();
  };
}

// The home has no big headline: the album's name stays small at the top and the photos take the page.
function topBar(home) {
  const p = me ? person(me) : null, tg = home ? "h1" : "span", lbl = Look.dark() ? "Sfondo chiaro" : "Sfondo scuro";
  return `<div class="top"><${tg} class="mark">Quarant'anni <i>insieme</i></${tg}><span class="top-r">
    <button type="button" class="look" id="lookBtn" aria-label="${lbl}" title="${lbl}">${Look.dark() ? I.sun : I.moon}</button>
    ${p ? `<button type="button" class="who" id="switchWho" aria-label="Sei ${esc(p.name)}. Cambia persona"><span class="nm">${esc(p.name)}</span><span class="av">${initial(p)}</span></button>` : ""}</span></div>`;
}
const foot = () => `<div class="foot"><span class="foot-l"><button type="button" class="link" id="bigText">${document.documentElement.classList.contains("big") ? "Testo normale" : "Testo più grande"}</button><button type="button" class="link" data-voiceset="1">Voce e musica</button></span>
  ${C.mode === "demo" ? `<p class="note">Anteprima: foto, ricordi e album aggiunti qui restano su questo dispositivo. Domande e racconti sono scritti da Claude.</p>` : ""}</div>`;

const bandHTML = list => `<section class="band" id="band" aria-label="I vostri ricordi. Le foto scorrono da sole: toccane una per guardarla da vicino.">
  <div class="band-track" id="bandTrack" data-n="${list.length}">${list.map((mo, i) => bandItem(mo, i)).join("")}${list.map((mo, i) => bandItem(mo, i, true)).join("")}</div></section>`;

// ---------- Render: Storia ----------
function renderStoria() {
  const list = Band.list = bandMoments();
  let h = topBar(true);
  if (list.length) {
    h += bandHTML(list) + `
      <div class="band-bar"><button type="button" class="btn" id="tour">${Tour.on ? `${I.stop}Ferma il racconto` : `${I.speaker}Ascolta i ricordi`}</button><span class="band-r"><button type="button" class="btn line" id="shuffleBand">${I.shuffle}Mescola</button><button type="button" class="btn line" data-voiceset="1">${I.music}Voce e musica</button></span></div>
      <p class="hint band-hint">Le foto scorrono da sole. Tocca una foto per ingrandirla, toccala ancora per leggere il ricordo.</p>`;
  } else h += `<div class="invite" style="margin-top:24px"><q>Ogni ricordo parte da una foto.</q><button type="button" class="btn" id="addPhotos">${I.plus}Aggiungi le prime foto</button></div>`;
  h += rmNotice() + letterCard() + raccolteHTML();
  h += timelineBand();
  return h + foot();
}

// Memories told by more than one person about the same photos become one story, written by the AI.
async function weaveMoment(mo) {
  if (!AI.ready || !mo || !mo.told || mo.mems.length < 2 || new Set(mo.mems.map(m => m.who)).size < 2) return;
  const key = storyKey(mo); if (S.stories[key] || S.weaving.has(key)) return;
  S.weaving.add(key);
  try {
    const out = await AI.json(`Stai scrivendo l'album dei 40 anni di matrimonio di ${coupleReal()} (si conoscono dal ${C.met}, sposati nel ${C.married}).
Ecco i ricordi raccontati, ciascuno per conto suo, sulle stesse foto (${whenOf(mo.photos)}${placeOf(mo.cover) ? ", " + placeOf(mo.cover) : ""}):
${mo.mems.map(m => `[${realName(person(m.who))}] ${m.text}`).join("\n")}

Scrivi il ricordo di queste foto unendo i racconti in un testo solo, coerente e commovente, in terza persona, chiamandoli ${PEOPLE.map(realName).join(", ")}. Quando i ricordi si completano, intrecciali; quando divergono, raccontalo con tenerezza. Non inventare fatti, nomi o luoghi. 60-160 parole, italiano semplice ed elegante, senza titolo.
JSON: {"story": "..."}`);
    if (out && out.story) {
      const s = { story: String(out.story).trim(), details: [], count: mo.mems.length, updated: Date.now() };
      await Store.saveStory(key, s); S.stories[key] = s;
      if (Focus.el && Focus.mo && Focus.mo.key === mo.key) Focus.refresh();
    }
  } catch (e) { if (e && e.code === "not_granted") AI.ready = false; }
  S.weaving.delete(key);
}
// Covers share one height so the titles line up; the width follows the photo (very tall or very wide ones sit on a mat).
const racBox = p => [Math.round(Math.min(330, Math.max(130, 230 * arOf(p)))), 230];
function raccolteHTML() {
  const rs = raccolte(); if (!rs.length) return "";
  return `<section class="sec rv"><div class="sec-h"><h2>Raccolte</h2><span class="mono mute">Ordinate dall'AI</span></div>
    <div class="racs">${rs.map(r => { const c = coverOf(r.photos), [w, h] = racBox(c); return `<button type="button" class="rac" data-rac="${esc(r.id)}" style="width:${w}px"><span class="rac-img" style="height:${h}px"><img loading="lazy" src="${c.thumb}" alt=""></span><span class="mono mute">${r.id === "video" ? `${r.photos.length} video` : `${r.kind} · ${r.photos.length} foto`}</span><b>${esc(r.title)}</b><span class="mute">${esc(r.sub)}</span></button>`; }).join("")}</div></section>`;
}

// ---------- Timeline ----------
function tlYears() {
  const by = new Map(), mems = new Map();
  const add = (m, y, v) => { if (!m.has(y)) m.set(y, []); m.get(y).push(v); };
  S.photos.forEach(p => add(by, +p.date.slice(0, 4), p));
  S.memories.forEach(m => { const ph = photoById((m.photoIds || [])[0]); const y = +(m.year || (ph && ph.date.slice(0, 4)) || 0); if (y) add(mems, y, m); });
  const ys = [...new Set([C.met, C.married, ...by.keys(), ...mems.keys()])].sort((a, b) => a - b);
  return ys.map(y => ({ y, photos: by.get(y) || [], mems: mems.get(y) || [],
    label: y === C.met ? "Vi conoscete" : y === C.married ? "Il matrimonio" : y === C.married + 40 ? "Quarant'anni" : "" }));
}
const pickEven = (a, n) => a.length <= n ? a : Array.from({ length: n }, (_, i) => a[Math.floor((i + .5) * a.length / n)]);
function timelineBand() {
  const ys = tlYears(); if (!ys.length) return "";
  let n = 0, prev = null;
  const items = ys.map(t => {
    const ph = pickEven(t.photos, 7); n += 1 + ph.length + Math.min(2, t.mems.length) + (t.photos.length ? 0 : 1);
    // The years in between have their own tile too, so photos from any year have a place to go.
    const gap = prev && t.y - prev > 1 ? (n++, `<button type="button" class="tl-add gap" data-upfrom="${prev + 1}" data-upto="${t.y - 1}" tabindex="-1">${I.plus}<span>Avete foto ${yearsTxt(prev + 1, t.y - 1)}?</span><span class="mono">Aggiungile</span></button>`) : "";
    prev = t.y;
    return gap + `<div class="tl-y"><b>${t.y}</b><span class="mono">${esc(t.label || `${t.photos.length} foto`)}</span></div>` +
      ph.map(p => `<button type="button" class="tl-p" data-photo="${p.id}" data-list="tutti" tabindex="-1" aria-label="Foto del ${esc(fmtDate(p.date))}" style="width:${Math.round(170 * arOf(p))}px"><img src="${p.thumb}" alt=""></button>`).join("") +
      t.mems.slice(-2).map(m => `<button type="button" class="tl-m" data-mem="${m.id}" tabindex="-1"><q>${esc(m.quote || firstSentence(m.text))}</q><span class="mono">${esc(person(m.who).name)}</span></button>`).join("") +
      (t.photos.length ? "" : `<button type="button" class="tl-add" data-upyear="${t.y}" tabindex="-1">${I.plus}<span>Aggiungi una foto del ${t.y}</span></button>`);
  }).join("");
  return `<section class="sec rv"><div class="sec-h"><h2>Timeline</h2><button type="button" class="link plain" id="openTl">Apri ${I.arrow}</button></div>
    <div class="tl" id="tl"><div class="tl-track" style="--tl-dur:${Math.max(40, Math.round(n * 3.4))}s">${items}<span class="tl-dup" aria-hidden="true">${items}</span></div></div>
    <p class="hint">Scorre da sola. Toccala per fermarla, tocca una foto per aprirla.</p></section>`;
}
function openTimeline() {
  const ys = tlYears();
  let h = sheetTop(`Timeline · ${C.met} — ${C.married + 40}`) + `<h1 class="h1">La vostra<br><span class="serif">timeline</span></h1>`, prev = null;
  ys.forEach(t => {
    if (prev && t.y - prev > 1) h += `<div class="tl-gap"><span class="mono mute">${prev + 2 === t.y ? prev + 1 : `${prev + 1} — ${t.y - 1}`}</span><p class="note">Anni ancora senza foto. Avete foto stampate? Fotografatele col telefono e aggiungetele qui: vi chiedo io l'anno.</p><button type="button" class="btn line" data-upfrom="${prev + 1}" data-upto="${t.y - 1}">${I.plus}Aggiungi foto</button></div>`;
    const info = [t.label, t.photos.length ? `${t.photos.length} foto` : "", t.mems.length ? `${t.mems.length} ${t.mems.length > 1 ? "ricordi" : "ricordo"}` : ""].filter(Boolean).join(" · ");
    h += `<section class="tl-row"><div class="tl-row-h"><b>${t.y}</b><span class="mono mute">${esc(info)}</span></div>
      ${t.photos.length ? `<div class="strip">${t.photos.slice(0, 24).map(p => `<button type="button" data-photo="${p.id}" data-list="y:${t.y}" style="${arStyle(p)}"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button>`).join("")}</div>
        ${t.photos.length > 24 ? `<button type="button" class="link" data-fotoyear="${t.y}" style="justify-self:start">Tutte le ${t.photos.length} foto del ${t.y} ${I.arrow}</button>` : ""}`
        : `<button type="button" class="btn line" data-upyear="${t.y}" style="justify-self:start">${I.plus}Aggiungi una foto del ${t.y}</button>`}
      ${t.mems.map(m => `<button type="button" class="mem" data-mem="${m.id}"><span class="mono mute">${esc(person(m.who).name)} ricorda</span><b>${esc(m.title || "Un ricordo")}</b><span class="mute">${esc(firstSentence(m.text))}</span></button>`).join("")}
    </section>`;
    prev = t.y;
  });
  sheet(h);
}

// ---------- Collections ----------
function openRaccolta(id) {
  const r = racById(id); if (!r) return;
  sheet(sheetTop(`${r.kind} · ordinata dall'AI`) + `<h1 class="h1">${esc(r.title)}</h1>
    <div class="meta-row" style="margin-top:0"><span class="mono">${r.photos.length} foto</span><span class="mono">${esc(spanOf(r.photos))}</span></div>
    ${r.kind === "Tema" ? `<p class="lede" style="margin:0">${esc(r.sub)}</p>` : ""}
    <div class="row"><button type="button" class="btn" data-play="r:${esc(r.id)}">${I.play}Proiezione</button><button type="button" class="btn line" data-find="r:${esc(r.id)}">${I.mic}Racconta un ricordo</button></div>
    <div class="grid">${r.photos.map(p => tileHTML(p, "r:" + r.id)).join("")}</div>`);
}
function indexRow(c, i) {
  const ps = photosIn(c.id), ms = memsIn(c.id), st = S.stories[c.id];
  const bits = [ps.length ? `${ps.length} foto` : "", ms.length ? `${ms.length} ${ms.length > 1 ? "ricordi" : "ricordo"}` : "", st && st.story ? "<b>Racconto pronto</b>" : ""].filter(Boolean);
  // A few of the chapter's photos, whole: the cover first, then some from across the chapter.
  const cover = ps.find(p => p.id === c.cover), few = ps.length ? [cover, ...pickEven(ps.filter(p => p !== cover), cover ? 7 : 8)].filter(Boolean) : [];
  return `<li class="rv${ps.length || ms.length ? "" : " empty"}" style="--k:${i < 6 ? i : 0}"><button type="button" data-chap="${c.id}">
    <span class="n">${pad(i + 1)}</span><span class="t">${esc(c.title)}</span><span class="y">${esc(c.when)}</span>
    <span class="sub">${bits.length ? bits.map(b => `<span>${b}</span>`).join("") : "<span>Da raccontare</span>"}</span>${few.length ? `<span class="ch-ph" aria-hidden="true">${few.map((p, k) => `<img loading="lazy" src="${p.thumb}" alt="" style="--i:${k};aspect-ratio:${arOf(p)}">`).join("")}</span>`
      : ms.length ? "" : `<span class="ch-ph"><span class="ch-add">${I.plus}Aggiungi le foto di quegli anni</span></span>`}</button></li>`;
}

// ---------- Chapter page ----------
let chapterSheet = null;
function chapterHTML(c) {
  const ps = photosIn(c.id), ms = memsIn(c.id), st = S.stories[c.id];
  let h = sheetTop(`Capitolo ${chNum(c.id)} · ${esc(c.when)}`) + `<h1 class="h1">${esc(c.title)}</h1>`;
  if (!ps.length && !ms.length) {
    return h + `<div class="invite"><span class="mono mute">Nessuno ha ancora raccontato questo capitolo</span><q>${esc(c.starter)}</q>
      <button type="button" class="btn" data-upch="${c.id}">${I.plus}Carica una foto di quegli anni</button></div>
      <p class="note">Ogni ricordo parte da una foto. Avete foto stampate di quegli anni? Fotografatele col telefono: poi raccontate cosa ricordate.</p>` + chapterEditRow(c);
  }
  const cover = ps.find(p => p.id === c.cover) || ps[0];
  const rest = cover ? ps.filter(p => p !== cover) : [];
  if (cover) h += `<img class="cover" src="${cover.full}" alt="Foto del ${esc(fmtDate(cover.date))}" data-photo="${cover.id}" data-list="${c.id}" style="cursor:pointer;${arStyle(cover)}">`;
  if (st && st.story) {
    h += `<div class="story">${st.story.split(/\n+/).map(x => `<p>${esc(x)}</p>`).join("")}</div>
      <div class="row">${listenBtn(st.story, "Ascolta il racconto", "btn")}<span class="mono mute">${(st.count || ms.length) > 1 ? `Scritto da Claude unendo ${st.count || ms.length} ricordi` : "Scritto da Claude da un ricordo"}</span></div>`;
    if (st.details && st.details.length) h += `<div class="details">${st.details.map(d => `<div class="detail"><span class="mono mute">Lo ricorda ${esc(person(d.who).name)}</span><span>${esc(d.text)}</span></div>`).join("")}</div>`;
  } else if (ms.length) {
    h += `<div>${ms.slice(-4).map(m => { const p = person(m.who); return `<div class="quote"><span class="av">${initial(p)}</span><p><span class="mono mute">${esc(p.name)} ricorda</span><br>${esc(firstSentence(m.text))}</p></div>`; }).join("")}</div>`;
    if (AI.ready) h += `<button type="button" class="btn line" data-weave="${c.id}" ${S.weaving.has(c.id) ? "disabled" : ""}>${I.spark}${S.weaving.has(c.id) ? "Sto scrivendo il racconto…" : "Unisci i ricordi in un racconto"}</button>`;
  }
  if (rest.length) h += `<div class="strip">${rest.slice(0, 30).map(p => `<button type="button" data-photo="${p.id}" data-list="${c.id}" style="${arStyle(p)}"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button>`).join("")}</div>
    <div class="row"><button type="button" class="link" data-chall="${c.id}">Tutte le ${ps.length} foto ${I.arrow}</button></div>`;
  const others = PEOPLE.filter(p => p.partner && !ms.some(m => m.who === p.id));
  h += `<div class="invite" style="margin-top:10px"><q>${esc(c.starter)}</q><button type="button" class="btn" ${ps.length ? `data-find="${c.id}"` : `data-upch="${c.id}"`}>${I.photo}${ms.some(m => m.who === me) ? "Scegli la foto di un altro ricordo" : "Scegli la foto del tuo ricordo"}</button>
    ${ms.length && others.length ? `<span class="mono mute">Manca ancora il ricordo di ${others.map(o => esc(o.name)).join(" e ")}</span>` : ""}</div>`;
  return h + chapterEditRow(c);
}
const chapterEditRow = c => c.custom ? `<div class="row" style="margin-top:22px"><button type="button" class="link" data-chedit="${c.id}">${I.pen}Cambia nome o periodo</button></div>` : "";
function openChapter(id) {
  if (chapterSheet) chapterSheet.close();
  const c = chById(id); if (!c) return;
  chapterSheet = sheet(chapterHTML(c), { onClose: () => { chapterSheet = null; } });
  chapterSheet.id = id;
}
function refreshChapter(id) { if (chapterSheet && chapterSheet.id === id) { const y = chapterSheet.el.scrollTop; chapterSheet.set(chapterHTML(chById(id))); chapterSheet.el.scrollTop = y; } }

// ---------- A chapter of their own ----------
// A name and a stretch of time, from a month to a month: the photos of those days move into it by themselves.
const monthPick = (id, m) => `<span class="sel"><select id="${id}">${MESI.map((x, k) => `<option value="${k + 1}"${m === k + 1 ? " selected" : ""}>${x}</option>`).join("")}</select></span>`;
function editChapter(c) {
  const [y1, m1] = c ? c.from.split("-").map(Number) : [THIS_YEAR, 1], [y2, m2] = c ? c.to.split("-").map(Number) : [THIS_YEAR, 12];
  const s = sheet(sheetTop(c ? "Il vostro capitolo" : "Un capitolo nuovo") + `
    <h1 class="h1">${c ? "Cambia il capitolo" : `Un capitolo <span class="serif">nuovo</span>`}</h1>
    <p class="lede" style="margin:0">Dai un nome a un periodo della vostra vita. Le foto di quei mesi entrano da sole nel capitolo.</p>
    <div class="field"><label for="cTitle">Come si chiama</label><input id="cTitle" maxlength="60" value="${esc(c ? c.title : "")}" placeholder="Il viaggio di nozze"></div>
    <fieldset class="period"><legend>Da</legend><div class="two"><div class="field"><label for="cY1">Anno</label><input id="cY1" inputmode="numeric" maxlength="4" value="${y1}"></div>
      <div class="field"><label for="cM1">Mese</label>${monthPick("cM1", m1)}</div></div></fieldset>
    <fieldset class="period"><legend>Fino a</legend><div class="two"><div class="field"><label for="cY2">Anno</label><input id="cY2" inputmode="numeric" maxlength="4" value="${y2}"></div>
      <div class="field"><label for="cM2">Mese</label>${monthPick("cM2", m2)}</div></div></fieldset>
    <p class="hint" id="cCount" aria-live="polite"></p>
    <button type="button" class="btn block" id="cSave">${I.check}${c ? "Salva" : "Crea il capitolo"}</button>
    ${c ? `<button type="button" class="link" id="cDel" style="justify-self:start">Togli il capitolo</button>` : ""}`, { z: 50 });
  const v = id => $("#" + id, s.el);
  // The period as typed, in order; null while a year is missing or out of range.
  const period = () => {
    let a = [parseInt(v("cY1").value, 10), +v("cM1").value], b = [parseInt(v("cY2").value, 10), +v("cM2").value];
    if (![a[0], b[0]].every(y => y >= 1900 && y <= THIS_YEAR)) return null;
    if (a[0] * 12 + a[1] > b[0] * 12 + b[1]) [a, b] = [b, a];
    return { from: `${a[0]}-${pad(a[1])}-01`, to: `${b[0]}-${pad(b[1])}-${pad(new Date(b[0], b[1], 0).getDate())}` };
  };
  const count = () => {
    const pr = period(), el = v("cCount"); if (!el) return;
    if (!pr) { el.textContent = ""; return; }
    const n = S.photos.filter(p => { const [lo, hi] = drange(p.date); return lo >= pr.from && hi <= pr.to; }).length;
    el.textContent = `${rangeLabel(pr.from, pr.to)}: ${n ? `${n} ${n > 1 ? "foto entrano" : "foto entra"} nel capitolo.` : "ancora nessuna foto. Potrete aggiungerle dal capitolo."}`;
  };
  // Until "Fino a" is touched it follows "Da": typing 1995 once makes a chapter of the whole 1995.
  let follow = !c;
  v("cY1").addEventListener("input", () => { if (follow) v("cY2").value = v("cY1").value; });
  ["cY2", "cM2"].forEach(id => ["input", "change"].forEach(ev => v(id).addEventListener(ev, () => { follow = false; })));
  ["cY1", "cY2"].forEach(id => v(id).addEventListener("input", count));
  ["cM1", "cM2"].forEach(id => v(id).addEventListener("change", count));
  count();
  if (!c) setTimeout(() => v("cTitle") && v("cTitle").focus(), 350);
  v("cSave").onclick = async () => {
    const title = v("cTitle").value.trim().replace(/\s+/g, " "), pr = period();
    if (!title) { toast("Scrivi il nome del capitolo"); v("cTitle").focus(); return; }
    if (!pr) { toast(`Scrivi gli anni tra il 1900 e il ${THIS_YEAR}`); v(parseInt(v("cY1").value, 10) >= 1900 && parseInt(v("cY1").value, 10) <= THIS_YEAR ? "cY2" : "cY1").focus(); return; }
    const was = c ? S.chapters.find(x => x.id === c.id) || {} : {};
    const row = { id: c ? c.id : uid("ch"), title, ...pr, by: c ? c.by : me, created: c ? c.created : Date.now() };
    // What a chapter brought with it stays while it still fits: the cover always, its own label while the months
    // are the same, its first question while the name is the same.
    if (was.cover) row.cover = was.cover;
    if (was.label && was.from === pr.from && was.to === pr.to) row.label = was.label;
    if (was.starter && was.title === title) row.starter = was.starter;
    v("cSave").disabled = true;
    try { await Store.saveChapter(row); } catch { v("cSave").disabled = false; toast("Non sono riuscito a salvare il capitolo. Riprova."); return; }
    setChapters([...S.chapters.filter(x => x.id !== row.id), row]); bump();
    s.close(); render();
    if (c) { refreshChapter(row.id); toast("Capitolo aggiornato"); } else { openChapter(row.id); toast(`Il capitolo «${title}» è pronto`); }
  };
  const del = v("cDel");
  if (del) del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = "Tocca di nuovo per toglierlo. Le foto restano nell'album."; return; }
    try { await Store.deleteChapter(c.id); } catch { toast("Non sono riuscito a toglierlo. Riprova."); return; }
    setChapters(S.chapters.filter(x => x.id !== c.id)); bump();
    s.close(); if (chapterSheet && chapterSheet.id === c.id) chapterSheet.close(); render();
    toast("Capitolo tolto. Le foto e i ricordi restano nell'album.");
  };
}

// ---------- Render: Capitoli ----------
function renderCapitoli() {
  return topBar() + `
    <header class="hero"><h1 class="h1">Capitoli</h1>
      <p class="lede">La vostra storia, dal primo incontro a oggi. Tocca un capitolo per aprirlo.</p>
      <div class="add-ch"><button type="button" class="btn line" id="addChapter">${I.plus}Aggiungi un capitolo</button><span class="hint">Un viaggio, una casa, un periodo da ricordare</span></div></header>
    <ol class="index chs">${CHAPTERS.map(indexRow).join("")}</ol>` + foot();
}

// ---------- Render: Racconta ----------
function renderRacconta() {
  const p = person(me);
  const day = Math.floor(Date.now() / 864e5), q = DAILY[day % DAILY.length];
  const told = new Set(S.memories.flatMap(m => m.photoIds || []));
  const waiting = S.photos.filter(x => !told.has(x.id));
  const suggest = shuffle(waiting.length ? waiting : S.photos).slice(0, 6);
  const mine = S.memories.filter(m => m.who === me).length;
  return topBar() + `
    <header class="hero"><h1 class="h1">Ciao<br><span class="serif">${esc(p.name)}</span></h1>
      <p class="lede">Ogni ricordo parte da una foto. Caricane una nuova o scegline una dell'album, poi raccontami cosa ricordi, a voce o scrivendo.</p></header>
    <div class="starts">
      <button type="button" class="start" id="uploadTell"><span class="mono">Una foto nuova</span><span class="row"><b>Carica<br>una foto</b>${I.plus}</span><span class="st-sub">Dal telefono o dal computer, anche una foto stampata</span></button>
      <button type="button" class="start" data-find="tutti"><span class="mono">Dall'album</span><span class="row"><b>Scegli<br>una foto</b>${I.photo}</span><span class="st-sub">Tra le ${S.photos.length} foto che sono già qui</span></button>
    </div>
    <div class="qod rv"><span class="mono mute">La domanda di oggi</span><q>${esc(q)}</q><div class="row"><button type="button" class="btn" id="startDaily">${I.photo}Scegli la foto</button><button type="button" class="btn line" id="uploadDaily">${I.plus}Carica la foto</button></div></div>
    <section class="sec rv"><div class="sec-h"><h2>Aspettano un ricordo</h2><button type="button" class="link plain" id="otherPhotos">${I.shuffle}Altre</button></div>
      <div class="pick">${suggest.map(x => `<button type="button" style="${arStyle(x)}" data-tellphoto="${x.id}" aria-label="Racconta la foto del ${esc(fmtDate(x.date))}"><img src="${x.thumb}" alt=""></button>`).join("")}</div>
      <p class="hint" style="margin-top:10px">${waiting.length} foto non hanno ancora un ricordo. Toccane una per raccontarla.</p></section>
    ${mine ? `<section class="sec"><button type="button" class="link" data-tab-go="mio">I tuoi ${mine} ricordi sono in «Per me» ${I.arrow}</button></section>` : ""}` + foot();
}

// ---------- Render: Foto ----------
const searchBox = (id, value) => `<div class="search"><span class="sico" aria-hidden="true">${I.search}</span><input type="search" id="${id}" value="${esc(value || "")}" placeholder="Cerca: mare, Natale, 2023…" autocomplete="off" enterkeyhint="search" aria-label="Cerca le foto"><button type="button" class="mic sm" id="${id}Mic" aria-label="Cerca a voce">${I.mic}</button></div>`;
function renderFoto() {
  const list = listFor(S.filter);
  const untagged = AI.ready && AI.imgMax ? S.photos.filter(p => !tagsOf(p).length).length : 0;
  let h = topBar() + `
    <header class="hero"><h1 class="h1">Foto</h1><div class="meta-row"><span class="mono">${S.photos.filter(p => !isVid(p)).length} foto</span>${S.photos.some(isVid) ? `<span class="mono">${S.photos.filter(isVid).length} video</span>` : ""}<span class="mono">${listFor("fav").length} preferite</span><span class="mono">${raccolte().length} raccolte</span></div></header>
    ${searchBox("q", S.q)}
    <div class="row" style="justify-content:space-between;margin-top:14px">
      <div class="seg" role="group" aria-label="Vista"><button type="button" data-view="grid" aria-pressed="${S.view === "grid"}">Griglia</button><button type="button" data-view="deck" aria-pressed="${S.view === "deck"}">Sfoglia</button></div>
      <button type="button" class="btn" id="addPhotos">${I.plus}Aggiungi</button></div>
    <div class="chips">${chipKeys(S.filter, true).map(([id, t]) => `<button type="button" class="chip" data-filter="${esc(id)}" aria-pressed="${S.filter === id}">${esc(t)}</button>`).join("")}</div>
    <span class="mono mute" id="qcount"></span>
    ${S.gone.length ? `<button type="button" class="link" id="goneList">Foto tolte dall'album (${S.gone.length})</button>` : ""}
    ${untagged ? `<div class="row" style="margin:10px 0"><button type="button" class="btn line" id="tagRest">${I.spark}Fai guardare all'AI ${untagged} foto nuove</button></div>` : ""}`;
  if (!list.length) h += `<p class="empty-note">${S.filter === "fav" ? "Nessuna preferita ancora. Tocca il cuore su una foto per tenerla qui." : S.filter === "rm" ? "Nessuna foto da decidere." : "Nessuna foto qui."}</p>`;
  else if (S.view === "deck") h += `<div class="deck" id="deck" aria-label="Sfoglia le foto"></div>
    <div class="deck-bar"><button type="button" class="ico" data-deck="-1" aria-label="Foto precedente">${I.left}</button><span class="mono" id="deckN"></span><button type="button" class="ico" data-deck="1" aria-label="Foto successiva">${I.right}</button></div>
    <p class="hint" style="text-align:center">Scorri col dito. Tocca la foto in mezzo per aprirla.</p>`;
  else h += `<div class="grid" id="fotoGrid">${list.map(p => tileHTML(p, S.filter)).join("")}</div>`;
  return h + foot();
}
// Typing or speaking in the search box filters what is already on screen, without rebuilding it.
function applyFotoSearch() {
  const ws = terms(S.q), cnt = $("#qcount");
  const grid = $("#fotoGrid");
  if (grid) { let n = 0; grid.querySelectorAll(".tile").forEach(t => { const ok = matches(photoById(t.dataset.id), ws); t.hidden = !ok; if (ok) n++; }); if (cnt) cnt.textContent = ws.length ? (n ? `${n} foto trovate` : "Nessuna foto trovata. Prova con altre parole.") : ""; }
  const deck = $("#deck");
  if (deck) { deck.innerHTML = ""; S.deck = 0; const n = fotoList().length; if (cnt) cnt.textContent = ws.length ? (n ? `${n} foto trovate` : "Nessuna foto trovata. Prova con altre parole.") : ""; drawDeck(); }
}
function drawDeck() {
  const box = $("#deck"); if (!box) return;
  const list = fotoList(), n = list.length; if (!n) return;
  S.deck = ((S.deck % n) + n) % n;
  const want = new Map();
  for (const o of [0, 1, -1, 2, -2, 3, -3]) { const i = (S.deck + o + n) % n; if (!want.has(i)) want.set(i, o); }
  box.querySelectorAll(".card3").forEach(c => { if (!want.has(+c.dataset.i)) c.remove(); });
  for (const [i, o] of want) {
    let c = box.querySelector(`.card3[data-i="${i}"]`);
    const p = list[i];
    if (!c) { c = document.createElement("button"); c.type = "button"; c.className = "card3"; c.dataset.i = i; c.style.setProperty("--ar", arOf(p)); c.innerHTML = `<img alt="Foto del ${esc(fmtDate(p.date))}" src="${p.thumb}">`; c.style.opacity = 0; box.append(c); c.getBoundingClientRect(); }
    const a = Math.abs(o);
    if (a <= 1 && !c.dataset.full) { c.dataset.full = 1; const img = new Image(); img.onload = () => { const el = c.querySelector("img"); if (el) el.src = p.full; }; img.src = p.full; }
    c.style.transform = `translate(-50%, -50%) translateX(${o * 46}%) translateZ(${-a * 170}px) rotateY(${o * -26}deg)`;
    c.style.opacity = a > 2 ? 0 : 1 - a * .18;
    c.style.filter = a ? "grayscale(1)" : "none";
    c.style.zIndex = 10 - a;
    c.setAttribute("aria-hidden", a ? "true" : "false"); c.tabIndex = a ? -1 : 0;
  }
  const lbl = $("#deckN"); if (lbl) lbl.textContent = `${pad(S.deck + 1, 3)} / ${pad(n, 3)} · ${fmtDate(list[S.deck].date)}`;
}

// ---------- Render: Per me ----------
function renderMio() {
  const favs = listFor("fav");
  const mine = S.memories.filter(m => m.who === me).sort((a, b) => b.created - a.created);
  return topBar() + `
    <header class="hero"><h1 class="h1">Per <span class="serif">me</span></h1>
      <p class="lede">Le tue foto preferite e i tuoi album. Li vedi solo tu.</p></header>
    <section class="sec"><div class="sec-h"><h2>Preferite</h2><span class="mono mute">${favs.length}</span></div>
      ${favs.length ? `<div class="strip">${favs.map(p => `<button type="button" data-photo="${p.id}" data-list="fav" style="${arStyle(p)}"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button>`).join("")}</div>
        <div class="row" style="margin-top:12px"><button type="button" class="btn line" data-play="fav">${I.play}Proiezione delle preferite</button></div>`
        : `<p class="empty-note">Tocca il cuore ${I.heart.replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px;fill:none;stroke:currentColor;stroke-width:1.8"')} su una foto e la ritrovi qui.</p>`}</section>
    <section class="sec"><div class="sec-h"><h2>I miei album</h2><span class="mono mute">${S.albums.length}</span></div>
      <div class="albums">${S.albums.map(albumCard).join("")}<button type="button" class="album new" id="newAlbum"><span class="stack"><span>+</span></span><b>Nuovo album</b><span class="mono mute">Solo per te</span></button></div></section>
    <section class="sec"><div class="sec-h"><h2>I miei ricordi</h2><span class="mono mute">${mine.length}</span></div>
      ${mine.length ? `<div class="mems">${mine.map(m => `<button type="button" class="mem" data-mem="${m.id}"><span class="mono mute">${esc([m.year, m.place].filter(Boolean).join(" · "))}</span><b>${esc(m.title || "Un ricordo")}</b><span class="mute">${esc(firstSentence(m.text))}</span></button>`).join("")}</div>`
        : `<p class="empty-note">Qui troverai i ricordi che racconti. Comincia da «Racconta».</p>`}</section>` + foot();
}
function albumCard(a) {
  const ps = a.photoIds.map(photoById).filter(Boolean).slice(0, 3);
  return `<button type="button" class="album" data-album="${a.id}"><span class="stack">${ps.length ? ps.map(p => `<img src="${p.thumb}" alt="" style="${arStyle(p)}">`).join("") : "<span></span>"}</span><b>${esc(a.name)}</b><span class="mono mute">${a.photoIds.length} foto</span></button>`;
}

// ---------- Albums ----------
async function newAlbum(firstPhoto) {
  const name = await askName("Album · solo per te"); if (!name) return null;
  const a = { id: uid("a"), name, photoIds: firstPhoto ? [firstPhoto] : [], created: Date.now() };
  try { await Store.saveAlbum(me, a); } catch { toast("Non sono riuscito a creare l'album. Riprova."); return null; }
  S.albums.unshift(a); S.dirty = true;
  return a;
}
async function saveAlbum(a) { S.dirty = true; try { await Store.saveAlbum(me, a); } catch { toast("Non sono riuscito a salvare l'album. Riprova."); } }
function albumHTML(a) {
  const ps = listFor("album:" + a.id);
  return sheetTop("Album · solo per te") + `
    <h1 class="h1">${esc(a.name)}</h1>
    <div class="meta-row" style="margin-top:0"><span class="mono">${ps.length} foto</span><span class="mono">Creato il ${esc(fmtDate(new Date(a.created).toISOString().slice(0, 10)))}</span></div>
    <div class="row">${ps.length ? `<button type="button" class="btn" data-play="album:${a.id}">${I.play}Proiezione</button>` : ""}<button type="button" class="btn line" data-apick="${a.id}">${I.plus}Aggiungi foto</button></div>
    ${ps.length ? `<div class="grid">${ps.map(p => tileHTML(p, "album:" + a.id)).join("")}</div>` : `<p class="empty-note">L'album è vuoto. Tocca «Aggiungi foto», oppure apri una foto e tocca ${I.album.replace("<svg", '<svg style="width:18px;height:18px;vertical-align:-3px;fill:none;stroke:currentColor;stroke-width:1.8"')}.</p>`}
    <div class="row" style="margin-top:20px;gap:24px"><button type="button" class="link" data-arename="${a.id}">${I.pen}Rinomina</button><button type="button" class="link" data-adel="${a.id}">Elimina l'album</button></div>`;
}
let albumSheet = null;
function openAlbum(id) {
  const a = albumById(id); if (!a) return;
  albumSheet = sheet(albumHTML(a), { onClose: () => { albumSheet = null; if (S.tab === "mio") render(); } });
  albumSheet.id = id;
  albumSheet.el.addEventListener("click", async e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.apick) pickPhotos(a);
    else if (t.dataset.arename) { const n = await askName("Album · solo per te", a.name); if (n) { a.name = n; await saveAlbum(a); refreshAlbum(); } }
    else if (t.dataset.adel) {
      if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = "Tocca di nuovo per eliminare"; return; }
      try { await Store.deleteAlbum(me, a.id); } catch { toast("Non sono riuscito a eliminarlo. Riprova."); return; }
      S.albums = S.albums.filter(x => x.id !== a.id); albumSheet.close(); toast("Album eliminato. Le foto restano nell'album di famiglia.");
    }
  });
}
function refreshAlbum() { if (!albumSheet) return; const a = albumById(albumSheet.id); if (!a) return; const y = albumSheet.el.scrollTop; albumSheet.set(albumHTML(a)); albumSheet.el.scrollTop = y; }
function pickPhotos(a) {
  const sel = new Set(a.photoIds);
  const s = sheet(sheetTop(`Scegli le foto · ${esc(a.name)}`) + `<p class="hint">Tocca le foto da mettere nell'album. Tocca di nuovo per toglierle.</p>
    <div class="grid">${S.photos.map(p => `<div class="tile${sel.has(p.id) ? " sel" : ""}" style="${arStyle(p)}"><button type="button" class="open" data-pick="${p.id}" aria-pressed="${sel.has(p.id)}"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button></div>`).join("")}</div>
    <div class="dock"><button type="button" class="btn block" id="pickDone">${I.check}Fatto</button></div>`, { z: 50 });
  s.el.addEventListener("click", e => {
    const b = e.target.closest("[data-pick]"); if (!b) return;
    const id = b.dataset.pick, on = !sel.has(id); on ? sel.add(id) : sel.delete(id);
    b.parentElement.classList.toggle("sel", on); b.setAttribute("aria-pressed", on);
  });
  $("#pickDone", s.el).onclick = async () => {
    a.photoIds = [...a.photoIds.filter(id => sel.has(id)), ...S.photos.map(p => p.id).filter(id => sel.has(id) && !a.photoIds.includes(id))];
    await saveAlbum(a); s.close(); refreshAlbum();
  };
}
function chooseAlbum(photoId) {
  const draw = () => sheetTop("Aggiungi a un album") + `<h1 class="h1">I miei album</h1>
    ${S.albums.length ? `<div class="choose">${S.albums.map(a => `<button type="button" data-choose="${a.id}" aria-pressed="${a.photoIds.includes(photoId)}">${esc(a.name)}</button>`).join("")}</div>` : `<p class="empty-note">Non hai ancora album. Creane uno: lo vedi solo tu.</p>`}
    <button type="button" class="btn line block" id="chNew">${I.plus}Nuovo album con questa foto</button>
    <button type="button" class="btn block" data-close>${I.check}Fatto</button>`;
  const s = sheet(draw(), { z: 50, onClose: () => {
    const el = V.el && !V.el.hidden && $("#vAlb", V.el), names = S.albums.filter(a => a.photoIds.includes(photoId)).map(a => a.name);
    if (el) el.textContent = names.length ? `Nei tuoi album: ${names.join(", ")}` : "";
  } });
  s.el.addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.choose) {
      const a = albumById(b.dataset.choose), on = !a.photoIds.includes(photoId);
      a.photoIds = on ? [...a.photoIds, photoId] : a.photoIds.filter(x => x !== photoId);
      b.setAttribute("aria-pressed", on); await saveAlbum(a);
      toast(on ? `Aggiunta a «${a.name}»` : `Tolta da «${a.name}»`, 1800);
    } else if (b.id === "chNew") { const a = await newAlbum(photoId); if (a) { s.set(draw()); toast(`Album «${a.name}» creato`, 1800); } }
  });
}

// ---------- Main render ----------
function render() {
  Voice.stop();
  if (!me) { renderWho(); return; }
  const app = $("#app");
  Band.unmount();
  if (S.tab !== "storia") { Tour.stop(); Focus.close(true); }
  app.innerHTML = S.tab === "racconta" ? renderRacconta() : S.tab === "foto" ? renderFoto() : S.tab === "mio" ? renderMio() : S.tab === "capitoli" ? renderCapitoli() : renderStoria();
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-current", t.dataset.tab === S.tab ? "page" : "false"));
  $("#tabs").hidden = false; tabInd();
  if (S.tab === "storia") Band.mount();
  if (Focus.el) { const mo = moments().find(m => m.key === Focus.mo.key); if (mo) { Focus.mo = mo; Focus.refresh(); } else Focus.close(true); }
  if (S.tab === "foto" && S.view === "deck") drawDeck();
  if (S.tab === "foto") wireFotoSearch();
  Reveal.scan();
  S.dirty = false;
}
// The light pill under the current tab slides to the one just tapped.
function tabInd() {
  const ind = $("#tabInd"), t = document.querySelector(`.tab[data-tab="${S.tab}"]`); if (!ind || !t) return;
  ind.style.width = t.offsetWidth + "px"; ind.style.transform = `translateX(${t.offsetLeft}px)`;
  if (!ind.dataset.on) requestAnimationFrame(() => { ind.dataset.on = 1; });
}
addEventListener("resize", () => { if (!$("#tabs").hidden) tabInd(); });
// Sections rise into place as they come on screen.
const Reveal = {
  io: null,
  scan() {
    const els = document.querySelectorAll(".rv:not(.in)");
    if (RM() || !("IntersectionObserver" in window)) { els.forEach(x => x.classList.add("in")); return; }
    if (!this.io) this.io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); this.io.unobserve(x.target); } }), { rootMargin: "0px 0px -6% 0px" });
    els.forEach(x => this.io.observe(x));
  },
};
function wireFotoSearch() {
  const inp = $("#q"); if (!inp) return;
  let t = null;
  const run = () => { S.q = inp.value; applyFotoSearch(); };
  inp.oninput = () => { clearTimeout(t); t = setTimeout(run, 160); };
  inp.onkeydown = e => { if (e.key === "Enter") inp.blur(); };
  attachDictation($("#qMic"), inp, run);
  if (S.q) applyFotoSearch();
}
const closeSheets = () => [...Sheets].reverse().forEach(x => x.close());
function go(tab) {
  if (tab === S.tab) { scrollTo({ top: 0, behavior: RM() ? "auto" : "smooth" }); return; }
  S.tab = tab; tabInd();
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-current", t.dataset.tab === S.tab ? "page" : "false"));
  const app = $("#app");
  if (RM()) { render(); scrollTo(0, 0); return; }
  Band.hold = true; app.classList.remove("enter"); app.classList.add("leave");
  clearTimeout(go.t);
  go.t = setTimeout(() => {
    Band.hold = false; app.classList.remove("leave"); render(); scrollTo(0, 0);
    void app.offsetWidth; app.classList.add("enter"); go.t = setTimeout(() => app.classList.remove("enter"), 1000);
  }, 220);
}
function renderWho() {
  Band.unmount(); Tour.stop(); Focus.close(true);
  $("#tabs").hidden = true;
  $("#app").innerHTML = `<header class="hero"><span class="mono mute">Quarant'anni insieme</span>
    <h1 class="h1" style="margin-top:18px">Chi<br><span class="serif">sei?</span></h1></header>
    <p class="lede">Tocca il tuo nome. Questo telefono se lo ricorderà.</p>
    <div class="who-grid">${PEOPLE.map(p => `<button type="button" class="who-card" data-me="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.desc || "")}</span></button>`).join("")}</div>`;
}

// ---------- Viewer ----------
const V = { list: [], key: "tutti", idx: 0, timer: null, el: null };
function openViewer(key, id, play) {
  if (Array.isArray(key)) { V.list = key; V.key = "custom"; }
  else { V.key = key || "tutti"; V.list = listFor(V.key); if (!V.list.length) { V.key = "tutti"; V.list = S.photos; } }
  V.idx = Math.max(0, V.list.findIndex(p => p.id === id));
  if (!V.el) { V.el = document.createElement("div"); V.el.className = "viewer"; V.el.setAttribute("role", "dialog"); V.el.setAttribute("aria-modal", "true"); document.body.append(V.el); }
  V.el.hidden = false; lock(1);
  setViewerPlay(!!play);
}
function drawViewer() {
  const p = V.list[V.idx]; if (!p) return;
  const meta = metaOf(p), mems = memsFor(p.id), ch = chOfDate(p.date), fav = S.favs.has(p.id);
  const speakText = [captionOf(p), ...mems.map(m => `${person(m.who).name} ricorda: ${m.text}`)].filter(Boolean).join(". ");
  const tags = tagsOf(p).slice(0, 8);
  const inAlbums = S.albums.filter(a => a.photoIds.includes(p.id)).map(a => a.name);
  stopVideos(V.el);
  V.el.innerHTML = `<div class="viewer-in">
    <div class="vtop"><span class="mono">${pad(V.idx + 1, 3)} / ${pad(V.list.length, 3)}</span>
      <div class="vrow"><button type="button" class="vbtn${fav ? " on" : ""}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="Preferita">${I.heart}</button>
      <button type="button" class="vbtn" data-valbum aria-label="Aggiungi a un mio album">${I.album}</button>
      <button type="button" class="vbtn" data-vclose aria-label="Chiudi">${I.x}</button></div></div>
    <div class="photo">${isVid(p) ? `<video src="${p.video}" poster="${p.full}" style="${arStyle(p)}" controls playsinline preload="auto"${loops(p) ? "" : " loop"} aria-label="Video del ${esc(fmtDate(p.date))}"></video>` : `<img src="${p.full}" alt="Foto del ${esc(fmtDate(p.date))}">`}</div>
    <div class="vnav">
      <button type="button" class="vbtn" data-vprev aria-label="Foto precedente">${I.left}</button>
      <button type="button" class="vbtn" data-vplay>${V.timer ? I.pause + "Pausa" : I.play + "Proiezione"}</button>
      <button type="button" class="vbtn" data-vnext aria-label="Foto successiva">${I.right}</button>
    </div>
    <div class="vmeta">
      <span class="mono" style="opacity:.75">${esc(fmtDate(p.date))}${placeOf(p) ? " · " + esc(placeOf(p)) : ""} · Capitolo ${chNum(ch.id)}</span>
      ${captionOf(p) ? `<div class="vcap">${esc(captionOf(p))}</div>` : ""}
      ${meta.people ? `<div>Con ${esc(meta.people)}</div>` : ""}
      ${mems.map(m => `<div class="vmem"><b>${esc(person(m.who).name)} ricorda</b>${esc(m.text)}</div>`).join("")}
      ${tags.length ? `<span class="mono" style="opacity:.55">${tags.map(esc).join(" · ")}</span>` : ""}
      <span class="mono" id="vAlb" style="opacity:.6">${inAlbums.length ? `Nei tuoi album: ${inAlbums.map(esc).join(", ")}` : ""}</span>
      ${rmNote(p)}
    </div>
    <div class="vnav">
      ${speakText ? listenBtn(speakText, "Ascolta", "vbtn") : ""}
      <button type="button" class="vbtn solid" data-vtell>${I.mic}Racconta questa foto</button>
      <button type="button" class="vbtn" data-vedit>${I.pen}Dettagli</button>
    </div></div>`;
  const nx = V.list[(V.idx + 1) % V.list.length]; if (nx) { const i = new Image(); i.src = nx.full; }
  // A video starts by itself, with its sound when the browser allows it (it was opened with a tap).
  const vd = $(".photo video", V.el);
  if (vd) { vd.muted = !!V.timer; vd.play().catch(() => { vd.muted = true; vd.play().catch(() => {}); }); }
}
function setViewerPlay(on) {
  clearInterval(V.timer); V.timer = null; V.el.classList.toggle("play", on);
  if (on) V.timer = setInterval(() => { const vd = $(".photo video", V.el); if (vd && !vd.paused && !vd.ended) return; if (!document.hidden && !Sheets.some(s => s.z > 40)) { V.idx = (V.idx + 1) % V.list.length; drawViewer(); } }, 7000);
  drawViewer();
}
function closeViewer() {
  if (!V.el || V.el.hidden) return;
  clearInterval(V.timer); V.timer = null; Voice.stop(); stopVideos(V.el); V.el.hidden = true; lock(-1);
  if (S.dirty) { if (albumSheet) refreshAlbum(); if (!Sheets.length && (S.tab === "mio" || (S.tab === "foto" && S.filter === "fav"))) render(); }
}
function vStep(d) { V.idx = (V.idx + d + V.list.length) % V.list.length; Voice.stop(); drawViewer(); }

// ---------- Interview ----------
const RULES = (p, ctx) => {
  const partner = p.partner ? person(p.partner).name : null;
  return `Sei un biografo affettuoso e paziente. Stai aiutando ${p.name}${partner ? ` (sposato/a con ${partner} dal ${C.married}, si conoscono dal ${C.met})` : ` (figlio della coppia, sposata dal ${C.married})`} a ricordare e raccontare un momento della loro vita per l'album dei 40 anni di matrimonio.
Parla in italiano semplice e caldo, dando del tu. Chi risponde è una persona anziana: frasi brevi, niente parole difficili.
Fai UNA sola domanda alla volta, al massimo 25 parole. Chiedi dettagli concreti: chi c'era, dove, quando, cosa si vedeva, odori, suoni, cosa avete detto, come vi sentivate. Prendi spunto dall'ultima risposta. Non ripetere domande già fatte. Non fare riassunti.
${ctx}
Rispondi solo con la domanda, senza virgolette.`;
};
const FALLBACK_Q = ["Dove eravate, e chi c'era con voi?", "Cosa stava succedendo in quel momento?", "Cosa ricordi in particolare? Un dettaglio, un suono, un profumo…", "Come ti sentivi?", "C'è qualcosa che ti fa sorridere ancora oggi, pensandoci?"];

function interviewContext(photos, seed, withImages) {
  const ch = chOfDate(photos[0].date);
  let ctx = `Il ricordo parte da ${photos.length > 1 ? `${photos.length} foto` : "una foto"} del capitolo "${ch.title}" (${ch.when}).${withImages ? " Ti allego le foto: guardale e fai domande su ciò che si vede." : ""}\n`;
  photos.forEach((x, i) => { const t = tagsOf(x).slice(0, 6); ctx += `Foto ${i + 1}: ${fmtDate(x.date)}${placeOf(x) ? `, ${placeOf(x)}` : ""}${captionOf(x) ? `. ${captionOf(x)}` : ""}${t.length ? ` (${t.join(", ")})` : ""}.\n`; });
  if (seed) ctx += `La prima domanda è stata: "${seed}".\n`;
  const others = S.memories.filter(m => m.who !== me && (memChapter(m) === ch.id || (m.photoIds || []).some(id => photos.some(x => x.id === id)))).slice(-3);
  if (others.length) ctx += `Altri familiari hanno già raccontato: ${others.map(m => `${person(m.who).name}: "${firstSentence(m.text)}"`).join(" ")}. Puoi chiedere se ricorda la stessa cosa in modo diverso, senza svelare troppo.\n`;
  return ctx;
}

function openInterview({ photoIds = [], seed } = {}) {
  const photos = photoIds.map(photoById).filter(Boolean);
  if (!photos.length) { openFinder({ seed }); return; }   // a memory always starts from a photo
  closeViewer(); Voice.stop();
  const p = person(me), ch = chOfDate(photos[0].date);
  const st = { turns: [], photos, imgs: null };
  const sh = sheet(sheetTop(`Capitolo ${chNum(ch.id)} · ${esc(ch.title)}`) + `
    <img class="cover" src="${photos[0].full}" alt="Foto del ${esc(fmtDate(photos[0].date))}" style="${arStyle(photos[0])}">
    ${photos.length > 1 ? `<div class="strip">${photos.slice(1).map(x => `<button type="button" tabindex="-1" style="${arStyle(x)}"><img src="${x.thumb}" alt=""></button>`).join("")}</div>` : ""}
    <span class="mono mute">${esc(fmtDate(photos[0].date))}${placeOf(photos[0]) ? " · " + esc(placeOf(photos[0])) : ""}</span>
    <div class="thread" id="thread"></div>
    <div class="answer" id="answerBox">
      <textarea id="answer" placeholder="Scrivi qui, oppure tocca il microfono e parla"></textarea>
      <div class="row"><button type="button" class="mic" id="mic" aria-label="Parla">${I.mic}</button>
        <button type="button" class="btn grow" id="send">${I.send}Rispondi</button></div>
      <p class="hint">${SR ? "Tocca il microfono nero e parla. Toccalo di nuovo quando hai finito." : "Per parlare invece di scrivere, tocca il microfono sulla tastiera."}</p>
      <button type="button" class="btn line block" id="finish" hidden>${I.check}Ho finito, salva il ricordo</button>
    </div>
    <div id="review" hidden></div>`, { z: 45, onClose: () => { if (!st.saved && (S.tab === "racconta" || S.tab === "mio")) render(); } });
  const el = sh.el, thread = $("#thread", el), area = $("#answer", el);
  attachDictation($("#mic", el), area);

  const addQ = q => {
    thread.querySelectorAll(".q").forEach(x => x.classList.add("old"));
    const d = document.createElement("div"); d.className = "q"; d.textContent = q; thread.append(d);
    st.turns.push({ role: "assistant", content: q });
    area.focus({ preventScroll: true });
  };
  const thinking = on => { let t = $(".thinking", thread); if (on && !t) { t = document.createElement("div"); t.className = "thinking"; t.textContent = "Ci penso un attimo…"; thread.append(t); } if (!on && t) t.remove(); $("#send", el).disabled = on; };
  const answers = () => st.turns.filter(t => t.role === "user").length;
  const images = async () => {
    if (!AI.imgMax) return undefined;
    if (!st.imgs) st.imgs = (await Promise.all(st.photos.slice(0, Math.min(3, AI.imgMax)).map(aiBlob))).filter(Boolean);
    return st.imgs.length ? st.imgs : undefined;
  };

  async function ask() {
    thinking(true);
    let q = null;
    if (AI.ready) {
      try {
        const turns = [{ role: "user", content: RULES(p, interviewContext(st.photos, seed, !!AI.imgMax)) + (st.turns.length ? "" : "\nFai la prima domanda.") }];
        for (const t of st.turns) turns.push(t);
        if (turns[turns.length - 1].role !== "user") turns.push({ role: "user", content: "Fai la prossima domanda." });
        q = await AI.text(turns, { images: await images() });
      } catch (e) { if (e && e.code === "not_granted") AI.ready = false; }
    }
    if (sh.closed) return;
    if (!q) q = FALLBACK_Q[Math.min(answers(), FALLBACK_Q.length - 1)];
    thinking(false); addQ(q);
  }

  $("#send", el).onclick = async () => {
    const a = area.value.trim(); if (!a) { area.focus(); return; }
    const d = document.createElement("div"); d.className = "a"; d.textContent = a; thread.append(d);
    st.turns.push({ role: "user", content: a }); area.value = "";
    if (answers() >= 2) $("#finish", el).hidden = false;
    if (answers() >= 6) { finish(); return; }
    await ask();
  };

  async function finish() {
    if (!answers()) { toast("Rispondi almeno a una domanda"); return; }
    $("#answerBox", el).hidden = true;
    thinking(true);
    const conv = st.turns.map(t => (t.role === "assistant" ? "Domanda: " : `${p.name}: `) + t.content).join("\n");
    let draft = null;
    if (AI.ready) {
      try {
        draft = await AI.json(`Questa è un'intervista a ${p.name} per l'album dei 40 anni di matrimonio (si conoscono dal ${C.met}, sposati nel ${C.married}).
Il ricordo parte da ${st.photos.length > 1 ? `${st.photos.length} foto` : "una foto"}: ${st.photos.map(x => `${fmtDate(x.date)}${placeOf(x) ? ", " + placeOf(x) : ""}${captionOf(x) ? " (" + captionOf(x) + ")" : ""}`).join("; ")}. Capitolo: ${ch.title}.
${conv}

Scrivi il ricordo in prima persona con le parole di ${p.name}, fedele a ciò che ha detto, senza inventare fatti. Massimo 160 parole, italiano semplice e caldo.
Poi scegli le parole che serviranno a ritrovare queste foto in futuro: luoghi, persone nominate, momenti, oggetti. Tutto in minuscolo.
JSON: {"title": "titolo breve", "year": anno come numero o null, "place": "luogo o stringa vuota", "people": "persone presenti o stringa vuota", "text": "il ricordo", "quote": "la frase più bella detta da ${p.name}, max 20 parole", "tags": ["da 3 a 8 parole"]}`);
      } catch {}
    }
    if (sh.closed) return;
    if (!draft) draft = { title: "", year: +st.photos[0].date.slice(0, 4), place: placeOf(st.photos[0]), people: "", text: st.turns.filter(t => t.role === "user").map(t => t.content).join(" "), quote: "", tags: [] };
    thinking(false);
    const rv = $("#review", el); rv.hidden = false;
    rv.innerHTML = `<div style="display:grid;gap:16px;border-top:1px solid var(--ink);padding-top:18px">
      <span class="mono mute">Ecco il tuo ricordo. Puoi correggerlo.</span>
      <div class="field"><label for="rTitle">Titolo</label><input id="rTitle" value="${esc(draft.title)}"></div>
      <div class="two"><div class="field"><label for="rYear">Anno</label><input id="rYear" inputmode="numeric" value="${esc(draft.year || st.photos[0].date.slice(0, 4))}"></div>
        <div class="field"><label for="rPlace">Luogo</label><input id="rPlace" value="${esc(draft.place)}"></div></div>
      <div class="field"><label for="rPeople">Chi c'era</label><input id="rPeople" value="${esc(draft.people)}"></div>
      <div class="field"><label for="rText">Il ricordo</label><textarea id="rText">${esc(draft.text)}</textarea></div>
      <div class="field"><label for="rTags">Parole per ritrovare le foto</label><input id="rTags" value="${esc((Array.isArray(draft.tags) ? draft.tags : []).join(", "))}" placeholder="mare, zia Carla, compleanno"></div>
      <p class="hint" style="margin-top:-8px">Le ha scelte l'AI da quello che hai raccontato. Servono per cercare le foto.</p>
      <div class="row"><button type="button" class="btn line" data-say-from="#rText">${I.speaker}Rileggimelo</button><button type="button" class="btn grow" id="save">${I.check}Salva nell'album</button></div>
    </div>`;
    rv.scrollIntoView({ behavior: "smooth", block: "start" });
    $("#save", rv).onclick = async () => {
      const year = parseInt($("#rYear", rv).value, 10) || +st.photos[0].date.slice(0, 4);
      const chapter = chOfDate(st.photos[0].date).id;
      const tags = [...new Set($("#rTags", rv).value.split(",").map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
      const m = { id: uid("m"), who: me, created: Date.now(), title: $("#rTitle", rv).value.trim(), year, place: $("#rPlace", rv).value.trim(), people: $("#rPeople", rv).value.trim(), text: $("#rText", rv).value.trim(), quote: draft.quote || "", chapter, photoIds: st.photos.map(x => x.id), tags, qa: st.turns };
      if (!m.text) { toast("Il ricordo è vuoto"); return; }
      try { await Store.saveMemory(m); } catch { toast("Non sono riuscito a salvare. Controlla la connessione e riprova."); return; }
      S.memories.push(m); st.saved = true;
      // What was told becomes searchable on the photos themselves.
      for (const x of st.photos) {
        const cur = metaOf(x), upd = { tags: [...new Set([...(cur.tags || []), ...tags])].slice(0, 24) };
        if (!cur.place && m.place) upd.place = m.place;
        if (!cur.people && m.people) upd.people = m.people;
        S.meta[x.id] = { ...(S.meta[x.id] || {}), ...upd };
        Store.savePhotoMeta(x.id, upd).catch(() => {});
      }
      bump();
      sh.close(); closeSheets(); closeViewer();
      const mo = moments().find(x => x.mems && x.mems.includes(m));
      M.first = mo ? mo.key : null; Band.x = 0;
      S.tab = "storia"; render(); scrollTo(0, 0);
      if (mo) Focus.open(mo, { state: "story" });
      toast("Ricordo salvato. Eccolo nella prima pagina, accanto alle sue foto.", 4200);
      weave(chapter);   // the chapter's story, in the background
    };
  }
  $("#finish", el).onclick = finish;

  if (seed) addQ(seed); else ask();
}

// ---------- Weaving the shared story ----------
async function weave(chId) {
  if (!AI.ready || S.weaving.has(chId)) return;
  const c = chById(chId), ms = memsIn(chId); if (!ms.length) return;
  S.weaving.add(chId); refreshChapter(chId);
  const ps = photosIn(chId).map(p => { const m = metaOf(p); return m.caption || m.place ? `- ${fmtDate(p.date)}${m.place ? ", " + m.place : ""}${m.caption ? ": " + m.caption : ""}` : null; }).filter(Boolean).slice(0, 20);
  try {
    const out = await AI.json(`Stai scrivendo l'album dei 40 anni di matrimonio di ${coupleReal()} (si conoscono dal ${C.met}, sposati nel ${C.married}).
Capitolo: "${c.title}" (${c.when}). ${photosIn(chId).length} foto in questo capitolo.
${ps.length ? "Didascalie delle foto:\n" + ps.join("\n") + "\n" : ""}
Ricordi raccontati dai familiari, ciascuno per conto suo:
${ms.map(m => `[${realName(person(m.who))}${m.year ? ", " + m.year : ""}${m.place ? ", " + m.place : ""}] ${m.text}`).join("\n")}

Scrivi il racconto di questo capitolo unendo i ricordi in una storia coerente e commovente, in terza persona, chiamandoli ${PEOPLE.map(realName).join(", ")}. Quando i ricordi si completano a vicenda, intrecciali. Quando divergono, raccontalo con tenerezza ("${realName(PEOPLE[0])} ricorda…, mentre per ${realName(PEOPLE[1])}…"). Non inventare fatti, nomi o luoghi che non compaiono nei ricordi. 90-220 parole, 1-3 paragrafi separati da una riga vuota, italiano semplice ed elegante.
Poi elenca fino a 3 dettagli che solo una persona ha ricordato e che l'altra potrebbe aver dimenticato.
JSON: {"story": "...", "details": [{"who": "id della persona tra ${PEOPLE.map(p => p.id).join(", ")}", "text": "il dettaglio in una frase"}]}`);
    if (out && out.story) {
      const s = { story: out.story.trim(), details: (out.details || []).filter(d => d && d.text && PEOPLE.some(p => p.id === d.who)).slice(0, 3), count: ms.length, updated: Date.now() };
      await Store.saveStory(chId, s); S.stories[chId] = s;
      if (!Focus.el) toast(`Il racconto «${c.title}» è pronto`);
    }
  } catch (e) { if (e && e.code === "not_granted") AI.ready = false; else toast("Non sono riuscito a scrivere il racconto. Riprova più tardi."); }
  S.weaving.delete(chId); refreshChapter(chId);
  if (S.tab === "capitoli" && !Sheets.length) render();
}

// ---------- Memory detail ----------
function openMemory(id, z) {
  const m = S.memories.find(x => x.id === id); if (!m) return;
  const photos = (m.photoIds || []).map(photoById).filter(Boolean);
  const s = sheet(sheetTop(esc(chById(memChapter(m))?.title || "Un ricordo")) + `
    ${photos[0] ? `<img class="cover" src="${photos[0].full}" alt="" style="${arStyle(photos[0])}">` : ""}
    <h1 class="h1" style="font-size:clamp(36px,8vw,72px)">${esc(m.title || "Un ricordo")}</h1>
    <div class="meta-row" style="margin-top:0">${[m.year, m.place, m.people && "con " + m.people].filter(Boolean).map(x => `<span class="mono">${esc(x)}</span>`).join("")}</div>
    <div class="story">${esc(m.text).split(/\n+/).map(x => `<p>${x}</p>`).join("")}</div>
    <div class="row">${listenBtn(m.text, "Ascolta", "btn")}<button type="button" class="link" data-del>Elimina</button></div>`, { z });
  const del = $("[data-del]", s.el);
  del.onclick = async () => {
    if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "Tocca di nuovo per eliminare"; return; }
    try { await Store.deleteMemory(m.id); } catch { toast("Non sono riuscito a eliminarlo. Riprova."); return; }
    S.memories = S.memories.filter(x => x.id !== m.id); s.close(); render(); toast("Ricordo eliminato");
  };
}

// ---------- Photo details editor ----------
function openDetails(p) {
  const meta = metaOf(p), [py, pm] = p.date.split("-").map(Number);
  // A print photographed with the phone carries the day it was photographed: its month is not taken as known.
  const fresh = !!p.created && Math.abs(Date.parse(dkey(p.date)) - p.created) < 3 * 864e5;
  const m0 = fresh ? 0 : pm || 0;
  const s = sheet(sheetTop("Dettagli della foto") + `
    <img class="cover" src="${p.full}" alt="" style="${arStyle(p)};--covh:40vh">
    <div class="field"><label for="dCap">Didascalia</label><input id="dCap" value="${esc(meta.caption || "")}" placeholder="Il compleanno di…"></div>
    <div class="two"><div class="field"><label for="dPlace">Luogo</label><input id="dPlace" value="${esc(meta.place || "")}" placeholder="Città, posto"></div>
      <div class="field"><label for="dPeople">Chi c'è</label><input id="dPeople" value="${esc(meta.people || "")}"></div></div>
    <div class="two"><div class="field"><label for="dYear">Anno</label><input id="dYear" inputmode="numeric" maxlength="4" value="${py}"></div>
      <div class="field"><label for="dMonth">Mese</label>${monthSelect("dMonth", m0)}</div></div>
    ${fresh ? `<p class="hint" style="margin-top:-6px">Se è una foto stampata, scrivi l'anno in cui è stata scattata davvero.</p>` : ""}
    <div class="field"><label for="dTags">Parole per ritrovarla</label><input id="dTags" value="${esc((meta.tags || []).join(", "))}" placeholder="mare, compleanno, zia Carla"></div>
    ${tagsOf(p).length ? `<p class="hint">L'AI ci vede: ${esc([...((p.ai && p.ai.t) || []), ...(meta.aiTags || [])].join(", ") || "—")}${captionOf(p) && !meta.caption ? `. «${esc(captionOf(p))}»` : ""}</p>` : ""}
    ${placeOf(p) && !meta.place ? `<p class="hint">Luogo dalla foto: ${esc(placeOf(p))}</p>` : ""}
    <button type="button" class="btn block" data-save>${I.check}Salva</button>
    <div class="rmbox" id="rmBox"></div>`, { z: 50 });
  $("[data-save]", s.el).onclick = async () => {
    const yEl = $("#dYear", s.el), y = parseInt(yEl.value, 10), mo = +$("#dMonth", s.el).value;
    if (!(y >= 1900 && y <= THIS_YEAR)) { toast(`Scrivi un anno tra il 1900 e il ${THIS_YEAR}`); yEl.focus(); return; }
    const m = { caption: $("#dCap", s.el).value.trim(), place: $("#dPlace", s.el).value.trim(), people: $("#dPeople", s.el).value.trim(), tags: [...new Set($("#dTags", s.el).value.split(",").map(x => x.trim().toLowerCase()).filter(Boolean))], by: me };
    if (y !== py || mo !== m0) m.date = `${y}-${mo ? pad(mo) : "00"}-00`;
    try { await Store.savePhotoMeta(p.id, m); } catch { toast("Non sono riuscito a salvare. Riprova."); return; }
    S.meta[p.id] = { ...(S.meta[p.id] || {}), ...m };
    if (m.date) { p.date = m.date; S.photos.sort(byDate); const i = V.list.indexOf(p); if (i >= 0) V.idx = i; }
    bump(); s.close(); drawViewer(); toast(m.date ? `Dettagli salvati. Ora la foto è nel ${y}.` : "Dettagli salvati");
    if (m.date) { render(); if (chapterSheet) refreshChapter(chapterSheet.id); }
  };
  const rmDraw = () => {
    const v = votesOf(p.id), box = $("#rmBox", s.el);
    if (v.includes(me)) {
      box.innerHTML = `<p class="hint">Hai chiesto di toglierla dall'album.</p><button type="button" class="link" id="rmUndo">Annulla la richiesta</button>`;
      $("#rmUndo", s.el).onclick = async () => { await undoRm(p); s.close(); };
      return;
    }
    box.innerHTML = `<button type="button" class="link" id="rmAsk">Togli questa foto dall'album</button>`;
    $("#rmAsk", s.el).onclick = () => {
      const after = [...new Set([...v, me])], wait = COUPLE.filter(w => !after.includes(w)), pl = wait.length > 1;
      box.innerHTML = `<p>${goneWith(p, after)
        ? `${p.by === me ? "L'hai aggiunta tu, quindi" : `${esc(nameList(v))} ${v.length > 1 ? "l'hanno" : "l'ha"} già chiesto, quindi`} sparisce subito. Se cambiate idea, la ritrovate nella pagina Foto, in «Foto tolte».`
        : `Resta nell'album finché anche ${esc(nameList(wait))} non ${pl ? "dicono" : "dice"} di sì. ${pl ? "Vedranno" : "Vedrà"} la richiesta quando ${pl ? "aprono" : "apre"} l'album.`}</p>
        <div class="row"><button type="button" class="btn" id="rmOk">Sì, toglila</button><button type="button" class="btn line" id="rmNo">No</button></div>`;
      $("#rmOk", s.el).onclick = async () => { if (await askRemove(p)) s.close(); };
      $("#rmNo", s.el).onclick = rmDraw;
    };
  };
  rmDraw();
}

// ---------- Taking a photo out of the album ----------
function rmNote(p) {
  const v = votesOf(p.id); if (!v.length) return "";
  const mine = v.includes(me), wait = COUPLE.filter(w => !v.includes(w)), pl = wait.length > 1;
  const msg = mine ? `Hai chiesto di toglierla dall'album.${wait.length ? ` Sparisce quando anche ${nameList(wait)} ${pl ? "diranno" : "dirà"} di sì.` : ""}`
    : `${nameList(v)} ${v.length > 1 ? "vorrebbero" : "vorrebbe"} toglierla dall'album. Sei d'accordo?`;
  return `<div class="vrm"><span>${esc(msg)}</span><div class="row">${mine
    ? `<button type="button" class="vbtn" data-rmundo="${p.id}">Annulla la richiesta</button>`
    : `<button type="button" class="vbtn solid" data-rmyes="${p.id}">Sì, toglila</button><button type="button" class="vbtn" data-rmno="${p.id}">No, teniamola</button>`}</div></div>`;
}
function rmNotice() {
  const ask = pendingRm().filter(p => !votesOf(p.id).includes(me)); if (!ask.length) return "";
  const who = [...new Set(ask.flatMap(p => votesOf(p.id)))];
  return `<button type="button" class="notice" data-rmgo="1"><span class="mono">Da decidere</span><span>${esc(nameList(who))} ${who.length > 1 ? "vorrebbero" : "vorrebbe"} togliere ${ask.length > 1 ? `${ask.length} foto` : "una foto"} dall'album.</span><span class="link">Guarda e decidi ${I.arrow}</span></button>`;
}
async function askRemove(p) {
  const v = [...new Set([...votesOf(p.id), me])];
  try { await Store.setRemoval(me, p.id, true); } catch { toast("Non sono riuscito a salvare. Riprova."); return false; }
  S.rm[p.id] = v;
  if (goneWith(p, v)) { S.photos = S.photos.filter(x => x !== p); S.gone = [...S.gone, p].sort(byDate); toast("Foto tolta dall'album. Si può rimettere dalla pagina Foto.", 3500); }
  else { const wait = COUPLE.filter(w => !v.includes(w)), pl = wait.length > 1; toast(`Fatto. ${nameList(wait)} ${pl ? "vedranno" : "vedrà"} la richiesta quando ${pl ? "aprono" : "apre"} l'album.`, 3500); }
  afterRm(p);
  return true;
}
// "No, teniamola" and "Rimetti" both clear every request on the photo.
async function keepPhoto(p) {
  try { await Store.clearRemovals(p.id); } catch { toast("Non sono riuscito a salvare. Riprova."); return; }
  delete S.rm[p.id];
  if (S.gone.includes(p)) { S.gone = S.gone.filter(x => x !== p); S.photos = [...S.photos, p].sort(byDate); toast("Foto rimessa nell'album"); }
  else toast("La foto resta nell'album");
  afterRm(p);
}
async function undoRm(p) {
  try { await Store.setRemoval(me, p.id, false); } catch { toast("Non sono riuscito a salvare. Riprova."); return; }
  const v = votesOf(p.id).filter(w => w !== me); if (v.length) S.rm[p.id] = v; else delete S.rm[p.id];
  toast("Richiesta annullata"); afterRm(p);
}
function afterRm(p) {
  bump(); S.dirty = true;
  if (V.el && !V.el.hidden) {
    if (S.gone.includes(p)) { V.list = V.list.filter(x => x !== p); if (!V.list.length) closeViewer(); else { V.idx = Math.min(V.idx, V.list.length - 1); drawViewer(); } }
    else drawViewer();
  }
  if (chapterSheet) refreshChapter(chapterSheet.id);
  if (albumSheet) refreshAlbum();
  refreshGone();
  const y = scrollY; render(); scrollTo(0, y);
}
let goneSheet = null;
const goneHTML = () => sheetTop("Foto tolte dall'album") + `<h1 class="h1">Foto<br><span class="serif">tolte</span></h1>
  <p class="lede">Non si vedono più nell'album. Tocca «Rimetti» per riaverne una.</p>
  ${S.gone.length ? `<div class="gone-list">${S.gone.map(p => `<div class="gone"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}" style="${arStyle(p)}"><span class="mono mute">${esc(fmtDate(p.date))}</span><button type="button" class="btn line" data-rmback="${p.id}">${I.plus}Rimetti</button></div>`).join("")}</div>`
    : `<p class="empty-note">Nessuna foto tolta.</p>`}`;
function openGone() { goneSheet = sheet(goneHTML(), { onClose: () => { goneSheet = null; } }); }
function refreshGone() { if (goneSheet) goneSheet.set(goneHTML()); }

// ---------- Add photos ----------
// Photos of any year. A print photographed with the phone carries today's date, so the real year is asked.
function openAddPhotos({ from, to, tell, files, seed } = {}) {
  const span = from ? [from, to || from] : null;
  const s = sheet(sheetTop("Aggiungi foto") + `
    <h1 class="h1">Nuove<br><span class="serif">foto</span></h1>
    <p class="lede">${span ? `Foto ${yearsTxt(span[0], span[1])}? ` : ""}Anche i video, e le foto stampate: fotografale col telefono e aggiungile qui.${tell ? " Poi mi racconti cosa ricordi." : ""}</p>
    <label class="btn block" for="files" style="position:relative">${I.plus}Scegli foto e video<input type="file" id="files" accept="image/*,video/*" multiple style="position:absolute;opacity:0;width:1px;height:1px"></label>
    <p class="hint">Dal telefono o dal computer.${matchMedia("(hover: hover) and (pointer: fine)").matches ? " Dal computer puoi anche trascinarle qui." : ""}</p>
    <div id="chosen"></div>`, { onClose: () => { if (!s.handoff) render(); } });
  const el = s.el;
  // On a computer the photos can also be dragged onto the page.
  const isFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  el.addEventListener("dragover", e => { if (isFiles(e)) { e.preventDefault(); el.classList.add("drop"); } });
  el.addEventListener("dragleave", e => { if (!e.relatedTarget || !el.contains(e.relatedTarget)) el.classList.remove("drop"); });
  el.addEventListener("drop", e => { if (!isFiles(e)) return; e.preventDefault(); el.classList.remove("drop"); take([...e.dataTransfer.files].filter(isMediaFile)); });
  $("#files", el).onchange = e => take([...e.target.files]);
  const take = async files => {
    if (!files.length) return;
    const box = $("#chosen", el); box.innerHTML = `<p class="hint">Preparo ${quanti(files.length, files.filter(isVideoFile).length)}…</p>`;
    const items = [];
    let big = 0;
    for (const f of files) {
      try {
        const named = (f.name.match(/(19|20)\d\d-[01]\d-[0-3]\d/) || [])[0] || null;
        if (isVideoFile(f)) {
          if (f.size > VIDEO_MAX) { big++; continue; }
          const [fr, info] = await Promise.all([videoFrame(f), videoInfo(f)]);
          const [full, th] = await Promise.all([resizeTo(fr.cv, 1600, .82), resizeTo(fr.cv, 480, .72)]);
          items.push({ full, thumbUrl: await blobToDataURL(th), date: named || info.date, gps: info.gps, hint: info.hint, ar: +fr.ar.toFixed(3), video: f, dur: +fr.dur.toFixed(2) });
          continue;
        }
        const bmp = await loadBitmap(f);
        const [full, th, info] = await Promise.all([resizeTo(bmp, 1600, .82), resizeTo(bmp, 480, .72), exifInfo(f)]);
        items.push({ full, thumbUrl: await blobToDataURL(th), date: (info && info.date) || named, gps: info && info.gps, hint: info && info.hint, ar: +(bmp.width / bmp.height).toFixed(3) });
        if (items.length % 10 === 0) box.innerHTML = `<p class="hint">Preparo le foto: ${items.length} di ${files.length}…</p>`;
      } catch {}
    }
    if (big) toast(big > 1 ? `${big} video sono troppo grandi (più di 50 MB)` : "Un video è troppo grande (più di 50 MB)", 5000);
    if (!items.length) { box.innerHTML = `<p class="hint">${big && big === files.length ? "Questi video sono troppo grandi. Accorciali sul telefono e riprova." : "Non sono riuscito ad aprire queste foto. Prova con altre."}</p>`; return; }
    // Which photos need the year typed: no date at all, a date outside the years they were added for,
    // or (when no years were given) a photo taken just now, which may be a print photographed today.
    items.forEach(i => {
      const y = i.date ? +i.date.slice(0, 4) : 0;
      i.fresh = !!i.date && Math.abs(Date.parse(i.date) - Date.now()) < 3 * 864e5;
      i.ask = !i.date || (span ? y < span[0] || y > span[1] : i.fresh);
    });
    const asked = items.filter(i => i.ask), undated = items.filter(i => !i.date).length, fresh = asked.filter(i => i.date).length;
    const need = undated > 0 || (!!span && asked.length > 0);
    const yv = span && span[0] === span[1] ? span[0] : "";
    const fields = `<div class="two"><div class="field"><label for="aYear">Anno</label><input id="aYear" inputmode="numeric" maxlength="4" value="${yv}" placeholder="es. ${span ? span[0] : 1992}"></div>
      <div class="field"><label for="aMonth">Mese</label>${monthSelect("aMonth", 0)}</div></div>`;
    const some = (k, one, many) => items.length === 1 ? `Questa foto ${one}` : k === items.length ? `Queste foto ${many}` : `${k} di queste foto ${k > 1 ? many : one}`;
    const msg = span ? `Di che anno ${asked.length > 1 ? "sono queste foto" : "è questa foto"}? Se non lo sai di preciso, va bene anche più o meno.${asked.length < items.length ? ` Le altre ${items.length - asked.length} hanno già la loro data.` : ""}`
      : undated && fresh ? "Alcune foto non hanno la data, altre sono di oggi. Scrivi l'anno vero, anche più o meno."
      : undated ? `${some(undated, "non ha la data.", "non hanno la data.")} Scrivi l'anno, anche più o meno.`
      : `${some(fresh, "è stata scattata oggi.", "sono state scattate oggi.")} ${fresh > 1 ? "Se sono foto stampate" : "Se è una foto stampata"}, scrivi l'anno vero. Altrimenti lascia vuoto.`;
    const ds = items.map(i => i.date).sort((a, b) => dkey(a) < dkey(b) ? -1 : 1), d0 = fmtDate(ds[0]), d1 = fmtDate(ds[ds.length - 1]);
    const dateBlock = asked.length ? `<div class="datebox"><p>${esc(msg)}</p>${fields}</div>`
      : `<div class="datebox"><p>Data: ${esc(d0 === d1 ? d0 : `dal ${d0} al ${d1}`)}</p><button type="button" class="link" id="aRedate">Cambia la data</button><div id="aDateF" hidden>${fields}</div></div>`;
    const main = tell ? ["aTell", `${I.mic}Aggiungi e racconta`] : ["aSave", `${I.check}Aggiungi all'album`];
    const second = tell ? ["aSave", `${I.check}Solo aggiungi`] : ["aTell", `${I.mic}Aggiungi e racconta la storia`];
    box.innerHTML = `<div class="pick" style="margin-bottom:16px">${items.slice(0, 9).map(i => `<button type="button" tabindex="-1" style="${arStyle(i)}"><img src="${i.thumbUrl}" alt=""></button>`).join("")}</div>
      <p class="hint">${items.length > 1 ? `${quanti(items.length, items.filter(i => i.video).length)}.` : ""}${files.length > items.length ? ` ${files.length - items.length} non si sono aperte.` : ""}${AI.ready && AI.imgMax ? (items.length > 1 ? " Dopo averle aggiunte, l'AI le guarda e le mette nelle raccolte giuste." : " Dopo averla aggiunta, l'AI la guarda e la mette nelle raccolte giuste.") : ""}</p>
      <div style="display:grid;gap:16px;margin-top:14px">
      ${dateBlock}
      <div class="field"><label for="aPlace">Luogo</label><input id="aPlace" placeholder="Dove sono state scattate"></div>
      <div class="field"><label for="aPeople">Chi c'è</label><input id="aPeople"></div>
      <div class="field"><label for="aCap">Una frase per ricordarle</label><input id="aCap" placeholder="La gita al lago con gli amici"></div>
      <button type="button" class="btn block" id="${main[0]}">${main[1]}</button>
      <button type="button" class="btn line block" id="${second[0]}">${second[1]}</button></div>`;
    const re = $("#aRedate", el);
    if (re) re.onclick = () => { re.hidden = true; $("#aDateF", el).hidden = false; $("#aYear", el).focus(); };
    const save = async () => {
      const yEl = $("#aYear", el), override = !!re && !$("#aDateF", el).hidden;
      const typed = yEl.value.trim(), y = parseInt(typed, 10), mo = +$("#aMonth", el).value;
      if ((need || override) && !typed) { toast("Scrivi l'anno delle foto"); yEl.focus(); return null; }
      if (typed && !(y >= 1900 && y <= THIS_YEAR)) { toast(`Scrivi un anno tra il 1900 e il ${THIS_YEAR}`); yEl.focus(); return null; }
      const when = typed ? `${y}-${mo ? pad(mo) : "00"}-00` : null;
      const meta = { place: $("#aPlace", el).value.trim(), people: $("#aPeople", el).value.trim(), caption: $("#aCap", el).value.trim(), by: me };
      const added = [], btns = el.querySelectorAll("#aSave, #aTell"), label = $(`#${main[0]}`, el);
      btns.forEach(b => b.disabled = true);
      for (const [k, i] of items.entries()) {
        label.textContent = `Salvo ${k + 1} di ${items.length}…`;
        const h = i.hint, seen = h ? { aiCaption: String(h.c || ""), aiTags: (Array.isArray(h.t) ? h.t : []).map(String), aiPlace: String(h.pl || ""), aiArea: String(h.a || ""), aiGroup: String(h.g || "") } : {};
        try { added.push(await Store.addPhoto({ id: uid("u"), date: (when && (override || i.ask)) ? when : i.date, ar: i.ar, thumb: i.thumbUrl, blob: i.full, gps: i.gps, ...(i.video ? { videoBlob: i.video, dur: i.dur } : {}), meta: { ...meta, ...seen }, by: me, created: Date.now() })); }
        catch { toast("Una foto non è stata salvata. Controlla la connessione."); }
      }
      btns.forEach(b => b.disabled = false);
      S.photos = [...S.photos, ...added].sort(byDate);
      bump();
      aiTagPhotos(added.filter(p => !(metaOf(p).aiTags || []).length));   // in the background: captions, keywords and places for search and collections
      return added;
    };
    $("#aSave", el).onclick = async () => { const a = await save(); if (a) { const v = a.filter(x => x.video).length; toast(a.length === 1 ? (v ? "Video aggiunto" : "Foto aggiunta") : `${quanti(a.length, v)} ${v ? "aggiunti" : "aggiunte"}`); s.close(); } };
    $("#aTell", el).onclick = async () => { const a = await save(); if (a && a.length) { s.handoff = true; s.close(); render(); openInterview({ photoIds: a.slice(0, 6).map(x => x.id), seed }); } };
  };
  if (files && files.length) take(files);
}

// ---------- The AI looks at new photos: caption, keywords and place, so search and collections work ----------
let tagging = false;
async function aiTagPhotos(list) {
  if (!AI.ready || !AI.imgMax || !list.length || tagging) return 0;
  tagging = true; let done = 0;
  const per = Math.max(1, Math.min(6, AI.imgMax));
  try {
    for (let i = 0; i < list.length; i += per) {
      const batch = list.slice(i, i + per), imgs = await Promise.all(batch.map(aiBlob));
      const ok = batch.filter((_, k) => imgs[k]), blobs = imgs.filter(Boolean);
      if (!blobs.length) continue;
      let out = null;
      try {
        out = await AI.json(`Sono ${ok.length} foto di un album di famiglia: una coppia che si conosce dal ${C.met} e si è sposata nel ${C.married}. Per ogni foto, nell'ordine in cui le vedi, scrivi:
- "c": una didascalia in italiano di 2-7 parole, descrittiva e calda, senza nomi di persone
- "t": da 3 a 6 parole chiave in minuscolo per ritrovarla: ambiente o luogo (mare, montagna, casa, giardino, città…), momento (pranzo, natale, festa, viaggio…), chi c'è (coppia, famiglia, amici, ritratto), oggetti
- "pl": la località, solo se è riconoscibile con sicurezza o si ricava dalle coordinate; altrimenti ""
${ok.map((p, k) => `Foto ${k + 1}: ${fmtDate(p.date)}${p.gps ? `, coordinate GPS ${p.gps.lat}, ${p.gps.lon}` : ""}`).join("\n")}
JSON: {"foto": [{"c": "...", "t": ["..."], "pl": "..."}]}`, { images: blobs });
      } catch (e) { if (e && (e.code === "not_granted" || e.code === "images_unavailable")) break; continue; }
      ((out && out.foto) || []).forEach((r, k) => {
        const p = ok[k]; if (!p || !r) return;
        const upd = { aiCaption: String(r.c || "").slice(0, 80), aiTags: (Array.isArray(r.t) ? r.t : []).map(x => String(x).toLowerCase().trim()).filter(Boolean).slice(0, 8), aiPlace: String(r.pl || "").slice(0, 60) };
        S.meta[p.id] = { ...(S.meta[p.id] || {}), ...upd }; done++;
        Store.savePhotoMeta(p.id, upd).catch(() => {});
      });
      bump();
      if (list.length > per) toast(`L'AI ha guardato ${Math.min(i + per, list.length)} foto su ${list.length}`, 1600);
    }
  } finally { tagging = false; }
  if (done && S.tab === "foto" && !Sheets.length) render();
  return done;
}

// ---------- Choosing the photos a memory starts from ----------
function openFinder({ preset = "tutti", seed, title } = {}) {
  const sel = []; let filt = listFor(preset).length ? preset : "tutti", aiIds = null;
  const s = sheet(sheetTop(esc(title || "Un nuovo ricordo")) + `
    ${seed ? `<q class="seed">${esc(seed)}</q><p class="lede" style="margin:0">Scegli la foto che ti fa pensare a questo.</p>` : `<h1 class="h1">Quale<br><span class="serif">foto?</span></h1>`}
    ${searchBox("fq", "")}
    <div class="row" id="faiRow" hidden><button type="button" class="btn line" id="fai">${I.spark}Chiedi all'AI di trovarle</button></div>
    <p class="hint" id="fhint">Scrivi o di' cosa cerchi: un luogo, un anno, una festa, chi c'era. Puoi scegliere più foto per lo stesso ricordo.</p>
    <button type="button" class="link" id="fUp" style="justify-self:start">${I.plus}Oppure carica una foto nuova</button>
    <div class="chips" id="fchips">${chipKeys(filt).map(([k, t]) => `<button type="button" class="chip" data-fk="${esc(k)}" aria-pressed="${k === filt}">${esc(t)}</button>`).join("")}</div>
    <span class="mono mute" id="fcount"></span>
    <div class="grid" id="fgrid">${S.photos.map(p => `<div class="tile" data-id="${p.id}" style="${arStyle(p)}"><button type="button" class="open" data-pick="${p.id}" aria-pressed="false"><img loading="lazy" src="${p.thumb}" alt="Foto del ${esc(fmtDate(p.date))}"></button></div>`).join("")}</div>
    <div class="dock"><button type="button" class="btn block" id="fgo" disabled>Tocca una o più foto</button></div>`, { z: 45 });
  const el = s.el, inp = $("#fq", el), grid = $("#fgrid", el), chips = $("#fchips", el);
  const apply = () => {
    const ws = terms(inp.value), base = new Set(aiIds || listFor(filt).map(p => p.id));
    let n = 0;
    grid.querySelectorAll(".tile").forEach(t => { const id = t.dataset.id, ok = sel.includes(id) || (base.has(id) && (aiIds ? true : matches(photoById(id), ws))); t.hidden = !ok; if (ok) n++; });
    $("#fcount", el).textContent = n ? `${n} foto` : `Nessuna foto trovata. Prova con altre parole${AI.ready ? " o chiedi all'AI" : ""}.`;
    $("#faiRow", el).hidden = !(AI.ready && ws.length);
  };
  const updGo = () => { const b = $("#fgo", el); b.disabled = !sel.length; b.innerHTML = sel.length ? `${I.mic}Racconta ${sel.length === 1 ? "questa foto" : `queste ${sel.length} foto`}` : "Tocca una o più foto"; };
  let t = null;
  inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { aiIds = null; apply(); }, 160); };
  inp.onkeydown = e => { if (e.key === "Enter") inp.blur(); };
  attachDictation($("#fqMic", el), inp, () => { aiIds = null; apply(); });
  chips.onclick = e => { const c = e.target.closest("[data-fk]"); if (!c) return; filt = c.dataset.fk; aiIds = null; chips.querySelectorAll("[data-fk]").forEach(x => x.setAttribute("aria-pressed", x === c)); apply(); };
  grid.onclick = e => {
    const b = e.target.closest("[data-pick]"); if (!b) return;
    const id = b.dataset.pick, i = sel.indexOf(id);
    if (i >= 0) sel.splice(i, 1); else { if (sel.length >= 6) { toast("Al massimo 6 foto per un ricordo"); return; } sel.push(id); }
    b.parentElement.classList.toggle("sel", i < 0); b.setAttribute("aria-pressed", i < 0); updGo();
  };
  $("#fai", el).onclick = async () => {
    const q = inp.value.trim(), b = $("#fai", el); if (!q) return;
    b.disabled = true; b.innerHTML = `${I.spark}Sto cercando…`;
    try {
      const out = await aiFind(q), ids = ((out && out.ids) || []).filter(id => photoById(id));
      if (ids.length) { aiIds = ids; chips.querySelectorAll("[data-fk]").forEach(x => x.setAttribute("aria-pressed", "false")); $("#fhint", el).textContent = out.perche ? `L'AI: ${out.perche}` : "Ecco le foto trovate dall'AI."; }
      else toast("L'AI non ha trovato foto adatte. Prova a dirlo in un altro modo.");
    } catch { toast("Non sono riuscito a chiedere all'AI. Riprova."); }
    b.disabled = false; b.innerHTML = `${I.spark}Chiedi all'AI di trovarle`; apply();
  };
  $("#fgo", el).onclick = () => { const ids = [...sel]; s.close(); openInterview({ photoIds: ids, seed }); };
  $("#fUp", el).onclick = () => { s.close(); openAddPhotos({ tell: true, seed }); };
  apply();
}
// Searching in plain words: the AI reads what is known about every photo and picks the ones that fit.
async function aiFind(q) {
  const lines = S.photos.map(p => [p.id, p.date.replace(/-00/g, ""), placeOf(p), tagsOf(p).join(","), captionOf(p), memsFor(p.id).map(m => m.title).filter(Boolean).join("; ")].join("|")).join("\n");
  return AI.json(`Aiuta una persona anziana a ritrovare delle foto nell'album di famiglia. Ogni riga è una foto: id|data|luogo|parole chiave|didascalia|ricordi.
${lines}

La persona cerca: "${q}"
Scegli le foto che corrispondono meglio (al massimo 40, le più adatte per prime). Interpreta con buon senso: stagioni, feste, luoghi simili, persone. Se nessuna corrisponde, lista vuota.
JSON: {"ids": ["p001"], "perche": "una frase breve e semplice in italiano su cosa hai cercato"}`, { quick: true });
}

// ---------- Events ----------
document.addEventListener("click", async e => {
  const t = e.target.closest("button, [data-photo]"); if (!t) return;
  $("#peek").classList.remove("on");
  if (t.dataset.say) { Voice.speak(SAY.get(t.dataset.say), t); return; }
  if (t.dataset.sayFrom) { const src = $(t.dataset.sayFrom); Voice.speak(src && src.value, t); return; }
  if (t.dataset.fav) { toggleFav(t.dataset.fav); return; }
  if (t.dataset.rmyes) { const p = photoById(t.dataset.rmyes); if (p) askRemove(p); return; }
  if (t.dataset.rmno) { const p = photoById(t.dataset.rmno); if (p) keepPhoto(p); return; }
  if (t.dataset.rmundo) { const p = photoById(t.dataset.rmundo); if (p) undoRm(p); return; }
  if (t.dataset.rmback) { const p = S.gone.find(x => x.id === t.dataset.rmback); if (p) keepPhoto(p); return; }
  if (t.dataset.rmgo) { const l = pendingRm().filter(p => !votesOf(p.id).includes(me)); if (l.length) openViewer(l, l[0].id, false); return; }
  if (t.id === "goneList") { openGone(); return; }
  if (t.dataset.me) { me = t.dataset.me; ls.set("me", me); await loadPersonal(); S.tab = "storia"; render(); scrollTo(0, 0); return; }
  if (t.id === "lookBtn") { Look.toggle(t); return; }
  if (t.id === "switchWho") {
    if (Store.signOut) {
      const n = esc(person(me).name);
      const s = sheet(sheetTop("Cambia persona") + `<h1 class="h1">Sei<br><span class="serif">${n}</span></h1>
        <p class="lede">Se cambi persona, chi entra dovrà scrivere la sua password.</p>
        <button type="button" class="btn line block" data-close>Resto ${n}</button>
        <button type="button" class="btn block" id="soOk">Cambia persona</button>`, { z: 60 });
      $("#soOk", s.el).onclick = async () => { await Store.signOut(); location.reload(); };
      return;
    }
    me = null; ls.set("me", null); render(); return;
  }
  if (t.classList.contains("tab")) { go(t.dataset.tab); return; }
  if (t.dataset.tabGo) { go(t.dataset.tabGo); return; }
  if (t.dataset.mo) { Tour.stop(); const mo = Band.list.find(m => m.key === t.dataset.mo) || moments().find(m => m.key === t.dataset.mo); if (mo) Focus.open(mo, { from: t }); return; }
  if (t.id === "tour") { if (Tour.on) Tour.stop(); else Tour.start(); return; }
  if (t.id === "shuffleBand") { Tour.stop(); M.seed = (Math.random() * 1e9) | 0; M.first = null; Band.shuffle(); return; }
  if (t.id === "openLetter") { openLetter(); return; }
  if (t.dataset.play) { const l = listFor(t.dataset.play); if (l.length) openViewer(t.dataset.play, l[0].id, true); return; }
  if (t.dataset.voiceset) { openVoice(); return; }
  if (t.id === "bigText") { const on = document.documentElement.classList.toggle("big"); ls.set("big", on); render(); return; }
  if (t.dataset.chap) { openChapter(t.dataset.chap); return; }
  if (t.id === "addChapter") { editChapter(); return; }
  if (t.dataset.chedit) { const c = chById(t.dataset.chedit); if (c) editChapter(c); return; }
  if (t.dataset.find) { openFinder({ preset: t.dataset.find }); return; }
  if (t.dataset.tellphoto) { openInterview({ photoIds: [t.dataset.tellphoto] }); return; }
  if (t.dataset.rac) { openRaccolta(t.dataset.rac); return; }
  if (t.id === "openTl") { openTimeline(); return; }
  if (t.id === "uploadTell") { openAddPhotos({ tell: true }); return; }
  if (t.dataset.upyear) { openAddPhotos({ from: +t.dataset.upyear, tell: true }); return; }
  if (t.dataset.upfrom) { openAddPhotos({ from: +t.dataset.upfrom, to: +t.dataset.upto, tell: true }); return; }
  if (t.dataset.upch) { const c = chById(t.dataset.upch); openAddPhotos({ from: c.from.startsWith("1900") ? C.met : +c.from.slice(0, 4), to: Math.min(+c.to.slice(0, 4), THIS_YEAR), tell: true }); return; }
  if (t.dataset.fotoyear) { S.filter = "y:" + t.dataset.fotoyear; S.q = ""; S.view = "grid"; closeSheets(); go("foto"); return; }
  if (t.id === "tagRest") { const l = S.photos.filter(p => !tagsOf(p).length); t.disabled = true; t.textContent = "L'AI sta guardando le foto…"; aiTagPhotos(l).then(n => { toast(n ? `L'AI ha ordinato ${n} foto` : "L'AI non è riuscita a guardare le foto. Riprova più tardi."); render(); }); return; }
  if (t.dataset.weave) { weave(t.dataset.weave); return; }
  if (t.dataset.chall) { S.filter = t.dataset.chall; S.q = ""; S.view = "grid"; closeSheets(); go("foto"); return; }
  if (t.dataset.mem) { openMemory(t.dataset.mem); return; }
  if (t.dataset.filter) { S.filter = t.dataset.filter; S.deck = 0; render(); return; }
  if (t.dataset.view) { S.view = t.dataset.view; ls.set("fotoView", S.view); render(); return; }
  if (t.dataset.deck) { S.deck += +t.dataset.deck; drawDeck(); return; }
  if (t.classList.contains("card3")) { const i = +t.dataset.i; if (i === S.deck) { openViewer(fotoList(), fotoList()[i].id, false); } else { S.deck = i; drawDeck(); } return; }
  if (t.dataset.album) { openAlbum(t.dataset.album); return; }
  if (t.id === "newAlbum") { const a = await newAlbum(); if (a) { render(); openAlbum(a.id); pickPhotos(a); } return; }
  if (t.id === "startDaily") { const day = Math.floor(Date.now() / 864e5); openFinder({ seed: DAILY[day % DAILY.length], title: "La domanda di oggi" }); return; }
  if (t.id === "uploadDaily") { const day = Math.floor(Date.now() / 864e5); openAddPhotos({ tell: true, seed: DAILY[day % DAILY.length] }); return; }
  if (t.id === "otherPhotos") { render(); return; }
  if (t.id === "addPhotos") { openAddPhotos(); return; }
  if (t.dataset.photo) { openViewer(t.dataset.list || "tutti", t.dataset.photo, false); return; }
  if (!V.el || V.el.hidden || !V.el.contains(t)) return;
  if (t.dataset.vclose !== undefined) closeViewer();
  else if (t.dataset.vprev !== undefined) vStep(-1);
  else if (t.dataset.vnext !== undefined) vStep(1);
  else if (t.dataset.vplay !== undefined) setViewerPlay(!V.timer);
  else if (t.dataset.valbum !== undefined) { setViewerPlay(false); chooseAlbum(V.list[V.idx].id); }
  else if (t.dataset.vtell !== undefined) openInterview({ photoIds: [V.list[V.idx].id] });
  else if (t.dataset.vedit !== undefined) { setViewerPlay(false); openDetails(V.list[V.idx]); }
});
document.addEventListener("keydown", e => {
  if (e.target.matches && e.target.matches("input, textarea")) { if (e.key !== "Escape") return; }
  const top = Sheets[Sheets.length - 1], viewerOn = V.el && !V.el.hidden;
  // Escape or Enter goes into the album; space goes from the years to the letter, then scrolls it like the arrows do.
  if (Opening.el) {
    if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); Opening.close(); }
    else if (e.key === " " && !Opening.el.classList.contains("text")) { e.preventDefault(); Opening.skip(); }
    return;
  }
  if (e.key === "Escape") {
    const layers = [...[...Sheets].reverse().map(s => [s.z, () => s.close()]), ...(viewerOn ? [[40, closeViewer]] : []), ...(Focus.el ? [[35, () => { Tour.stop(); Focus.close(); }]] : [])];
    if (layers.length) layers.sort((a, b) => b[0] - a[0])[0][1](); else Tour.stop();
    return;
  }
  if (viewerOn && !(top && top.z > 40)) { if (e.key === "ArrowRight") vStep(1); if (e.key === "ArrowLeft") vStep(-1); return; }
  if (!Sheets.length && $("#deck")) { if (e.key === "ArrowRight") { S.deck++; drawDeck(); } if (e.key === "ArrowLeft") { S.deck--; drawDeck(); } }
});
const dropFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
document.addEventListener("dragover", e => { if (dropFiles(e)) e.preventDefault(); });
document.addEventListener("drop", e => {
  if (!dropFiles(e) || e.defaultPrevented) return;
  e.preventDefault();
  const files = [...e.dataTransfer.files].filter(isMediaFile);
  if (files.length && me) { closeViewer(); openAddPhotos({ files }); }
});
let tx = null, tzone = null;
document.addEventListener("touchstart", e => {
  const tl = e.target.closest(".tl"); if (tl) { clearTimeout(tl._h); tl.classList.add("hold"); }
  tzone = V.el && !V.el.hidden && e.target.closest(".viewer .photo") ? "viewer" : e.target.closest("#deck") ? "deck" : null;
  tx = tzone ? e.touches[0].clientX : null;
}, { passive: true });
document.addEventListener("touchend", e => {
  document.querySelectorAll(".tl.hold").forEach(x => { clearTimeout(x._h); x._h = setTimeout(() => x.classList.remove("hold"), 2500); });
  if (tx == null) return; const d = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(d) < 45) return;
  if (tzone === "viewer") vStep(d < 0 ? 1 : -1); else if (tzone === "deck") { S.deck += d < 0 ? 1 : -1; drawDeck(); }
});
// Hovering a chapter shows its cover next to the pointer (desktop only).
document.addEventListener("pointermove", e => {
  const pk = $("#peek"); if (e.pointerType !== "mouse") return;
  const b = e.target.closest && e.target.closest(".index button[data-chap]");
  if (!b || Sheets.length) { pk.classList.remove("on"); return; }
  const ps = photosIn(b.dataset.chap), c = chById(b.dataset.chap), cover = ps.find(p => p.id === c.cover) || ps[0];
  if (!cover) { pk.classList.remove("on"); return; }
  if (pk.dataset.k !== c.id) { pk.src = cover.thumb; pk.dataset.k = c.id; }
  pk.style.left = Math.min(innerWidth - 120, e.clientX + 140) + "px"; pk.style.top = e.clientY + "px"; pk.classList.add("on");
});
addEventListener("scroll", () => $("#peek").classList.remove("on"), { passive: true });
document.addEventListener("visibilitychange", () => { if (document.hidden) Tour.stop(); else Band.wake(); });
if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = () => {};

// ---------- Boot ----------
(async () => {
  if (ls.get("big", false)) document.documentElement.classList.add("big");
  document.documentElement.classList.add("js");
  Look.init(); Opening.show(); Cur.init();
  $("#app").innerHTML = `<p class="hint" style="padding-top:30vh;text-align:center">Apro l'album…</p>`;
  try { if (Store.init) await Store.init(); } catch {}
  if (C.mode === "supabase" && Store.me) me = Store.me();
  await loadAll();
  render();
  AI.init().then(() => { if (AI.ready && S.tab === "foto" && !Sheets.length) render(); });
})();
})();
