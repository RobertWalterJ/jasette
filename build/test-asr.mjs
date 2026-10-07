// Does the recognition scoring judge a spoken sentence fairly?   node build/test-asr.mjs
//
// The phone returns what it thinks you said; `similar` decides how much of the target sentence that
// covers. Too strict and a learner is marked wrong for a recogniser's slip; too lax and a wrong
// sentence passes. Checked on known cases, including the things a recogniser really does: drops a
// small word, swaps an accent, adds a filler, hears a near-word.

import { similar, matches, verdict, clean } from '../app/js/asr.js';

const T = 'Je voudrais un café, s’il vous plaît.';
const cases = [
  ['exact', T, ['je voudrais un café s’il vous plaît'], 'hit'],
  ['accents and case do not matter', T, ['Je voudrais un cafe s il vous plait'], 'hit'],
  ['a filler word added', T, ['euh je voudrais un café s’il vous plaît'], 'hit'],
  ['one small word dropped (7 of 7 words minus 1)', T, ['je voudrais café s’il vous plaît'], 'close'],
  ['half of it', T, ['je voudrais un'], 'miss'],
  ['something else entirely', T, ['il fait beau aujourd’hui'], 'miss'],
  ['the best of several alternatives is used', T, ['je voudrais un café', 'je voudrais un café s’il vous plaît'], 'hit'],
  ['a near-word (one letter) still counts', 'Elle mange une pomme.', ['elle mange une pommes'], 'hit'],
  ['words in the wrong order lose credit', 'Elle mange une pomme.', ['pomme une mange elle'], 'miss'],
  ['nothing heard', T, [], 'miss'],
];
const fails = [];
let checks = 0;
for (const [name, target, heard, want] of cases) {
  checks++;
  const r = similar(target, heard);
  const got = verdict(r.score);
  if (got !== want) fails.push(`${name}: expected ${want}, got ${got} (${r.score.toFixed(2)})`);
}
// which words were missed
checks++;
const r = similar('Je voudrais un café', ['je voudrais café']);
if (r.words.map((w) => (w.hit ? '1' : '0')).join('') !== '1101') fails.push('the missed word is not the one reported: ' + JSON.stringify(r.words));
// the learner sees the sentence as written (accents, capitals, punctuation), with the missed piece marked
checks++;
const p = similar('Elle vit à Kyoto.', ['elle vit a']).pieces;
if (p.map((x) => `${x.show}:${x.hit ? 1 : 0}`).join(' ') !== 'Elle:1 vit:1 à:1 Kyoto.:0') fails.push('pieces are not shown as written: ' + JSON.stringify(p));
checks++;
const p2 = similar('Je voudrais un café, s’il vous plaît.', ['je voudrais un café s il vous plait']).pieces;
if (!p2.every((x) => x.hit)) fails.push('an elided s’il heard as "s il" should still count: ' + JSON.stringify(p2));
// the single-word matcher keeps its rules
checks += 3;
if (!matches('chat', ['le chat']).hit) fails.push('a word inside a longer utterance should match');
if (matches('chat', ['chien']).hit) fails.push('a different word must not match');
if (clean('L’été, œuf !') !== 'lete oeuf') fails.push('clean(): ' + clean('L’été, œuf !'));
if (fails.length) { console.error('test-asr FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log(`test-asr: ${checks} checks — a spoken sentence is judged word by word, and a missed word is named.`);
