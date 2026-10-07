// Fetch the recordings the deck uses.
//
//   node build/items.mjs && node build/fetch-audio.mjs
//
// Two sources, both human voices, and the app credits every speaker by name:
//
//   Words — Wikimedia Commons, the files Wiktionary links for each word:
//     Lingua Libre recordings (CC BY-SA 4.0), a Québec speaker (Shawinigan)
//     and speakers from France, and some older Qc-/Fr- files. Each file's own
//     licence is on its Commons page.
//   Sentences — Tatoeba recordings that the audio server still has (see
//     build/probe-audio.mjs), under a Creative Commons licence; the speaker and
//     licence are shown with each clip. Most are CC BY-NC-ND or CC BY-NC: free,
//     unmodified, credited and non-commercial.
//
// Files already on disk are kept, so this can be stopped and run again.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(ROOT, 'build', '_audio-plan.json'), 'utf8'));
const WDIR = join(ROOT, 'app', 'audio', 'w'), SDIR = join(ROOT, 'app', 'audio', 's');
mkdirSync(WDIR, { recursive: true }); mkdirSync(SDIR, { recursive: true });
const UA = 'Jasette/1.0 (a personal language-learning app; wjster@gmail.com)';

export const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// PROVENANCE. A word clip is named by its word's RANK (fr-2132.mp3), and the word list can
// change between runs: a word dropped or added shifts every rank after it by one, and a clip
// downloaded under the old numbering then plays the NEXT word. build/test-budget.mjs found
// exactly that. So every clip is recorded in a manifest, local name -> the Commons filename it
// was fetched from, and a clip counts as present only if the manifest agrees with the plan.
const MANIFEST = join(WDIR, '_manifest.json');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const saveManifest = () => writeFileSync(MANIFEST, JSON.stringify(manifest));
const jobs = [];
for (const w of plan.words) {
  const name = w.q ? `q-${slug(w.q)}.mp3` : `${w.a}-${w.i + 1}.mp3`;
  jobs.push({ url: w.mp3, file: join(WDIR, name), host: 'wm', name, src: w.f });
}
for (const id of plan.sentences) jobs.push({ url: `https://audio.tatoeba.org/sentences/fra/${id}.mp3`, file: join(SDIR, `${id}.mp3`), host: 'tat' });

const only = process.argv.includes('--words') ? 'wm' : process.argv.includes('--sentences') ? 'tat' : null;
// A stale clip — present, but fetched for a different word — is removed here, not trusted.
for (const j of jobs) if (j.host === 'wm' && existsSync(j.file) && manifest[j.name] && manifest[j.name] !== j.src) { rmSync(j.file); delete manifest[j.name]; }
const todo = jobs.filter((j) => !only || j.host === only).filter((j) => !(existsSync(j.file) && statSync(j.file).size > 800 && (j.host !== 'wm' || manifest[j.name] === j.src)));
console.log(`${jobs.length} recordings wanted, ${jobs.length - todo.length} already here, ${todo.length} to fetch`);

let done = 0, failed = [];
// Wikimedia answers 429 with a Retry-After when it is asked too fast. Everyone waits
// for it together (a shared pause), and the number of requests in flight stays small.
let pausedUntil = 0;
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const get = async (j) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = pausedUntil - Date.now();
    if (wait > 0) await sleep(wait);
    try {
      const r = await fetch(j.url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
      if (r.status === 429 || r.status >= 500) {
        const ra = Number(r.headers.get('retry-after')) || 15;
        pausedUntil = Math.max(pausedUntil, Date.now() + (ra + 2) * 1000);
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const type = r.headers.get('content-type') || '';
      if (!/audio|octet/.test(type) || buf.length < 800) throw new Error('not audio (' + type + ', ' + buf.length + ' bytes)');
      writeFileSync(j.file, buf);
      if (j.host === 'wm') { manifest[j.name] = j.src; if (Object.keys(manifest).length % 25 === 0) saveManifest(); }
      return true;
    } catch (e) { if (attempt >= 4) { failed.push(j.url + ' ' + e.message); return false; } await sleep(1500); }
  }
  failed.push(j.url + ' (retries exhausted)');
  return false;
};
const queues = { wm: todo.filter((j) => j.host === 'wm'), tat: todo.filter((j) => j.host === 'tat') };
const worker = async (q, gap) => { while (q.length) { const j = q.shift(); await get(j); done++; if (done % 250 === 0) console.log('  ' + done + '/' + todo.length + ' (' + failed.length + ' failed)'); if (gap) await sleep(gap); } };
const W = +(process.env.WORKERS || 3);
await Promise.all([...Array(W)].map(() => worker(queues.wm, 350)), ...Array(W).fill(0).map(() => worker(queues.tat, 0)));
saveManifest();
const sizeOf = (d) => readdirSync(d).reduce((n, f) => n + statSync(join(d, f)).size, 0) / 1048576;
console.log(`fetched ${done - failed.length}, failed ${failed.length}; app/audio/w ${sizeOf(WDIR).toFixed(0)} MB, app/audio/s ${sizeOf(SDIR).toFixed(0)} MB`);
if (failed.length) { writeFileSync(join(ROOT, 'build', '_audio-failed.txt'), failed.join('\n')); console.log('  failures listed in build/_audio-failed.txt'); }
