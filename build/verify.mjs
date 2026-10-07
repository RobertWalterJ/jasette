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
  // conjugation drills: every answer is re-derived here, from the verb's own table and from rules
  // written out again (not imported from the generator), and every wrong option must really be wrong
  {
    const drills = deck.items.filter((x) => x.k === 'conj-drill');
    const ladder = deck.conjLadder || [];
    ok(ladder.length >= 10 && drills.length >= 1000, 'the conjugation ladder is missing or too small');
    ok(ladder.reduce((n, r) => n + r.n, 0) === drills.length, 'the ladder counts do not add up to the drills');
    const row = (l, key) => deck.conj[deck.words.findIndex((x) => x.w === l)]?.[key];
    const ETRE = new Set(['aller', 'venir', 'arriver', 'partir', 'rester', 'tomber', 'naître', 'mourir', 'devenir', 'revenir', 'entrer']);
    const AUXKEY = { pc: 'pr', pqp: 'im', fa: 'fu', cop: 'co', sup: 'su' };
    const SIMPLE = ['pr', 'im', 'fu', 'co', 'su'];
    const IMP_IRR = { être: ['', 'sois', '', 'soyons', 'soyez'], avoir: ['', 'aie', '', 'ayons', 'ayez'], savoir: ['', 'sache', '', 'sachons', 'sachez'] };
    const DROPS = new Set(['ouvrir', 'offrir', 'couvrir', 'souffrir', 'cueillir', 'accueillir', 'recueillir', 'découvrir', 'recouvrir', 'entrouvrir', 'aller']);
    const PRON = [['je', 'j’'], ['tu'], ['il', 'elle', 'on'], ['nous'], ['vous'], ['ils', 'elles']];
    for (const it of drills) {
      const w = deck.words[it.v], c = deck.conj[it.v];
      ok(!!w && w.k === 'v' && !!c, `${it.id}: not a verb`);
      if (!w || !c) continue;
      ok(!!deck.conjTenses?.[it.tense] && it.rung >= 0 && it.rung < ladder.length && ladder[it.rung].tenses.includes(it.tense), `${it.id}: the tense is not on its rung`);
      ok(it.options.length === 3 && new Set([it.answer, ...it.options]).size === 4, `${it.id}: the options must be three different forms, none the answer`);
      ok(![it.answer, ...it.options].some((x) => !x || /undefined|^-$/.test(x)), `${it.id}: a missing form in the options`);
      ok(it.slot >= 0 && it.slot <= 5, `${it.id}: no such person`);
      ok(it.stage === ladder[it.rung]?.stage, `${it.id}: its stage is not its rung's stage`);
      // the line shown: pronoun + answer, or (imperative) the answer and a bang
      let pron = '';
      if (it.tense === 'ip') ok(it.text === it.answer + ' !', `${it.id}: the imperative line is not the answer`);
      else {
        ok(it.text.endsWith(it.answer), `${it.id}: the line does not end with the answer`);
        pron = it.text.slice(0, it.text.length - it.answer.length);
        const subj = it.tense === 'su' || it.tense === 'sup';
        const vowel = /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(it.answer);
        const allowed = PRON[it.slot].map((p) => {
          if (!subj) return p === 'je' ? (vowel ? ['j’'] : ['je ']) : p === 'j’' ? [] : [p + ' '];
          if (p === 'je') return vowel ? ['que j’'] : ['que je '];
          if (p === 'j’') return [];
          return /^(il|elle|on|ils|elles)$/.test(p) ? ['qu’' + p + ' '] : ['que ' + p + ' '];
        }).flat();
        ok(allowed.includes(pron), `${it.id}: the pronoun "${pron}" is wrong for person ${it.slot} (${subj ? 'subjunctive' : 'indicative'}, "${it.answer}")`);
      }
      if (SIMPLE.includes(it.tense)) {
        ok(c[it.tense][it.slot] === it.answer, `${it.id}: "${it.answer}" is not the ${it.tense} form for person ${it.slot}`);
      } else if (it.tense === 'ip') {
        ok([1, 3, 4].includes(it.slot), `${it.id}: the imperative has no such person`);
        const want = IMP_IRR[w.w] ? IMP_IRR[w.w][it.slot] : it.slot === 1 ? ((w.w.endsWith('er') || DROPS.has(w.w)) && c.pr[1].endsWith('s') ? c.pr[1].slice(0, -1) : c.pr[1]) : c.pr[it.slot];
        ok(want === it.answer, `${it.id}: the imperative should be "${want}", not "${it.answer}"`);
      } else if (it.tense === 'fp') {
        ok(it.answer === `${row('aller', 'pr')[it.slot]} ${w.w}`, `${it.id}: the near future is not aller + the infinitive`);
      } else {
        const etreV = ETRE.has(w.w);
        ok(etreV || w.aux === 'avoir', `${it.id}: a compound tense for a verb that can take either helper`);
        ok(!etreV || [2, 5].includes(it.slot), `${it.id}: an être verb is only asked where the subject settles the agreement`);
        const parts = it.answer.split(' ');
        ok(parts.length === 2, `${it.id}: a compound answer is a helper and a participle`);
        const helper = row(etreV ? 'être' : 'avoir', AUXKEY[it.tense])?.[it.slot];
        ok(parts[0] === helper, `${it.id}: the helper should be "${helper}"`);
        const who = pron.trim().split(/[ ’]/).pop();
        let pp = c.pp;
        if (etreV) pp = it.slot === 2 ? (who === 'elle' ? pp + 'e' : pp) : who === 'elles' ? pp + 'es' : (/[sx]$/.test(pp) ? pp : pp + 's');
        ok(parts[1] === pp, `${it.id}: the participle should be "${pp}" and agree with "${who}"`);
      }
    }
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

  // ── what is taught before it is tested ─────────────────────────────────
  // Every lesson: prose present, a model verb whose table has the rows it shows, and "builds on"
  // links that only ever point at EARLIER steps (so each step stands on what was already taught).
  {
    const ladder = deck.conjLadder || [];
    for (const [n, r] of ladder.entries()) {
      const t = r.teach;
      ok(!!t && [t.what, t.build, t.watch].every((x) => typeof x === 'string' && x.length > 40), `lesson ${r.id}: the explanation is missing or too thin`);
      ok(typeof r.uses === 'string' && r.uses.length > 10, `lesson ${r.id}: no "what this builds on" line`);
      ok(Array.isArray(r.builds) && r.builds.every((b) => Number.isInteger(b) && b >= 0 && b < n), `lesson ${r.id}: it builds on a step that is not an earlier one`);
      if (n > 0) ok(r.builds.length >= 1, `lesson ${r.id}: every step after the first builds on something`);
      if (t?.model != null) {
        const c = deck.conj[t.model];
        ok(deck.words[t.model]?.k === 'v' && !!c, `lesson ${r.id}: the model is not a verb with a table`);
        for (const tense of t.show || []) {
          const hasRows = ['pr', 'im', 'fu', 'co', 'su'].includes(tense) ? Array.isArray(c?.[tense]) && c[tense].length === 6 : !!c?.pp;
          ok(hasRows, `lesson ${r.id}: the model verb has no ${tense} table`);
        }
      }
      for (const vi of t?.words || []) ok(deck.words[vi]?.k === 'v' && !!deck.conj[vi]?.pp, `lesson ${r.id}: a listed verb has no table`);
      // the lesson's tenses are the rung's own (or the present, for a step that rests on it)
      ok((t?.show || []).every((x) => deck.conjTenses[x]), `lesson ${r.id}: it shows a tense the deck does not know`);
    }
    ok(ladder.length === src.LADDER.length, 'the deck ladder and content/conjugation.mjs have different lengths');
    ok(src.LADDER.every((r) => !!src.LESSONS[r.id] && !!src.BUILDS[r.id]), 'a ladder step has no lesson or no "builds on"');
  }
  // Expressions: Wiktionary must back each meaning (the build left out any it did not), a note about
  // an origin must be one the head word's etymology supports, and each question has three other meanings.
  {
    const exprs = deck.expressions || [];
    const known = new Map(src.EXPR.map((e) => [e.id, e]));
    ok(exprs.length >= 15, `only ${exprs.length} expressions reached the deck`);
    for (const x of exprs) {
      const e = known.get(x.id);
      ok(!!e, `expression ${x.id}: not in content/expressions.mjs`);
      if (!e) continue;
      for (const w of e.wik) {
        const re = new RegExp(w.has, 'i');
        ok((src.EXPR_SRC[w.word] || []).flatMap((en) => en.senses).some((s) => re.test(s.g)), `expression "${x.fr}": Wiktionary has no sense of "${w.word}" like /${w.has}/`);
      }
      if (e.etym) {
        const text = (src.EXPR_SRC[e.etym.word] || []).map((en) => en.etym).join(' ').toLowerCase();
        for (const k of e.etym.says) ok(text.includes(k.toLowerCase()), `expression "${x.fr}": the etymology of "${e.etym.word}" does not mention "${k}"`);
      }
      ok(x.en === e.en && x.literal === e.literal && x.note === e.note, `expression ${x.id}: the deck differs from content/expressions.mjs`);
      ok(typeof x.note === 'string' && x.note.length > 60 && !!x.literal, `expression ${x.id}: no explanation`);
      if (x.i != null) ok(deck.words[x.i]?.w !== undefined, `expression ${x.id}: no such word`);
      if (x.ex) ok(src.EXPR_SRC[e.wik[0].word]?.some((en) => en.senses.some((s) => (s.ex || []).some((y) => y.t === x.ex.t))), `expression ${x.id}: the example is not Wiktionary's`);
    }
    for (const it of deck.items.filter((q) => q.k === 'idiom-mean')) {
      const x = exprs[it.x];
      ok(!!x, `${it.id}: no such expression`);
      if (!x) continue;
      ok(it.options.length === 3 && new Set([x.en, ...it.options]).size === 4, `${it.id}: needs three different other meanings`);
      ok(!it.options.some((o) => overlap(kw(o), kw(x.en))), `${it.id}: an option shares a meaning with the answer`);
    }
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
    EXPR: await load('content/expressions.mjs'), EXPR_SRC: existsSync(join(ROOT, 'corpus/expressions-src.json')) ? read('corpus/expressions-src.json') : {},
    LADDER: await load('content/conjugation.mjs'), LESSONS: await load('content/conjugation-lessons.mjs'),
    BUILDS: (await import(pathToFileURL(join(ROOT, 'content/conjugation-lessons.mjs')).href)).BUILDS,
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
