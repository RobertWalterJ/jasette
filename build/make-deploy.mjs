// Write docs/ for GitHub Pages.
//
//   node build/make-deploy.mjs
//
// Pages serves this at https://robertwalterj.github.io/jasette/ — a SUBPATH.
// Everything is relative ('./sw.js', 'icons/…'), never '/…', which would work on
// localhost and break once deployed.
//
// What it makes, and why each piece is named as it is:
//   app.<hash>.js, style.<hash>.css, data/deck.<hash>.json, data/audio.<hash>.json
//       — named by content, so the service worker can serve them cache-first
//         and a changed file is a new name, never a stale copy;
//   index.html  — small, and fetched network-first, so a new deploy is noticed;
//   audio/…     — the recordings that ship with the app, in their own folder;
//   sw.js       — stamped with the build, with the hashed files in its shell.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'app');
const OUT = join(ROOT, 'docs');
const hash = (b) => createHash('sha256').update(b).digest('hex').slice(0, 10);

// The design note is written by hand and lives in docs/ too, so it is kept.
const design = existsSync(join(OUT, 'design.html')) ? readFileSync(join(OUT, 'design.html'), 'utf8') : null;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'data'), { recursive: true });
mkdirSync(join(OUT, 'icons'), { recursive: true });
if (design) writeFileSync(join(OUT, 'design.html'), design);

// THE AUDIO THAT SHIPS. Sentence clips all go. A word clip goes only if the provenance manifest
// (build/fetch-audio.mjs, build/audit-audio.mjs) confirms it is the recording of the word the deck
// says it is — a clip whose rank has shifted would play the wrong word, and the app would stream
// the right one instead. Then the index the app reads is made from what actually shipped.
const srcAudio = join(APP, 'audio');
if (existsSync(srcAudio)) {
  const mf = existsSync(join(srcAudio, 'w', '_manifest.json')) ? JSON.parse(readFileSync(join(srcAudio, 'w', '_manifest.json'), 'utf8')) : {};
  const plan = JSON.parse(readFileSync(join(ROOT, 'build', '_audio-plan.json'), 'utf8'));
  const slug = (x) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const expect = new Map(plan.words.map((w) => [w.q ? 'q-' + slug(w.q) + '.mp3' : w.a + '-' + (w.i + 1) + '.mp3', w.f]));
  mkdirSync(join(OUT, 'audio', 'w'), { recursive: true });
  let shipped = 0, held = 0;
  for (const n of readdirSync(join(srcAudio, 'w'))) {
    if (!n.endsWith('.mp3')) continue;
    if (mf[n] && mf[n] === expect.get(n)) { cpSync(join(srcAudio, 'w', n), join(OUT, 'audio', 'w', n)); shipped++; } else held++;
  }
  if (existsSync(join(srcAudio, 's'))) cpSync(join(srcAudio, 's'), join(OUT, 'audio', 's'), { recursive: true });
  console.log('word recordings: ' + shipped + ' confirmed and shipped, ' + held + ' held back (unverified, they stream instead)');
}
execFileSync(process.execPath, [join(ROOT, 'build', 'audio-index.mjs'), 'docs'], { stdio: 'inherit' });

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
let commit = 'local';
try {
  commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (execFileSync('git', ['status', '--porcelain', '--', 'app', 'content', 'build', ':!app/data', ':!app/audio'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()) commit += '+';
} catch { /* not a repo yet */ }
const d = new Date();
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// script
const js = (await build({ entryPoints: [join(APP, 'js', 'app.js')], bundle: true, format: 'esm', write: false, minify: true, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
const jsName = `app.${hash(js)}.js`;
writeFileSync(join(OUT, jsName), js);
// style
const css = readFileSync(join(APP, 'style.css'), 'utf8');
const cssName = `style.${hash(css)}.css`;
writeFileSync(join(OUT, cssName), css);
// data
const deck = readFileSync(join(APP, 'data', 'deck.json'));
const deckName = `data/deck.${hash(deck)}.json`;
writeFileSync(join(OUT, deckName), deck);
const aidx = readFileSync(join(OUT, 'data', 'audio.json'));
const aidxName = `data/audio.${hash(aidx)}.json`;
writeFileSync(join(OUT, aidxName), aidx);
rmSync(join(OUT, 'data', 'audio.json'));
// fonts and icons
cpSync(join(APP, 'fonts'), join(OUT, 'fonts'), { recursive: true });
for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']) cpSync(join(APP, 'icons', f), join(OUT, 'icons', f));
cpSync(join(APP, 'manifest.webmanifest'), join(OUT, 'manifest.webmanifest'));

// the page
const BUILD = JSON.stringify({ v: pkg.version, commit, date });
let html = readFileSync(join(APP, 'index.html'), 'utf8');
const sub = (a, b) => { if (!html.includes(a)) throw new Error('index.html is missing: ' + a); html = html.replace(a, () => b); };
sub('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="${cssName}">`);
sub('<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">', '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="apple-mobile-web-app-capable" content="yes">');
sub('<script type="module" src="js/app.js"></script>', `<script>window.JASETTE_BUILD=${BUILD};window.JASETTE_DECK_URL=${JSON.stringify(deckName)};window.JASETTE_AUDIO_INDEX=${JSON.stringify(aidxName)};</script>\n<script type="module" src="${jsName}"></script>`);
if (/(href|src)="\/(?!\/)/.test(html)) throw new Error('a root-absolute URL would break under /jasette/');
writeFileSync(join(OUT, 'index.html'), html);


// the service worker, with the build in its name and the hashed files in its shell
let sw = readFileSync(join(APP, 'sw.js'), 'utf8');
const stamp = `jasette-v-${pkg.version}-${hash(js + css + deck)}`;
sw = sw.replace("'jasette-v-dev'", JSON.stringify(stamp));
sw = sw.replace("'icons/icon-512.png']", `'icons/icon-512.png', ${JSON.stringify(jsName)}, ${JSON.stringify(cssName)}, ${JSON.stringify(deckName)}, ${JSON.stringify(aidxName)}, 'fonts/fonts.css', 'fonts/atkinson-hyperlegible-latin-400.woff2', 'fonts/atkinson-hyperlegible-latin-700.woff2', 'fonts/fraunces-latin.woff2']`);
if (!sw.includes(jsName)) throw new Error('the shell list in sw.js was not extended');
writeFileSync(join(OUT, 'sw.js'), sw);
writeFileSync(join(OUT, '.nojekyll'), '');

// Everything the worker precaches must exist.
const list = [...(sw.match(/const SHELL = \[([^\]]*)\]/)?.[1] || '').matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] || m[2]).filter((u) => u !== './');
const missing = list.filter((u) => !existsSync(join(OUT, u)));
if (missing.length) throw new Error('the service worker precaches files that do not exist: ' + missing.join(', '));

const mb = (p) => statSync(p).size / 1048576;
const folderMb = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).reduce((n, f) => { try { const p = join(dir, f); return n + (statSync(p).isFile() ? statSync(p).size : 0); } catch { return n; } }, 0) / 1048576 : 0);
console.log(`wrote docs/ — v${pkg.version} ${commit}; page ${(mb(join(OUT, 'index.html')) * 1024).toFixed(1)} KB, script ${(mb(join(OUT, jsName)) * 1024).toFixed(0)} KB, deck ${mb(join(OUT, deckName)).toFixed(1)} MB, audio ${folderMb(join(OUT, 'audio')).toFixed(0)} MB`);
