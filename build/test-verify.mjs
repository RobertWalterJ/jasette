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
  ['a drill whose answer is not the verb\'s form', (d) => { const it = d.items[firstOf('conj-drill', (x) => x.tense === 'pr')]; it.options[0] = it.answer; }, /options must be three different|is not the pr form/],
  ['a drill showing the wrong pronoun', (d) => { const it = d.items[firstOf('conj-drill', (x) => x.tense === 'pr' && x.slot === 1)]; it.text = 'nous ' + it.answer; }, /pronoun/],
  ['a subjunctive drill that does not elide', (d) => { const it = d.items[firstOf('conj-drill', (x) => x.tense === 'su' && x.slot === 2)]; it.text = it.text.replace('qu’il ', 'que il ').replace('qu’elle ', 'que elle ').replace('qu’on ', 'que on '); }, /pronoun/],
  ['an être participle that does not agree', (d) => { const it = d.items[firstOf('conj-drill', (x) => x.tense === 'pc' && x.slot === 5 && /^elles sont /.test(x.text))]; it.answer = it.answer.split(' ')[0] + ' ' + d.conj[it.v].pp; it.text = 'elles ' + it.answer; }, /participle|helper/],
  ['an imperative that keeps the s of an -er verb', (d) => { const it = d.items[firstOf('conj-drill', (x) => x.tense === 'ip' && x.slot === 1 && /e$/.test(x.answer))]; it.answer += 's'; it.text = it.answer + ' !'; }, /imperative should be/],
  ['an expression Wiktionary does not back', (d) => {}, /Wiktionary has no sense/, (s) => ({ ...s, EXPR_SRC: { ...s.EXPR_SRC, bol: s.EXPR_SRC.bol.map((e) => ({ ...e, senses: e.senses.map((x) => ({ ...x, g: x.g === 'luck' ? 'good fortune' : x.g })) })) } })],
  ['an origin the etymology does not support', (d) => {}, /does not mention/, (s) => ({ ...s, EXPR_SRC: { ...s.EXPR_SRC, bol: s.EXPR_SRC.bol.map((e) => ({ ...e, etym: 'Of unknown origin.' })) } })],
  ['a lesson that builds on a later step', (d) => { d.conjLadder[2].builds = [6]; }, /not an earlier one/],
  ['a lesson with no explanation', (d) => { d.conjLadder[4].teach.what = 'Short.'; }, /explanation is missing/],
  ['an expression question with a repeated meaning', (d) => { const it = d.items[firstOf('idiom-mean')]; it.options[1] = it.options[0]; }, /three different other meanings/],
  ['a repeat-after-me sentence with no recording', (d) => { const it = d.items[firstOf('sentence-repeat')]; it.audio = 0; }, /must be a recording/],
  ['a say-it sentence with no English', (d) => { const it = d.items[firstOf('sentence-say')]; it.eng = ''; }, /needs its English|translation differs/],
  ['a whole-tense table with a wrong form', (d) => { const it = d.items[firstOf('conj-row')]; it.answers[2] = 'xqzv'; it.bank[it.bank.indexOf(it.answers[2])] = 'xqzv'; }, /should be/],
  ['a table whose lines are in the wrong order', (d) => { const it = d.items[firstOf('conj-row', (x) => new Set(x.answers).size === 6)]; [it.answers[0], it.answers[1]] = [it.answers[1], it.answers[0]]; }, /should be/],
  ['a compound table for a verb that takes être', (d) => { const it = d.items[firstOf('conj-across', (x) => x.tenses.includes('pc'))]; it.v = d.words.findIndex((w) => w.w === 'aller'); }, /either helper/],
  ['a matching game with a repeated word', (d) => { const it = d.items[firstOf('match-pairs')]; it.ws[1] = it.ws[0]; }, /five different words/],
  ['a matching game with two ambiguous meanings', (d) => { const it = d.items[firstOf('match-pairs')]; d.words[it.ws[1]].g = d.words[it.ws[0]].g; }, /share a meaning/],
  ['a culture note whose source does not say it', (d) => {}, /does not contain/, (s) => ({ ...s, WIKI: { ...s.WIKI, Joual: { ...s.WIKI.Joual, text: 'An empty article.' } } })],
  ['a culture note naming an unbacked Québec word', (d) => {}, /not a backed entry/, (s) => ({ ...s, CULTURE: s.CULTURE.map((n, k) => (k === 6 ? { ...n, qc: ['zzzzz'] } : n)) })],
  ['an OQLF question whose right answer the OQLF calls wrong', (d) => { const it = d.items[firstOf('oqlf-correct')]; const t = it.text; it.text = it.options[0]; it.options[0] = t; }, /not labelled grammatical/],
  ['an OQLF question with a wrong option from another rule', (d) => { const a = d.items[firstOf('oqlf-correct')]; const b = d.items[d.items.findIndex((x, k) => x.k === 'oqlf-correct' && k > firstOf('oqlf-correct'))]; a.options[0] = b.options[0]; }, /not labelled ungrammatical/],
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
