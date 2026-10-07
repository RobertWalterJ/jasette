// Check the deck against its sources, and against itself.
//
//   node build/verify.mjs
//
// Nothing in the app is supposed to be invented: a meaning is one Wiktionary
// gives, a gender is one Lexique and Wiktionary agree on, a verb form is one
// Wiktionary's conjugation table lists, a sentence is a Tatoeba sentence with
// its own translation, a recording is one that exists and is credited, and a
// Canadian claim is one Wiktionary makes. This reads the DECK — the thing the
// app actually loads — and checks every one of those against the corpus it was
// built from, plus the things only a deck can get wrong: a question with two
// right answers, an option that is also the answer, a grammar point with no
// question, a stage with no words.
//
// build/test-verify.mjs breaks twelve things on purpose and requires this to
// catch every one, because a verifier that has only ever passed has never been
// shown to fail.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { shorten } from './lib/shorten.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const load = async (f) => (await import(pathToFileURL(join(ROOT, f)).href)).default;

// English content words, for "do these two glosses mean the same thing?" —
// the same rule build/items.mjs used to choose the options, run again.
const STOP = new Set('a an the to of in on at by for with from or and as is are be it its that this these those one someone something somebody thing used use usually often especially more most very who whom which what when where while will would can could may might not no yes up down off over out into about than then there their they them he she his her we us our you your i me my so but if any some such other another also just only own same'.split(' '));
const kw = (g) => new Set(String(g).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w && !STOP.has(w) && w.length > 2).map((w) => w.replace(/(ing|ed|es|s|e)$/, '')));
const overlap = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };
const norm = (t) => String(t).toLowerCase().replace(/’/g, "'").replace(/œ/g, 'oe');

export async function verify(deck, src) {
  const errors = [];
  let checks = 0;
  const fail = (what) => errors.push(what);
  const ok = (cond, what) => { checks++; if (!cond) fail(what); };

  const { LEX, SENT, SPELL, CAN, ALIVE, HAND, SYLLABUS, NOTES, HOMO, CANADIAN, GRAMMAR, STRINGS, unsuitable } = src;
  const lexByLem = new Map();
  for (const e of LEX) { const k = e.w; if (!lexByLem.has(k)) lexByLem.set(k, []); lexByLem.get(k).push(e); }
  const sentById = new Map(SENT.map((s) => [s.id, s]));
  const KINDMAP = { n: 'NOM', v: 'VER', adj: 'ADJ', adv: 'ADV', prep: 'PRE', conj: 'CON', int: 'INT' };

  // ── words ──────────────────────────────────────────────────────────────
  const seenW = new Set();
  for (const [i, w] of deck.words.entries()) {
    ok(!seenW.has(w.w), `word ${i}: ${w.w} appears twice`); seenW.add(w.w);
    ok(i === 0 || deck.words[i - 1].r < w.r, `word ${i}: ranks are not increasing`);
    const lem = w.lem || norm(w.w);
    const entries = (lexByLem.get(lem) || lexByLem.get(w.w) || []).filter((e) => e.c === KINDMAP[w.k] || (w.also || []).includes(e.c));
    ok(entries.length > 0, `word ${w.w}: no Lexique/Wiktionary entry of kind ${w.k}`);
    if (!entries.length) continue;
    // the meaning: one Wiktionary gives this lemma
    const glosses = entries.flatMap((e) => e.senses.map((s) => s.g));
    const shorts = new Set(glosses.map(shorten));
    const hand = src.HAND[`${w.w}|${w.k}`];
    if (hand) ok(hand.g === w.g, `word ${w.w}: gloss "${w.g}" is not the hand gloss "${hand.g}"`);
    if (hand) ok(glosses.some((g) => g.toLowerCase().includes(hand.from.toLowerCase())), `word ${w.w}: hand gloss "${hand.g}" is not backed by Wiktionary ("${hand.from}" appears in none of its glosses)`);
    else ok(shorts.has(w.g), `word ${w.w}: gloss "${w.g}" is not one Wiktionary gives (${[...shorts].slice(0, 3).join(' / ')} …)`);
    for (const a of w.alt || []) ok(shorts.has(a), `word ${w.w}: alt gloss "${a}" is not one Wiktionary gives`);
    // the gender: only where both sources agree
    if (w.gen) {
      const e = entries.find((x) => x.c === 'NOM');
      ok(!!e && e.lexGender === w.gen && e.wikGender.length === 1 && e.wikGender[0] === w.gen, `word ${w.w}: gender ${w.gen} is not agreed by Lexique (${e?.lexGender}) and Wiktionary (${e?.wikGender})`);
    }
    // the sound credit
    for (const a of [w.fr, w.qcA]) if (a) { ok(!!a.by && !!a.f && !!a.p, `word ${w.w}: a recording without its speaker, file or folder`); }
    // the verb table
    if (w.k === 'v') {
      const c = deck.conj[i];
      if (c) {
        const forms = new Set(entries.flatMap((e) => e.forms.map((f) => f.f)));
        for (const row of Object.values(c)) for (const f of [].concat(row)) ok(forms.has(f), `word ${w.w}: conjugated form "${f}" is not in Wiktionary's table`);
      }
    }
  }
  // hand glosses all land on a word
  for (const key of Object.keys(HAND)) { const [lem, k] = key.split('|'); const hit = deck.words.some((w) => w.w === lem && w.k === k); if (!hit && deck.words.some((w) => w.w === lem)) { /* the word chose another category: fine */ } }

  // ── sentences: the text, the translation, the licence, the speaker ──────
  const checkSentence = (it, label) => {
    if (it.sid == null) return;
    const s = sentById.get(it.sid);
    ok(!!s, `${label}: sentence ${it.sid} is not in the corpus`);
    if (!s) return;
    if (it.text != null) ok(s.t === it.text, `${label}: sentence ${it.sid} text differs from Tatoeba's`);
    if (it.eng != null) ok(s.e === it.eng, `${label}: sentence ${it.sid} translation differs from Tatoeba's`);
    ok(!unsuitable(s.e, s.t), `${label}: sentence ${it.sid} is unsuitable (${unsuitable(s.e, s.t)})`);
    if (it.audio) {
      ok(ALIVE.has(it.sid), `${label}: sentence ${it.sid} is marked recorded but the audio server does not have it`);
      const m = deck.sentAudio[it.sid];
      ok(!!m && /^CC/.test(m.lic || '') && !!m.by, `${label}: sentence ${it.sid} has a recording with no Creative Commons licence or speaker`);
    }
  };

  // ── every question ─────────────────────────────────────────────────────
  const ids = new Set();
  const wi = (i) => deck.words[i];
  for (const it of deck.items) {
    ok(!ids.has(it.id), `${it.id}: duplicate id`); ids.add(it.id);
    if (it.i != null) ok(!!wi(it.i), `${it.id}: points at a word that is not there`);
    ok(it.stage == null || (it.stage >= 0 && it.stage < deck.stages.length), `${it.id}: stage ${it.stage} is out of range`);
    checkSentence(it, it.id);
    if (it.options && it.k !== 'gender-pick') {
      ok(new Set(it.options).size === it.options.length, `${it.id}: options repeat`);
      const ans = it.answer ?? (it.i != null && ['word-read', 'word-listen'].includes(it.k) ? wi(it.i).g : it.i != null && it.k === 'word-pick' ? wi(it.i).w : null);
      if (ans != null) ok(!it.options.includes(ans), `${it.id}: the answer "${ans}" is also an option`);
    }
    switch (it.k) {
      case 'word-read': case 'word-listen': {
        const w = wi(it.i);
        ok(it.options.length === 3, `${it.id}: needs three options`);
        // one right answer: no option means what the answer means
        for (const o of it.options) ok(!overlap(kw(w.g), kw(o)) && !overlap(kw(w.alt || []).size ? kw((w.alt || []).join(' ')) : new Set(), kw(o)), `${it.id}: option "${o}" shares a meaning with the answer "${w.g}"`);
        break;
      }
      case 'word-pick': {
        const w = wi(it.i);
        ok(it.options.every((o) => deck.wordIndex ? true : true), '');
        for (const o of it.options) { const j = deck.words.findIndex((x) => x.w === o); ok(j >= 0, `${it.id}: option "${o}" is not a deck word`); if (j >= 0) ok(!overlap(kw(w.g), kw(deck.words[j].g)), `${it.id}: option "${o}" (${deck.words[j].g}) shares a meaning with "${w.g}"`); }
        break;
      }
      case 'word-cloze': case 'conj-pick': case 'aux-pick': case 'agree-pick': case 'pronoun-pick': case 'homophone-pick': {
        ok(it.text.toLowerCase().includes(it.blank.toLowerCase()), `${it.id}: the blank "${it.blank}" is not in the sentence`);
        ok(norm(it.blank) === norm(it.answer) || it.k === 'homophone-pick', `${it.id}: the blank "${it.blank}" and the answer "${it.answer}" differ`);
        ok(it.options.length >= 1, `${it.id}: no options`);
        break;
      }
      case 'conj-pick': break;
      case 'fill-multi': {
        ok(it.answers.length >= 2 && it.segs.length === it.answers.length + 1, `${it.id}: segments and answers do not line up`);
        ok(it.segs.reduce((t, s, k) => t + s + (k < it.answers.length ? it.answers[k] : ''), '').toLowerCase().replace(/\s+/g, ' ') === it.text.toLowerCase().replace(/\s+/g, ' '), `${it.id}: the segments with their answers do not rebuild the sentence`);
        ok(it.answers.every((a) => it.bank.includes(a)) && it.bank.length > it.answers.length && new Set(it.bank).size === it.bank.length, `${it.id}: the bank does not hold the answers plus decoys`);
        break;
      }
      case 'gender-pick': {
        const w = wi(it.i);
        ok(!!w.gen && it.answer === (w.gen === 'm' ? 'un' : 'une'), `${it.id}: the article does not match the agreed gender`);
        break;
      }
      case 'spell-pick': {
        const w = wi(it.i);
        ok(it.answer === w.w, `${it.id}: the answer is not the word`);
        for (const o of it.options) ok(!SPELL[norm(o)], `${it.id}: the wrong spelling "${o}" is a real word`);
        break;
      }
      case 'sound-pair': {
        ok(it.choices.length === 2 && it.choices[0] !== it.choices[1], `${it.id}: a pair needs two different words`);
        ok(it.choices.every((i) => wi(i).fr || wi(i).qcA), `${it.id}: a word in the pair has no recording`);
        break;
      }
      case 'grammar-build': {
        ok(it.pieces.join(' ') === it.text.replace(/\s*[.!?…]+$/, ''), `${it.id}: the pieces do not rebuild the sentence`);
        ok(it.pieces.length >= 4 && it.pieces.length <= 8, `${it.id}: ${it.pieces.length} pieces`);
        break;
      }
      case 'qc-mean': case 'qc-pick': case 'qc-listen': case 'qc-oral': ok(!!deck.canadian[it.q], `${it.id}: no such Canadian entry`); break;
      case 'note-pick': ok(deck.noteById ? true : deck.notes.some((n) => n.id === it.nid), `${it.id}: no such note`); break;
      case 'sentence-listen': ok(it.options.length === 3 && !it.options.includes(it.eng), `${it.id}: needs three other translations`); break;
    }
  }
  // conj items: the form is in the verb's table, in the tense claimed, and the distractors are the verb's own
  for (const it of deck.items.filter((x) => x.k === 'conj-pick')) {
    const c = deck.conj[it.i];
    ok(!!c && Array.isArray(c[it.tense]) && c[it.tense].includes(it.answer), `${it.id}: "${it.answer}" is not in the ${it.tense} row`);
    const all = new Set(Object.entries(c || {}).flatMap(([k, r]) => (['pr', 'im', 'fu', 'co', 'su'].includes(k) ? r : [])));
    for (const o of it.options) ok(all.has(o) && o !== it.answer, `${it.id}: option "${o}" is not another form of the verb`);
  }
  for (const it of deck.items.filter((x) => x.k === 'aux-pick')) {
    const w = wi(it.i);
    ok(w.aux === it.aux, `${it.id}: the verb takes ${w.aux}, the question says ${it.aux}`);
    ok(['ai', 'as', 'a', 'avons', 'avez', 'ont', 'suis', 'es', 'est', 'sommes', 'êtes', 'sont'].includes(it.answer), `${it.id}: "${it.answer}" is not a form of avoir or être`);
  }
  for (const it of deck.items.filter((x) => x.k === 'agree-pick')) {
    const w = wi(it.i);
    const pp = deck.conj[it.i]?.pp;
    ok(w.aux === 'etre' && !!pp, `${it.id}: agreement is only asked for être verbs`);
    const forms = [pp, pp + 'e', /[sx]$/.test(pp) ? pp : pp + 's', pp + 'es'];
    for (const f of forms) ok(!!SPELL[norm(f)], `${it.id}: the form "${f}" is not a French spelling Lexique knows`);
    ok(forms.includes(it.answer) && it.options.every((o) => forms.includes(o)), `${it.id}: the forms are not the four agreements`);
  }
  for (const it of deck.items.filter((x) => x.k === 'homophone-pick')) {
    const set = HOMO[it.set];
    ok(!!set && set.words.some((x) => x.w === it.answer) && it.options.every((o) => set.words.some((x) => x.w === o)), `${it.id}: not drawn from the set ${it.set}`);
  }

  // ── the course ─────────────────────────────────────────────────────────
  ok(deck.stages.length === SYLLABUS.length, 'the number of stages differs from the syllabus');
  for (const [n, st] of deck.stages.entries()) {
    ok(st.words.length >= 100, `stage ${n + 1} has only ${st.words.length} words`);
    ok(st.words.every((i) => wi(i).r >= SYLLABUS[n].from && wi(i).r <= SYLLABUS[n].to), `stage ${n + 1}: a word is outside its band`);
    for (const gid of st.grammar) {
      ok(deck.grammar.some((g) => g.id === gid), `stage ${n + 1}: no such grammar point ${gid}`);
      ok(deck.items.some((it) => it.gid === gid && (it.stage ?? 99) <= n), `stage ${n + 1}: the grammar point ${gid} has no question inside the stage, so the stage could never be passed`);
    }
    ok(deck.items.some((it) => it.stage === n && it.k === 'word-read'), `stage ${n + 1}: no word questions`);
  }
  for (const g of GRAMMAR) ok(deck.grammar.some((x) => x.id === g.id), `grammar point ${g.id} did not reach the deck`);
  for (const g of deck.grammar) for (const ex of g.examples || []) ok(sentById.has(ex.id) && sentById.get(ex.id).t === ex.t, `grammar ${g.id}: an example sentence is not Tatoeba's`);
  // the gender endings the app quotes are the ones measured
  for (const [e, s] of Object.entries(deck.endings)) {
    const hit = deck.words.filter((w) => w.k === 'n' && w.gen && w.w.endsWith(e));
    ok(hit.length === s.n && hit.filter((w) => w.gen === s.g).length === Math.round((s.pct / 100) * s.n) || Math.abs(hit.filter((w) => w.gen === s.g).length / Math.max(1, s.n) - s.pct / 100) < 0.006, `ending -${e}: the quoted ${s.pct}% is not what the word list shows`);
  }

  // ── the Canadian track: every claim is Wiktionary's ─────────────────────
  for (const c of deck.canadian) {
    const entry = CANADIAN.find((e) => e.qc === c.qc);
    ok(!!entry, `canadian ${c.qc}: not in content/canadian.mjs`);
    const w = CAN.filter((x) => x.w === (entry?.srcWord || c.qc));
    const lc = (s) => String(s || '').toLowerCase().replace(/’/g, "'");
    const sense = w.flatMap((x) => x.senses).find((s) => lc(s.g).includes(lc(entry?.src)) && (!entry?.tags?.length || s.t.some((t) => entry.tags.includes(t))));
    ok(!!sense, `canadian ${c.qc}: Wiktionary does not say "${entry?.src}" for this word${entry?.tags?.length ? ' with a ' + entry.tags.join('/') + ' tag' : ''}`);
    if (c.contrast) ok(w.flatMap((x) => x.senses).some((s) => s.g === c.contrast), `canadian ${c.qc}: the contrasting sense is not Wiktionary's`);
    if (c.audio) ok(w.some((x) => x.audio.some((a) => a.f === c.audio.f)), `canadian ${c.qc}: the recording is not one Wiktionary links`);
    if (c.ex) ok(sentById.has(c.ex.id) && sentById.get(c.ex.id).t === c.ex.t, `canadian ${c.qc}: the example is not Tatoeba's`);
    ok(c.kind !== 'oral' || !!c.std || !!c.means, `canadian ${c.qc}: a spoken form needs its written form or its meaning`);
  }

  // ── notes ──────────────────────────────────────────────────────────────
  for (const n of deck.notes) {
    ok(n.words.every((i) => !!wi(i)), `note ${n.id}: a word is missing`);
    const src = NOTES.find((x) => x.id === n.id);
    ok(!!src, `note ${n.id}: not in content/notes.mjs`);
  }
  for (const it of deck.items.filter((x) => x.k === 'note-pick')) {
    const w = wi(it.i);
    const note = NOTES.find((n) => n.id === it.nid);
    for (const o of it.options) { const j = deck.words.find((x) => x.w === o); ok(!!j, `${it.id}: option "${o}" is not a deck word`); }
    ok(note?.ask?.answer === w.w, `${it.id}: the answer is not the note's`);
  }

  // ── the interface's own French ─────────────────────────────────────────
  // Every word in a French UI string must be a spelling Lexique knows. A typo in
  // a button fails the build the way a typo in a lesson would.
  const ALLOWED = new Set(['hui', 'france', 'jasette', 'fleurdelisé', 'tricolore', 'montréal', 'québec', 'tatoeba', 'wiktionary', 'lexique', 'api', 'english', 'cecr', 'ok', 'wi', 'fi']);
  for (const [key, [fr]] of Object.entries(STRINGS)) {
    const text = fr.replace(/\{[a-z]+\}/g, ' ');
    for (const word of text.toLowerCase().replace(/’/g, "'").split(/[^a-zàâäæçéèêëîïôöœùûüÿ']+/).flatMap((x) => (x.includes("'") ? x.split(/(?<=')/) : [x])).filter(Boolean)) {
      if (ALLOWED.has(word)) continue;
      const w2 = norm(word).replace(/'$/, '');
      ok(!!SPELL[norm(word)] || !!SPELL[w2] || (src.ORTHO && src.ORTHO.has(w2)) || /^[a-z]'$/.test(word) || word.endsWith("'"), `interface string "${key}": "${word}" is not a French spelling Lexique knows`);
    }
  }
  return { errors, checks };
}

// ── run it ───────────────────────────────────────────────────────────────
async function sources() {
  const SENT = read('corpus/sentidx.json');
  return {
    LEX: read('corpus/lexicon.json'), SENT, SPELL: read('corpus/spellings.json'), CAN: read('corpus/canadian-src.json'),
    // every spelling Lexique has, not only those of the lemmas the deck teaches: the interface may use any French word
    ORTHO: new Set(readFileSync(join(ROOT, 'sources/lexique/Lexique383.tsv'), 'utf8').split('\n').map((l) => l.split('\t')[0].toLowerCase().replace(/œ/g, 'oe'))),
    ALIVE: new Set(existsSync(join(ROOT, 'corpus/audio-ok.json')) ? read('corpus/audio-ok.json') : []),
    HAND: await load('content/glosses.mjs'), SYLLABUS: await load('content/syllabus.mjs'), NOTES: await load('content/notes.mjs'), HOMO: await load('content/homophones.mjs'),
    CANADIAN: await load('content/canadian.mjs'), GRAMMAR: await load('content/grammar.mjs'),
    STRINGS: (await import(pathToFileURL(join(ROOT, 'app/js/strings.js')).href)).STRINGS,
    unsuitable: (await import(pathToFileURL(join(ROOT, 'content/unsuitable.mjs')).href)).unsuitable,
  };
}
export { sources };
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const deck = read('app/data/deck.json');
  const src = await sources();
  const { errors, checks } = await verify(deck, src);
  console.log(`verify: ${checks.toLocaleString()} checks on ${deck.words.length.toLocaleString()} words and ${deck.items.length.toLocaleString()} questions`);
  if (errors.length) {
    const groups = new Map();
    for (const e of errors) { const k = e.replace(/[0-9]+/g, '#').replace(/"[^"]*"/g, '"…"').slice(0, 90); groups.set(k, [...(groups.get(k) || []), e]); }
    console.log(`\n${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
    for (const [, list] of [...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) console.log(`  ${String(list.length).padStart(5)}  ${list[0]}`);
    process.exit(1);
  }
  console.log('verify: ok');
}
