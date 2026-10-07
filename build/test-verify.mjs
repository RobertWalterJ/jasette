// Does the verifier actually fail when something is wrong?
//
//   node build/test-verify.mjs
//
// A check that has only ever passed has never been shown to work. This breaks
// fourteen things on purpose — one at a time, in a copy — and requires
// build/verify.mjs to report each of them. If any slips through, the build
// stops, because that is a hole in the thing the build relies on.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verify, sources } from './verify.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = JSON.parse(readFileSync(join(ROOT, 'app/data/deck.json'), 'utf8'));
const src = await sources();

const firstOf = (k, f = () => true) => base.items.findIndex((it) => it.k === k && f(it));
const cases = [
  ['a gloss no dictionary gives', (d) => { d.words[60].g = 'zebra crossing'; }, /gloss .* is not one Wiktionary gives|gloss/],
  ['a gender the sources do not agree on', (d) => { const w = d.words.find((x) => x.gen); w.gen = w.gen === 'm' ? 'f' : 'm'; }, /gender/],
  ['a conjugated form Wiktionary does not list', (d) => { const i = Number(Object.keys(d.conj)[3]); d.conj[i].pr[0] = 'xqzv'; }, /conjugated form/],
  ['a conjugation question whose answer is not in the verb', (d) => { const it = d.items[firstOf('conj-pick')]; it.answer = 'xqzv'; }, /not in the|blank|differ/],
  ['a sentence that is not Tatoeba\'s', (d) => { const it = d.items[firstOf('word-cloze')]; it.text += ' zzz'; }, /text differs|blank/],
  ['a recording that does not exist', (d) => { const it = d.items[firstOf('word-cloze', (x) => !x.audio)]; it.audio = 1; }, /recorded|licence/],
  ['an option that is the answer', (d) => { const it = d.items[firstOf('word-read')]; it.options[0] = d.words[it.i].g; }, /also an option|shares a meaning|repeat/],
  ['two right answers (an option that means the same)', (d) => { const w = d.words.find((x) => x.g === 'big'); const it = d.items.find((x) => x.k === 'word-read' && x.i === d.words.indexOf(w)); it.options[0] = 'big, thick'; }, /shares a meaning/],
  ['a grammar point with no question', (d) => { d.items = d.items.filter((it) => it.gid !== 'gender'); }, /no question inside the stage/],
  ['a spelling that is a real word', (d) => { const it = d.items[firstOf('spell-pick')]; it.options[0] = 'chat'; }, /real word/],
  ['a fill sentence that does not rebuild', (d) => { const it = d.items[firstOf('fill-multi')]; it.segs[0] = 'Zzz ' + it.segs[0]; }, /rebuild/],
  ['a build question with missing pieces', (d) => { const it = d.items[firstOf('grammar-build')]; it.pieces = it.pieces.slice(1); }, /do not rebuild|pieces/],
  ['a Canadian claim Wiktionary does not make', (d) => {}, /Wiktionary does not say/, (s) => ({ ...s, CANADIAN: s.CANADIAN.map((e) => (e.qc === 'dépanneur' ? { ...e, src: 'spaceship' } : e)) })],
  ['a typo in the interface', (d) => {}, /not a French spelling/, (s) => ({ ...s, STRINGS: { ...s.STRINGS, start: ['Comencer', 'Start'] } })],
];
let missed = 0;
const clean = await verify(structuredClone(base), src);
if (clean.errors.length) { console.log(`test-verify: the real deck already fails (${clean.errors.length} problems) — fix that first`); process.exit(1); }
for (const [name, mutate, expect, withSrc] of cases) {
  const d = structuredClone(base);
  mutate(d);
  const { errors } = await verify(d, withSrc ? withSrc(src) : src);
  const caught = errors.some((e) => expect.test(e));
  if (!caught) { missed++; console.log(`  MISSED  ${name}${errors.length ? ` (it reported other things: ${errors[0].slice(0, 70)})` : ''}`); }
}
if (missed) { console.log(`test-verify: ${missed} of ${cases.length} deliberate faults were not caught`); process.exit(1); }
console.log(`test-verify: all ${cases.length} deliberate faults caught`);
