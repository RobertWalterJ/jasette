// Fetch the Wikipedia article text that content/culture.mjs is written from.
//
//   node build/culture-src.mjs
//
// Wikipedia text is CC BY-SA 4.0. The culture notes are written in this app's own words, each one naming
// the article it rests on, and build/verify.mjs checks that every claim's key phrase really appears in the
// article text saved here (with its revision id), so a note cannot say something the source does not.
// Output: corpus/culture-wikipedia.json  { title: { revid, url, text } }

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTES = (await import(pathToFileURL(join(ROOT, 'content', 'culture.mjs')).href)).default;
// (with page titles on the command line it fetches those instead: how a new topic is first read)
const titles = process.argv.length > 2 ? process.argv.slice(2) : [...new Set(NOTES.flatMap((n) => n.facts.map((f) => f.page)))];
const out = {};
for (const title of titles) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts%7Crevisions&explaintext=1&rvprop=ids&titles=${encodeURIComponent(title)}&format=json&redirects=1`;
  let r;
  for (let attempt = 1; attempt <= 6; attempt++) {                  // polite: back off when asked to
    r = await fetch(url, { headers: { 'User-Agent': 'Jasette/1.0 (personal French learning app; github.com/RobertWalterJ/jasette)' } });
    if (r.status !== 429 && r.status < 500) break;
    const wait = (Number(r.headers.get('retry-after')) || 6 * attempt) * 1000;
    console.log(`${title}: HTTP ${r.status}, waiting ${wait / 1000}s`);
    await new Promise((res) => setTimeout(res, wait));
  }
  if (!r.ok) throw new Error(`${title}: HTTP ${r.status}`);
  const d = await r.json();
  const p = Object.values(d.query.pages)[0];
  if (!p.extract) throw new Error(`${title}: no article text`);
  out[title] = { title: p.title, revid: p.revisions?.[0]?.revid, url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')), text: p.extract };
  console.log(`${title}: ${p.extract.length} chars, revision ${out[title].revid}`);
  await new Promise((res) => setTimeout(res, 2500));
}
writeFileSync(join(ROOT, 'corpus', 'culture-wikipedia.json'), JSON.stringify(out));
