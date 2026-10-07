// Pull the Wiktionary entries for the words content/canadian.mjs teaches, whole.
//
//   node build/canadian-src.mjs [word word ...]    (candidates are read from content/canadian.mjs when it exists)
//
// The Canadian track's claims — "this word means that, in Québec" — are only
// ever made about words whose Wiktionary entry says so, and build/verify.mjs
// reads this file to check. Whole entries, not just the Quebec-tagged senses,
// because the interesting fact is often the CONTRAST: dîner is "lunch" in
// Québec and "dinner" in France, and both senses are in the same entry.

import { createReadStream, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let want = new Set(process.argv.slice(2));
const file = join(ROOT, 'content', 'canadian.mjs');
if (!want.size && existsSync(file)) {
  const C = (await import(pathToFileURL(file).href)).default;
  for (const e of C) { want.add(e.qc); for (const w of e.also || []) want.add(w); }
}
const out = [];
const rl = createInterface({ input: createReadStream(join(ROOT, 'sources', 'wiktionary', 'kaikki-french.jsonl'), 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
  const e = JSON.parse(line);
  if (e.lang_code !== 'fr' || !want.has(e.word)) continue;
  out.push({
    w: e.word, pos: e.pos,
    senses: (e.senses || []).map((s) => ({ g: (s.glosses || []).slice(-1)[0], t: s.tags || [], ex: (s.examples || []).slice(0, 2).map((x) => ({ t: x.text, e: x.english || x.translation || null })) })),
    ipa: (e.sounds || []).filter((s) => s.ipa).map((s) => ({ ipa: s.ipa, t: s.tags || [] })),
    audio: (e.sounds || []).filter((s) => s.audio && s.mp3_url).map((s) => ({ f: s.audio, t: s.tags || [], note: s.note || null, mp3: s.mp3_url })),
    forms: (e.forms || []).map((f) => ({ f: f.form, t: f.tags || [] })).slice(0, 12),
  });
}
writeFileSync(join(ROOT, 'corpus', 'canadian-src.json'), JSON.stringify(out));
console.log(`${out.length} entries for ${want.size} words`);
