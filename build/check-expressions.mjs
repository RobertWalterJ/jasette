// Which expressions does Wiktionary back, and on what evidence?   node build/check-expressions.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { backing } from './lib/expressions.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPR = (await import(pathToFileURL(join(ROOT, 'content', 'expressions.mjs')).href)).default;
const SRC = JSON.parse(readFileSync(join(ROOT, 'corpus', 'expressions-src.json'), 'utf8'));
let ok = 0;
for (const e of EXPR) {
  const why = backing(e, SRC);
  if (why.length) { console.log(`  ✗ ${e.fr}: ${why.join('; ')}`); continue; }
  ok++;
  if (process.argv.includes('--show')) {
    const re = new RegExp(e.wik[0].has, 'i');
    const g = (SRC[e.wik[0].word] || []).flatMap((x) => x.senses).find((s) => re.test(s.g));
    console.log(`  ✓ ${e.fr}  ←  [${e.wik[0].word}] ${g.g.slice(0, 90)}`);
  }
}
console.log(`${ok} of ${EXPR.length} expressions are backed by Wiktionary`);
