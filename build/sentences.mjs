// Which sentences the app can use, and what is in each.
//
//   node build/sentences.mjs      (after extract, senses and words)
//
// Each Tatoeba sentence is read for what it SAYS (content/unsuitable.mjs),
// then every token is resolved to a word in the deck. A sentence is then known
// by the highest-ranked word it needs, which is what decides when it is within
// reach: the same rule Hok Gong used with characters ("callbacks"), now with
// words.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'corpus', f), 'utf8'));
const SENT = read('sentences.json');
const SPELL = read('spellings.json');
const WORDS = read('words.json');
const { unsuitable } = await import(pathToFileURL(join(ROOT, 'content', 'unsuitable.mjs')).href);

// Spellings resolve to Lexique's lemma spelling (coeur), which is words[].lem
// where it differs from the one shown (cœur).
const rankOf = new Map(WORDS.map((w, i) => [w.lem || w.w, i]));

// Words that carry no vocabulary load: the closed class the grammar teaches.
// A sentence is not "hard" because it contains il, or de, or the number deux.
const FUNC = new Set(`le la les l' un une des du de d' au aux je j' tu il elle on nous vous ils elles me m' te t' se s' lui leur leurs y en ce c' cet cette ces ça ceci cela ça qui que qu' quoi dont où mon ma mes ton ta tes son sa ses notre nos votre vos ne n' pas plus rien jamais personne aucun aucune nul toi moi soi eux celui celle ceux celles quel quelle quels quelles lequel laquelle lesquels est sont suis es sommes êtes été étais était étaient serai sera seront serait ai as a avons avez ont avais avait avaient aura auront aurait eu un deux trois quatre cinq six sept huit neuf dix onze douze quinze vingt trente quarante cinquante soixante cent mille premier première deuxième troisième ni et ou mais donc car si que quand comme puis alors aussi très trop tout toute tous toutes même autre autres chaque quelque plusieurs certains certaine certaines tel telle tels telles`.split(/\s+/));

const tok = (t) => t.toLowerCase().replace(/’/g, "'").replace(/œ/g, 'oe')
  .replace(/aujourd'hui/g, 'aujourd_hui')
  .split(/[^a-zàâäæçéèêëîïôöœùûüÿ'_-]+/)
  .flatMap((x) => (x.includes("'") && !x.includes('_') ? x.split(/(?<=')/) : [x]))
  .map((x) => x.replace(/_/g, "'"))
  .filter(Boolean);

const out = [];
const dropped = new Map();
const seen = new Set();
for (const s of SENT) {
  const t = s.t.trim();
  if (t.length < 8 || t.length > 100) continue;
  if (!/[.!?»]$/.test(t)) continue;
  if (/[0-9@#]/.test(t)) continue;
  if (seen.has(t)) continue;
  const why = unsuitable(s.e, t);
  if (why) { dropped.set(why, (dropped.get(why) || 0) + 1); continue; }
  const toks = tok(t);
  if (toks.length < 3 || toks.length > 16) continue;
  seen.add(t);
  const ws = [];                  // indices into WORDS, in order of appearance
  let unknown = 0;
  for (const x of toks) {
    if (FUNC.has(x)) continue;
    const hits = SPELL[x];
    let ix = -1;
    if (hits) for (const [l] of hits) { const r = rankOf.get(l); if (r != null) { ix = r; break; } }
    if (ix >= 0) ws.push(ix); else unknown++;
  }
  const rec = { id: s.id, t, e: s.e, w: [...new Set(ws)], u: unknown, n: toks.length };
  if (s.a) rec.a = s.a;
  if (s.qc) rec.qc = 1;
  if (s.reg) rec.reg = s.reg;
  out.push(rec);
}
writeFileSync(join(ROOT, 'corpus', 'sentidx.json'), JSON.stringify(out));
console.log(`sentences kept: ${out.length.toLocaleString()} of ${SENT.length.toLocaleString()}`);
for (const [k, n] of [...dropped].sort((a, b) => b[1] - a[1])) console.log(`  set aside as ${k}: ${n.toLocaleString()}`);
const withAudio = out.filter((s) => s.a && /^(CC BY 4\.0|CC BY-SA 4\.0|CC0 1\.0)$/.test(s.a.lic || ''));
console.log(`  recorded under a permissive licence: ${withAudio.length.toLocaleString()}`);
const cover = new Map();
for (const s of out) for (const i of s.w) cover.set(i, (cover.get(i) || 0) + 1);
console.log(`  deck words with at least one sentence: ${cover.size.toLocaleString()} of ${WORDS.length.toLocaleString()}; with 3 or more: ${[...cover.values()].filter((n) => n >= 3).length.toLocaleString()}`);
