// Which meaning of a word is the one people mean.
//
//   node build/senses.mjs      (after build/extract.mjs)
//
// A dictionary lists what a word CAN mean, in an order a lexicographer chose.
// Wiktionary's first sense for haricot is a lamb stew. What a learner needs is
// the sense the word carries when it is actually used — and that is something
// 378,000 translated sentences can say.
//
// For every lemma, every inflected spelling of it is found in the French side
// of Tatoeba, and the English side of those pairs is gathered into a bag of
// words. Each Wiktionary sense is then scored by how much of its English gloss
// turns up in that bag. A sense the translators never reach for scores nothing.
//
// This is used to RANK and to VETO senses that a dictionary gives. It is never
// used as a gloss: every meaning the app teaches is still one Wiktionary gives
// that lemma. (The same design as Hok Gong's Hambaanglaang counts.)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'corpus', f), 'utf8'));
const LEX = read('lexicon.json');
const SPELL = read('spellings.json');
const SENT = read('sentences.json');

const STOP = new Set('a an the to of in on at by for with from or and as is are be been being it its that this these those one ones someone something somebody thing things etc especially usually often used use uses using especially more most very who whom whose which what when where while will would can could may might must shall should do does did have has had not no yes out up down off over under into onto about than then there their they them he she his her hers him we us our you your i me my so but if any some such other another also just only own same'.split(' '));
const IRREG = {
  go: 'go went gone going goes', be: 'be is are was were been being am', have: 'have has had having', do: 'do does did done doing', see: 'see saw seen seeing sees',
  take: 'take took taken taking takes', come: 'come came coming comes', say: 'say said saying says', make: 'make made making makes', give: 'give gave given giving gives',
  know: 'know knew known knowing knows', think: 'think thought thinking thinks', get: 'get got gotten getting gets', find: 'find found finding finds', tell: 'tell told telling tells',
  leave: 'leave left leaving leaves', put: 'put putting puts', bring: 'bring brought bringing brings', buy: 'buy bought buying buys', eat: 'eat ate eaten eating eats',
  drink: 'drink drank drunk drinking drinks', write: 'write wrote written writing writes', read: 'read reading reads', run: 'run ran running runs', sit: 'sit sat sitting sits',
  stand: 'stand stood standing stands', win: 'win won winning wins', lose: 'lose lost losing loses', pay: 'pay paid paying pays', meet: 'meet met meeting meets',
  hold: 'hold held holding holds', keep: 'keep kept keeping keeps', begin: 'begin began begun beginning begins', speak: 'speak spoke spoken speaking speaks', hear: 'hear heard hearing hears',
  feel: 'feel felt feeling feels', send: 'send sent sending sends', build: 'build built building builds', fall: 'fall fell fallen falling falls', grow: 'grow grew grown growing grows',
  child: 'child children', man: 'man men', woman: 'woman women', person: 'person people', foot: 'foot feet', tooth: 'tooth teeth', mouse: 'mouse mice', life: 'life lives', wife: 'wife wives', knife: 'knife knives',
  good: 'good better best', bad: 'bad worse worst', much: 'much more most', many: 'many more most', little: 'little less least',
};
const irregOf = new Map();
for (const [base, forms] of Object.entries(IRREG)) for (const f of forms.split(' ')) irregOf.set(f, base);
// A crude stemmer is enough: both sides of every comparison go through it, so
// what matters is only that arrive, arrives, arrived and arriving all meet.
const undouble = (b) => (/(.)\1$/.test(b) && !/(ss|ll|ff|zz)$/.test(b) ? b.slice(0, -1) : b);
const stem = (w) => {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (irregOf.has(w)) return irregOf.get(w);
  let r = w;
  if (w.length > 4 && w.endsWith('ies')) r = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ing')) r = undouble(w.slice(0, -3));
  else if (w.length > 3 && w.endsWith('ied')) r = w.slice(0, -3) + 'y';
  else if (w.length > 3 && w.endsWith('ed')) r = undouble(w.slice(0, -2));
  else if (w.length > 3 && w.endsWith('es')) r = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) r = w.slice(0, -1);
  if (r.length > 3 && r.endsWith('e')) r = r.slice(0, -1);
  return r;
};
const keywords = (g) => {
  const out = new Set();
  // The gloss up to its first parenthesis or semicolon-clause is the sense
  // itself; what follows is a clarification ("to go; to attend …").
  for (const clause of g.replace(/\([^)]*\)/g, ' ').split(/[;,]/)) {
    for (const w of clause.split(/[^A-Za-z]+/)) { if (w && !STOP.has(w.toLowerCase()) && w.length > 1) out.add(stem(w)); }
  }
  return [...out];
};

// ── French spelling → the lexicon entries it can be ──────────────────────
const key = (e) => e.w + '|' + e.c;
const byKey = new Map(LEX.map((e) => [key(e), e]));
const bags = new Map();               // key -> Map(stem -> count)
const nSent = new Map();
const tok = (t) => t.toLowerCase().replace(/’/g, "'").replace(/œ/g, 'oe').split(/[^a-zàâäæçéèêëîïôöœùûüÿ'-]+/).flatMap((x) => (x.includes("'") ? x.split(/(?<=')/) : [x])).filter(Boolean);
let used = 0;
for (const s of SENT) {
  if (s.t.length > 90) continue;
  const en = [...new Set(s.e.split(/[^A-Za-z]+/).filter((w) => w && !STOP.has(w.toLowerCase())).map(stem))];
  if (!en.length) continue;
  used++;
  const seen = new Set();
  for (const w of tok(s.t)) {
    const hits = SPELL[w];
    if (!hits) continue;
    // Only the commonest reading of a spelling is trusted: "est" is the verb.
    const [l, c] = hits[0];
    const k = l + '|' + c;
    if (seen.has(k) || !byKey.has(k)) continue;
    seen.add(k);
    let b = bags.get(k);
    if (!b) { b = new Map(); bags.set(k, b); nSent.set(k, 0); }
    nSent.set(k, nSent.get(k) + 1);
    for (const x of en) b.set(x, (b.get(x) || 0) + 1);
  }
}
console.log(`${used.toLocaleString()} sentences read; ${bags.size.toLocaleString()} lemmas have evidence`);

// ── score every sense ────────────────────────────────────────────────────
const out = {};
for (const e of LEX) {
  const k = key(e);
  const b = bags.get(k);
  const n = nSent.get(k) || 0;
  out[k] = e.senses.map((s, i) => {
    const kw = keywords(s.g);
    // The share of this lemma's sentences whose translation carries any of the
    // sense's own words. Max over the sense's words rather than the sum, so a
    // gloss with five synonyms is not five times as likely as one with one.
    let ev = 0;
    if (b && n) for (const x of kw) ev = Math.max(ev, (b.get(x) || 0) / n);
    return { i, ev: +ev.toFixed(3), kw };
  });
  out[k].n = n;
}
writeFileSync(join(ROOT, 'corpus', 'senses.json'), JSON.stringify(out));
console.log('wrote corpus/senses.json');
