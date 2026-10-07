// Is each recording where it should be: on the phone, cached, or streamed?
//
//   node build/make-deploy.mjs && node build/test-budget.mjs
//
// Reads the BUILT docs/ and the deck, and fails the build if the storage plan is broken.
// build/lib/tiers.mjs defines the tiers (core / bundled / remote) and the ceilings; this
// enforces them:
//
//   - the shell the service worker precaches on install stays small (it is the first-run
//     cost over mobile data);
//   - the core tier — what must work with no signal — stays small enough to fetch casually
//     on Wi-Fi, and is COMPLETE (a core word that has a recording but no bundled clip is a
//     promise the app cannot keep offline);
//   - everything shipped stays inside the repo budget, and no single clip is absurd;
//   - every bundled clip can be evicted and re-streamed: its remote source is in the deck
//     (a Wikimedia folder and file for words, the Tatoeba path for sentences), so removing
//     it from docs/ later loses nothing;
//   - the three copies of the tier rule (tiers.mjs, sw.js, audio.js) agree.
//
// It also prints the plan, including how much could be pruned from docs/ and streamed instead.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tierOf, CORE_RANK, BUDGET, MB } from './lib/tiers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');
if (!existsSync(join(DOCS, 'sw.js'))) { console.error('test-budget: docs/ is not built — run node build/make-deploy.mjs first'); process.exit(1); }
const fails = [], lines = [];
const need = (ok, what) => { if (!ok) fails.push(what); };
const size = (p) => statSync(p).size;
const fmt = (b) => `${(b / MB).toFixed(1)} MB`;

// ── the shell ─────────────────────────────────────────────────────────────
const sw = readFileSync(join(DOCS, 'sw.js'), 'utf8');
const shell = [...(sw.match(/const SHELL = \[([^\]]*)\]/)?.[1] || '').matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]).filter((u) => u !== './');
const shellBytes = shell.reduce((n, f) => n + (existsSync(join(DOCS, f)) ? size(join(DOCS, f)) : 0), 0);
lines.push(`shell (precached on install): ${shell.length} files, ${fmt(shellBytes)} of ${BUDGET.shellMB} MB`);
need(shellBytes <= BUDGET.shellMB * MB, `the precached shell is ${fmt(shellBytes)}, over the ${BUDGET.shellMB} MB first-run budget`);
const deckFile = shell.find((f) => /^data\/deck\./.test(f));
const deckBytes = deckFile ? size(join(DOCS, deckFile)) : 0;
need(deckBytes <= BUDGET.deckMB * MB, `the deck is ${fmt(deckBytes)}, over ${BUDGET.deckMB} MB (it is parsed into memory at start)`);

// ── the recordings ────────────────────────────────────────────────────────
const tiers = { core: { n: 0, bytes: 0 }, bundled: { n: 0, bytes: 0 }, remote: { n: 0, bytes: 0 } };
let biggest = { b: 0, f: '' };
const clips = [];
for (const dir of ['w', 's']) {
  const d = join(DOCS, 'audio', dir);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    const b = size(join(d, f));
    const path = `/audio/${dir}/${f}`;
    const t = tierOf(path);
    tiers[t].n++; tiers[t].bytes += b; clips.push({ path, dir, f, b, t });
    if (b > biggest.b) biggest = { b, f: path };
  }
}
need(tiers.remote.n === 0, `${tiers.remote.n} bundled clips fall outside both tiers (they would never be managed)`);
const shipped = tiers.core.bytes + tiers.bundled.bytes;
lines.push(`core (kept offline, never evicted): ${tiers.core.n} clips, ${fmt(tiers.core.bytes)} of ${BUDGET.coreMB} MB`);
lines.push(`bundled (cached when played, trimmed to the learner's cap): ${tiers.bundled.n} clips, ${fmt(tiers.bundled.bytes)}`);
lines.push(`shipped in docs/: ${fmt(shipped)} of ${BUDGET.bundledMB} MB; biggest clip ${(biggest.b / 1024).toFixed(0)} KB (${biggest.f.split('/').pop()})`);
need(tiers.core.bytes <= BUDGET.coreMB * MB, `the core tier is ${fmt(tiers.core.bytes)}, over ${BUDGET.coreMB} MB`);
need(shipped <= BUDGET.bundledMB * MB, `the shipped audio is ${fmt(shipped)}, over the ${BUDGET.bundledMB} MB repo budget`);
need(biggest.b <= BUDGET.clipKB * 1024, `a clip is ${(biggest.b / 1024).toFixed(0)} KB (${biggest.f}), over ${BUDGET.clipKB} KB`);

// ── core is complete, and everything can be re-streamed ───────────────────
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const have = new Set(clips.filter((c) => c.dir === 'w').map((c) => c.f));
let wanted = 0, present = 0;
for (const [i, w] of deck.words.entries()) {
  if (w.r > CORE_RANK) continue;
  for (const [a, tag] of [[w.fr, 'fr'], [w.qcA, 'qc']]) if (a) { wanted++; if (have.has(`${tag}-${i + 1}.mp3`)) present++; }
}
const coverage = wanted ? present / wanted : 1;
lines.push(`core coverage: ${present} of ${wanted} core words' recordings are bundled (${(coverage * 100).toFixed(1)}%, need ${BUDGET.minCoreCoverage * 100}%)`);
need(coverage >= BUDGET.minCoreCoverage, `only ${(coverage * 100).toFixed(1)}% of the core words' recordings are bundled — "keep the essentials offline" would not be offline`);

let noRemote = [];
for (const c of clips) {
  if (c.dir === 's') continue;                                   // sentences always have a remote path: audio.tatoeba.org/sentences/fra/<id>.mp3
  const m = /^(fr|qc)-(\d+)\.mp3$/.exec(c.f);
  if (m) { const w = deck.words[+m[2] - 1]; const a = m[1] === 'fr' ? w?.fr : w?.qcA; if (!a?.p || !a?.f) noRemote.push(c.f); }
  else if (/^q-/.test(c.f)) { if (!deck.canadian.some((x) => x.audio?.p && x.audio?.f && `q-${slug(x.qc)}.mp3` === c.f)) noRemote.push(c.f); }
}
need(noRemote.length === 0, `${noRemote.length} bundled clips have no remote source in the deck, so they could never be evicted and re-streamed (e.g. ${noRemote.slice(0, 3).join(', ')})`);
lines.push(`re-streamable: ${clips.length - noRemote.length} of ${clips.length} bundled clips have a remote source, so ${fmt(tiers.bundled.bytes)} could be pruned from docs/ and streamed instead`);
function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ── every shipped word clip is the word it is filed under ─────────────────
// Clips are named by rank and ranks shift when the word list changes: a clip fetched under an
// old numbering would play the NEXT word. The provenance manifest records which Commons file
// each clip came from; it must agree with the deck as it is now.
const MF = join(ROOT, 'app', 'audio', 'w', '_manifest.json');
const manifest = existsSync(MF) ? JSON.parse(readFileSync(MF, 'utf8')) : {};
let wrongWord = [], unproven = [];
for (const c of clips) {
  if (c.dir !== 'w') continue;
  const m = /^(fr|qc)-(\d+)\.mp3$/.exec(c.f);
  let expected = null;
  if (m) { const w = deck.words[+m[2] - 1]; expected = (m[1] === 'fr' ? w?.fr : w?.qcA)?.f; }
  else { const q = deck.canadian.find((x) => `q-${slug(x.qc)}.mp3` === c.f); expected = q?.audio?.f; }
  if (!manifest[c.f]) unproven.push(c.f);
  else if (manifest[c.f] !== expected) wrongWord.push(c.f);
}
lines.push(`provenance: ${clips.filter((c) => c.dir === 'w').length - unproven.length - wrongWord.length} word clips confirmed as the word they are filed under`);
need(unproven.length === 0, `${unproven.length} shipped word clips have no provenance (e.g. ${unproven.slice(0, 3).join(', ')}) — run node build/audit-audio.mjs`);
need(wrongWord.length === 0, `${wrongWord.length} shipped word clips are the recording of a different word than the deck says (e.g. ${wrongWord.slice(0, 3).join(', ')})`);

// ── the three copies of the rule agree ────────────────────────────────────
const swCap = Number(/const CORE_RANK = (\d+);/.exec(sw)?.[1]);
need(swCap === CORE_RANK, `sw.js says the core is the first ${swCap} words, tiers.mjs says ${CORE_RANK}`);
const swRule = /const isCoreUrl = [\s\S]*?\n};/.exec(sw)?.[0];
const isCoreSw = swRule ? new Function('CORE_RANK', swRule + '; return isCoreUrl;')(CORE_RANK) : null;
need(!!isCoreSw, 'could not read isCoreUrl from sw.js');
globalThis.window = {};
const audioJs = await import(pathToFileURL(join(ROOT, 'app', 'js', 'audio.js')).href);
need(audioJs.CORE_RANK === CORE_RANK, `audio.js says the core is the first ${audioJs.CORE_RANK} words`);
const probes = ['/audio/w/fr-1.mp3', '/audio/w/qc-1500.mp3', '/audio/w/fr-1501.mp3', '/audio/w/qc-6999.mp3', '/audio/w/q-depanneur.mp3', '/audio/s/12345.mp3', '/jasette/audio/w/fr-1500.mp3', '/x/y.mp3'];
for (const p of probes) {
  const want = tierOf(p) === 'core';
  need(audioJs.tierOf(p) === tierOf(p), `audio.js and tiers.mjs disagree about ${p}`);
  if (isCoreSw) need(isCoreSw(p) === want, `sw.js and tiers.mjs disagree about ${p}`);
}

console.log('test-budget:');
for (const l of lines) console.log('  ' + l);
if (fails.length) { console.error('\ntest-budget FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log('test-budget: every recording has a place — on the phone, cached and trimmable, or streamed — and the budgets hold.');
