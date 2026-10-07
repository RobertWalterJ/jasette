// A second opinion on the Canadian track.
//
//   node build/canadian-crosscheck.mjs
//
// Every claim in content/canadian.mjs is already checked against English
// Wiktionary (build/verify.mjs). That is one source. This asks a second,
// independent one — the French-language Wiktionnaire, written by francophones
// — whether the word is marked as Québec, Canada or North American usage in its
// own entry (its {{Québec|fr}}, {{Canada|fr}}, {{Amérique du Nord|fr}} labels, or a
// "(Québec)" gloss tag). The result goes to corpus/canadian-fr.json; the app
// shows "confirmé par le Wiktionnaire" where it holds, and says nothing where
// it does not (a missing label is not a contradiction: the Wiktionnaire is
// incomplete).

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const C = (await import(pathToFileURL(join(ROOT, 'content', 'canadian.mjs')).href)).default;
const UA = 'Jasette/1.0 (a personal language-learning app; wjster@gmail.com)';
const LABEL = /\{\{\s*(Québec|québécisme|Canada|canadianisme|Amérique du Nord|Acadie|Ontario)\s*(\||\}\})|\((Québec|Canada|Amérique du Nord)\)|québécisme|canadianisme/i;
const out = {};
let hit = 0;
for (const e of C) {
  const title = e.srcWord || e.qc;
  const url = `https://fr.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    const j = await r.json();
    const text = j.parse?.wikitext?.['*'] || '';
    // only the French section: the page may also carry other languages
    const fr = /==\s*\{\{langue\|fr\}\}\s*==([\s\S]*?)(?:\n==\s*\{\{langue\||$)/.exec(text)?.[1] || text;
    const marked = LABEL.test(fr);
    const which = (LABEL.exec(fr) || [])[0] || null;
    out[e.qc] = { page: !!text, marked, label: which };
    if (marked) hit++;
  } catch (err) { out[e.qc] = { page: false, marked: false, error: String(err.message || err) }; }
  await new Promise((ok) => setTimeout(ok, 250));
}
writeFileSync(join(ROOT, 'corpus', 'canadian-fr.json'), JSON.stringify(out, null, 1));
console.log(`${hit} of ${C.length} entries are marked as Québec, Canadian or North American in the Wiktionnaire's own entry`);
const none = C.filter((e) => !out[e.qc].marked).map((e) => e.qc);
console.log('not confirmed there (they stay Wiktionary-only):', none.join(', '));
