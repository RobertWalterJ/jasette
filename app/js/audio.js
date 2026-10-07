// Jasette — playing a word or a sentence out loud.
//
// Three sources, in this order, and the app always says which one you are
// hearing:
//
//   1. a recording bundled with the app (audio/…) — a person, credited by name;
//   2. the same recording fetched from Wikimedia Commons or Tatoeba, for the
//      ones not bundled, and kept by the service worker once heard;
//   3. the phone's own French voice — a machine, and labelled as one.
//
// Words come in two accents where the sources have both: Québec (a speaker
// from Shawinigan, recorded for Lingua Libre) and France (speakers from Paris,
// Lyon, Toulouse and the Vosges). Which plays first is a setting; the other is
// one tap away.

import { sayFr, frAvailable, stop as stopSpeech } from './speech.js';

const BASE = window.JASETTE_AUDIO ?? 'audio/';
let index = { w: new Set(), s: new Set() };
let listener = null;
let current = null;
let alternate = 0;
export function onAudio(fn) { listener = fn; }

export async function loadAudioIndex() {
  try {
    const r = await fetch(window.JASETTE_AUDIO_INDEX || 'data/audio.json');
    if (!r.ok) return;
    const j = await r.json();
    index = { w: new Set(j.w || []), s: new Set((j.s || []).map(String)), bytes: j.bytes || null };
  } catch { /* the app works without it: everything is then fetched remotely */ }
}
export const bundledCount = () => index.w.size + index.s.size;
export const bundledBytes = () => index.bytes || { core: 0, bundled: 0 };

// The tier of a bundled clip — the same rule as build/lib/tiers.mjs and sw.js (build/test-budget.mjs
// checks the three agree). Core: the commonest 1,500 words and the Québec track.
export const CORE_RANK = 1500;
export const tierOf = (path) => {
  const m = /\/audio\/w\/(?:fr|qc)-(\d+)\.mp3$/.exec(path);
  if (m) return +m[1] <= CORE_RANK ? 'core' : 'bundled';
  if (/\/audio\/w\/q-[^/]+\.mp3$/.test(path)) return 'core';
  if (/\/audio\/s\/\d+\.mp3$/.test(path)) return 'bundled';
  return 'remote';
};

// Talk to the service worker that owns the audio caches. Null where there is none (a first
// visit before it has taken control, or a browser that will not run one).
async function swCall(msg) {
  const reg = await navigator.serviceWorker?.getRegistration?.().catch(() => null);
  const sw = reg?.active;
  if (!sw) return null;
  return new Promise((ok) => { const ch = new MessageChannel(); ch.port1.onmessage = (e) => ok(e.data); sw.postMessage(msg, [ch.port2]); setTimeout(() => ok(null), 5000); });
}
export const storageUsage = () => swCall({ type: 'usage' });
export const setStorageCap = (bytes) => swCall({ type: 'budget', cap: bytes });
export const purgeOther = () => swCall({ type: 'purge' });
export const osStorage = async () => { try { return await navigator.storage?.estimate?.(); } catch { return null; } };
// Fetch every URL (the worker keeps what it is given), four at a time, never faster.
export async function fetchAll(urls, onProgress) {
  const q = urls.slice();
  let n = 0, fail = 0;
  const worker = async () => { while (q.length) { const u = q.shift(); try { const r = await fetch(u); if (!r.ok) fail++; else await r.arrayBuffer(); } catch { fail++; } onProgress?.(++n); } };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return { n, fail };
}
export const allBundledUrls = () => [...[...index.w].map((n) => BASE + 'w/' + n), ...[...index.s].map((id) => `${BASE}s/${id}.mp3`)];
export const coreUrls = () => allBundledUrls().filter((u) => tierOf(u) === 'core');

export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const enc = (s) => encodeURIComponent(s.replace(/ /g, '_')).replace(/[()'*!]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
const commons = (a) => {
  // The transcoded mp3 path Commons uses; `p` is its two-level hash folder.
  if (!a || !a.p) return null;
  const f = enc(a.f);
  return `https://upload.wikimedia.org/wikipedia/commons/transcoded/${a.p}/${f}/${f}.mp3`;
};

// A clip for a word: { urls: [local?, remote?], by, place, accent }
export function wordClip(w, i, accent) {
  const a = accent === 'qc' ? w.qcA : w.fr;
  if (!a) return null;
  const name = `${accent === 'qc' ? 'qc' : 'fr'}-${i + 1}.mp3`;
  const urls = [];
  if (index.w.has(name)) urls.push(BASE + 'w/' + name);
  const remote = commons(a);
  if (remote) urls.push(remote);
  return { urls, by: a.by, place: a.place, accent };
}
export function canadianClip(c) {
  if (!c.audio) return null;
  const name = `q-${slug(c.qc)}.mp3`;
  const urls = [];
  if (index.w.has(name)) urls.push(BASE + 'w/' + name);
  const remote = commons(c.audio);
  if (remote) urls.push(remote);
  return { urls, by: c.audio.by, place: c.audio.place, accent: 'qc' };
}
export function sentenceClip(sid, by) {
  const urls = [];
  if (index.s.has(String(sid))) urls.push(`${BASE}s/${sid}.mp3`);
  urls.push(`https://audio.tatoeba.org/sentences/fra/${sid}.mp3`);
  return { urls, by, accent: 'fr' };
}

export function stopAudio() {
  if (current) { try { current.pause(); } catch { /* ignore */ } current = null; }
  stopSpeech();
  listener?.(false);
}

// Plays a clip, trying each URL in turn. Resolves to true if something played.
function playClip(clip, { onend = null } = {}) {
  return new Promise((resolve) => {
    const urls = clip.urls.slice();
    const next = () => {
      const url = urls.shift();
      if (!url) { listener?.(false); resolve(false); return; }
      const a = new Audio(url);
      current = a;
      let started = false;
      a.addEventListener('playing', () => { started = true; listener?.(true); resolve(true); });
      a.addEventListener('ended', () => { listener?.(false); onend?.(); });
      a.addEventListener('error', () => { if (!started) next(); else { listener?.(false); onend?.(); } });
      a.play().catch(() => { if (!started) next(); });
    };
    next();
  });
}

// Which accent first, by the learner's setting. 'both' alternates, so a
// listener hears French in both accents in the course of a sitting.
export function accentOrder(pref) {
  if (pref === 'fr') return ['fr', 'qc'];
  if (pref === 'both') { alternate ^= 1; return alternate ? ['qc', 'fr'] : ['fr', 'qc']; }
  return ['qc', 'fr'];
}

// Play a word. Returns a description of what was heard:
//   { kind: 'recording', accent, by, place } | { kind: 'machine', accent } | { kind: 'none' }
export async function playWord(w, i, { pref = 'qc', only = null, onend = null } = {}) {
  stopAudio();
  const order = only ? [only] : accentOrder(pref);
  for (const accent of order) {
    const clip = wordClip(w, i, accent);
    if (clip && clip.urls.length && (await playClip(clip, { onend }))) return { kind: 'recording', accent, by: clip.by, place: clip.place };
  }
  const used = sayFr(w.w, { accent: only || order[0], onend: () => { listener?.(false); onend?.(); } });
  if (used) { listener?.(true); return { kind: 'machine', accent: used }; }
  onend?.();
  return { kind: 'none' };
}
export async function playCanadian(c, { onend = null } = {}) {
  stopAudio();
  const clip = canadianClip(c);
  if (clip && clip.urls.length && (await playClip(clip, { onend }))) return { kind: 'recording', accent: 'qc', by: clip.by, place: clip.place };
  const used = sayFr(c.qc, { accent: 'qc', onend: () => { listener?.(false); onend?.(); } });
  if (used) { listener?.(true); return { kind: 'machine', accent: used }; }
  onend?.();
  return { kind: 'none' };
}
// A sentence: its recording if it has one, otherwise the phone's French voice
// (fr-CA for a sentence Tatoeba tags as Canadian).
export async function playSentence({ sid = null, text, by = null, qc = false, hasAudio = true }, { onend = null } = {}) {
  stopAudio();
  if (sid && hasAudio) {
    const clip = sentenceClip(sid, by);
    if (await playClip(clip, { onend })) return { kind: 'recording', by, accent: 'fr' };
  }
  const used = sayFr(text, { accent: qc ? 'qc' : 'fr', onend: () => { listener?.(false); onend?.(); } });
  if (used) { listener?.(true); return { kind: 'machine', accent: used }; }
  onend?.();
  return { kind: 'none' };
}

// Can anything be played at all? Without a recording OR a voice, listening
// questions cannot be asked and are set aside rather than served blank.
export const canPlayAnything = () => frAvailable() || index.w.size + index.s.size > 0 || navigator.onLine;
