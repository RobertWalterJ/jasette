// Pull the Wiktionary entries that content/expressions.mjs depends on, whole.
//
//   node build/expressions-src.mjs
//
// An expression is taught only if English Wiktionary says it means what we say. The entries
// needed are the phrase itself and the head words named in each `wik` and `etym`. This reads the
// 580 MB dump once and keeps glosses, tags, examples and etymology for those words.

import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPR = (await import(pathToFileURL(join(ROOT, 'content', 'expressions.mjs')).href)).default;
const want = new Set();
for (const e of EXPR) { want.add(e.fr); for (const w of e.wik) want.add(w.word); if (e.etym) want.add(e.etym.word); }
const out = {};
const rl = createInterface({ input: createReadStream(join(ROOT, 'sources', 'wiktionary', 'kaikki-french.jsonl'), 'utf8'), crlfDelay: Infinity });
for await (const line of rl) {
  const e = JSON.parse(line);
  if (e.lang_code !== 'fr' || !want.has(e.word)) continue;
  (out[e.word] ||= []).push({
    pos: e.pos,
    etym: e.etymology_text || '',
    senses: (e.senses || []).map((s) => ({
      g: (s.glosses || []).join(' › '), t: s.tags || [],
      ex: (s.examples || []).slice(0, 2).map((x) => ({ t: x.text, e: x.english || x.translation || '' })).filter((x) => x.t),
    })),
  });
}
writeFileSync(join(ROOT, 'corpus', 'expressions-src.json'), JSON.stringify(out));
const missing = [...want].filter((w) => !out[w]);
console.log(`${Object.keys(out).length} of ${want.size} entries found${missing.length ? '; no entry for: ' + missing.join(' · ') : ''}`);
