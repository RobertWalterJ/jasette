// Fetch the OQLF open data the Québec track draws on.
//
//   node build/oqlf-src.mjs
//
// Source: Office québécois de la langue française, "Données linguistiques et terminologiques tirées de la
// Vitrine linguistique", published on Données Québec under CC BY-NC-SA 4.0 (attribution, non-commercial,
// share-alike). It is used here for a free personal learning app; anything derived from it carries the same
// licence and the attribution shown on the About screen.
//
// Two files only: the grammatical / ungrammatical phrases of the Banque de dépannage linguistique (5.4 MB)
// and the official terms of the Grand dictionnaire terminologique (0.5 MB). The 20 MB set of full
// terminology cards is technical vocabulary and is not used.
// Output: sources/oqlf/*.csv  (not committed; corpus/oqlf.json is built from them by build/oqlf-build.mjs)

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'sources', 'oqlf');
mkdirSync(DIR, { recursive: true });
const base = 'https://www.donneesquebec.ca/recherche/dataset/1c6567bf-8995-40b9-84a4-50faabae12f4/resource/';
const FILES = [
  ['bdl-phrases.csv', base + 'f91f62f6-2bed-4bf1-891b-51255bf5fbba/download/bdl-phrases-grammaticales-agrammaticales.csv'],
  ['termes-officialises.csv', base + '882453c2-93c3-4204-b5ff-6d6297082ad9/download/termes_officialises_2026-01-14.csv'],
];
for (const [name, url] of FILES) {
  if (existsSync(join(DIR, name)) && !process.argv.includes('--force')) { console.log(name + ': already here'); continue; }
  const r = await fetch(url, { headers: { 'User-Agent': 'Jasette/1.0 (personal French learning app)' } });
  if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(join(DIR, name), buf);
  console.log(`${name}: ${(buf.length / 1e6).toFixed(2)} MB`);
}
