// Is each bundled word recording really the word it is filed under?
//
//   node build/audit-audio.mjs
//
// A clip is named by its word's rank, and ranks shift when the word list changes, so a clip
// fetched under an old numbering can play the wrong word (build/test-budget.mjs found four
// such, and there may be many more). Clips fetched since build/fetch-audio.mjs began writing
// a manifest are checked for free: the manifest names the Commons file each came from. For
// the ones fetched before it, this asks the source: Commons will say how big the file it
// serves for the CURRENT word is, and a clip whose size differs is not that word's. A clip
// that matches is added to the manifest; one that does not is deleted, to be fetched again.
//
// Paced like the fetch (three at a time, honouring Retry-After), because Wikimedia
// rate-limits.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WDIR = join(ROOT, 'app', 'audio', 'w');
const MANIFEST = join(WDIR, '_manifest.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const plan = JSON.parse(readFileSync(join(ROOT, 'build', '_audio-plan.json'), 'utf8'));
const UA = 'Jasette/1.0 (a personal language-learning app; wjster@gmail.com)';
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// what each local name SHOULD be, from the current plan
const want = new Map();
for (const w of plan.words) want.set(w.q ? `q-${slug(w.q)}.mp3` : `${w.a}-${w.i + 1}.mp3`, { src: w.f, url: w.mp3 });

const files = readdirSync(WDIR).filter((f) => f.endsWith('.mp3'));
const orphans = files.filter((f) => !want.has(f));              // on disk, wanted by nothing: a word that has left the plan
const unverified = files.filter((f) => want.has(f) && manifest[f] !== want.get(f).src);
const wrong = files.filter((f) => want.has(f) && manifest[f] && manifest[f] !== want.get(f).src);
console.log(`${files.length} clips: ${files.length - orphans.length - unverified.length} verified by manifest, ${unverified.length} to check against the source, ${orphans.length} wanted by no word`);
for (const f of orphans) rmSync(join(WDIR, f));
for (const f of wrong) { rmSync(join(WDIR, f)); delete manifest[f]; }

let pausedUntil = 0, done = 0, kept = 0, removed = wrong.length + orphans.length;
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const check = async (f) => {
  const { src, url } = want.get(f);
  const local = statSync(join(WDIR, f)).size;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = pausedUntil - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      const r = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': UA } });
      if (r.status === 429 || r.status >= 500) { pausedUntil = Math.max(pausedUntil, Date.now() + ((Number(r.headers.get('retry-after')) || 15) + 2) * 1000); continue; }
      const remote = Number(r.headers.get('content-length'));
      if (r.ok && remote && remote === local) { manifest[f] = src; kept++; }
      else { rmSync(join(WDIR, f)); removed++; }
      return;
    } catch { await sleep(1500); }
  }
};
const q = unverified.slice();
const worker = async () => { while (q.length) { const f = q.shift(); await check(f); if (++done % 200 === 0) { writeFileSync(MANIFEST, JSON.stringify(manifest)); console.log(`  ${done}/${unverified.length} (${kept} confirmed, ${removed} removed)`); } await sleep(300); } };
await Promise.all([worker(), worker(), worker()]);
writeFileSync(MANIFEST, JSON.stringify(manifest));
console.log(`audit-audio: ${kept} older clips confirmed against their source, ${removed} removed (stale or orphaned) — run node build/fetch-audio.mjs --words to fetch what is missing`);
