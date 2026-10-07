// The app icon: a white fleur-de-lis on Québec blue.
//
//   node build/make-icons.mjs
//
// One SVG, rendered at the sizes a phone wants. The maskable icon keeps the
// mark inside the central 60% so a round or squircle crop never clips it.

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'app', 'icons');
mkdirSync(OUT, { recursive: true });

const FLEUR = `<path d="M12 1.6c2 2.3 3 4.5 3 6.5 0 1.6-.7 3-3 4.5-2.3-1.5-3-2.9-3-4.5 0-2 1-4.2 3-6.5z"/><path d="M7.4 6.6C4.8 7.3 3.2 9 3.2 11.4c0 2.2 1.6 3.8 4 3.8 1.3 0 2.3-.4 3.1-1.1-2-.3-3.3-1.4-3.6-3.3-.2-1.6.2-3 .7-4.2z"/><path d="M16.6 6.6c2.6.7 4.2 2.4 4.2 4.8 0 2.2-1.6 3.8-4 3.8-1.3 0-2.3-.4-3.1-1.1 2-.3 3.3-1.4 3.6-3.3.2-1.6-.2-3-.7-4.2z"/><rect x="7.6" y="15.5" width="8.8" height="1.9" rx=".7"/><path d="M12 17.8c1.6 1 2.7 2.5 2.9 4.6-1-.7-1.9-1-2.9-1s-1.9.3-2.9 1c.2-2.1 1.3-3.6 2.9-4.6z"/>`;
const svg = (size, scale, round) => {
  const s = size, m = (s * scale) / 24, off = (s - 24 * m) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1558D0"/><stop offset="1" stop-color="#0A3C95"/></linearGradient></defs>
  <rect width="${s}" height="${s}" ${round ? `rx="${s * 0.22}"` : ''} fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${m})" fill="#fff">${FLEUR}</g></svg>`);
};
const jobs = [['icon-192.png', 192, 0.62, true], ['icon-512.png', 512, 0.62, true], ['icon-maskable-512.png', 512, 0.5, false], ['apple-touch-icon.png', 180, 0.62, false]];
for (const [name, size, scale, round] of jobs) { await sharp(svg(size, scale, round)).png().toFile(join(OUT, name)); console.log('wrote', name); }
