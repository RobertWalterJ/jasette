// A list of the recordings that ship with the app, so it knows which ones are
// beside it and which must come from Wikimedia or Tatoeba.
//
//   node build/audio-index.mjs [folder]      writes <folder>/data/audio.json (default: app)

import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = join(ROOT, process.argv[2] || 'app');
const list = (d) => (existsSync(join(base, 'audio', d)) ? readdirSync(join(base, 'audio', d)).filter((f) => f.endsWith('.mp3')) : []);
const w = list('w');
const s = list('s').map((f) => +f.replace('.mp3', ''));
mkdirSync(join(base, 'data'), { recursive: true });
writeFileSync(join(base, 'data', 'audio.json'), JSON.stringify({ w, s }));
console.log(`${w.length} word recordings, ${s.length} sentence recordings indexed`);
