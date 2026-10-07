// Build the deck: every question the app can ask.
//
//   node build/items.mjs      (after extract, senses, words, sentences, canadian-src)
//
// Nothing is invented. A word carries the meaning and the pronunciation its
// sources give it; a sentence is a Tatoeba sentence with its own human
// translation; a verb form is a form Wiktionary's conjugation table lists; a
// gender is only asked where Lexique and Wiktionary agree. build/verify.mjs
// checks all of that again before the app is built.
//
// The deck is a word list plus items that point into it, so six thousand words
// do not repeat their gloss inside every question.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'corpus', f), 'utf8'));
const load = async (f) => (await import(pathToFileURL(join(ROOT, f)).href)).default;
const WORDS = read('words.json');
const SENT = read('sentidx.json');
const SPELL = read('spellings.json');
const CAN_SRC = read('canadian-src.json');
// A second, independent source (the French Wiktionnaire): build/canadian-crosscheck.mjs
const CAN_FR = existsSync(join(ROOT, 'corpus', 'canadian-fr.json')) ? read('canadian-fr.json') : {};
const LEXICON_PHON = new Map(read('lexicon.json').map((e) => [e.w, e.phon]));
const SYLLABUS = await load('content/syllabus.mjs');
const GRAMMAR = await load('content/grammar.mjs');
const NOTES = await load('content/notes.mjs');
const HOMO = await load('content/homophones.mjs');
const CANADIAN = await load('content/canadian.mjs');

// ── small tools ──────────────────────────────────────────────────────────
// A seeded generator, so the deck is the same every build.
const seeded = (str) => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };
const shuffled = (a, rnd) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const wcount = (s) => s.split(/\s+/).length;
const norm = (t) => t.toLowerCase().replace(/’/g, "'").replace(/œ/g, 'oe');
const tokens = (t) => norm(t).replace(/aujourd'hui/g, 'aujourd_hui').split(/[^a-zàâäæçéèêëîïôöùûüÿ'_-]+/)
  .flatMap((x) => (x.includes("'") && !x.includes('_') ? x.split(/(?<=')/) : [x])).map((x) => x.replace(/_/g, "'")).filter(Boolean);

// English content words, for "do these two glosses mean the same thing?"
const STOP = new Set('a an the to of in on at by for with from or and as is are be it its that this these those one someone something somebody thing used use usually often especially more most very who whom which what when where while will would can could may might not no yes up down off over out into about than then there their they them he she his her we us our you your i me my so but if any some such other another also just only own same'.split(' '));
const kw = (g) => new Set(String(g).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z]+/).filter((w) => w && !STOP.has(w) && w.length > 2).map((w) => w.replace(/(ing|ed|es|s|e)$/, '')));
const overlap = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };

// ── the course ───────────────────────────────────────────────────────────
const stageOfRank = (r) => { const i = SYLLABUS.findIndex((s) => r >= s.from && r <= s.to); return i < 0 ? SYLLABUS.length - 1 : i; };
const GP = new Map(GRAMMAR.map((g) => [g.id, g]));
const stageOfPoint = new Map();
for (const [n, st] of SYLLABUS.entries()) for (const g of st.grammar) stageOfPoint.set(g, n);
const sentStage = (s, cap = 1) => {
  // The stage at which a sentence is within reach: the stage of its
  // (cap+1)th hardest word, so one unfamiliar word is allowed and two are not.
  const ranks = s.w.map((i) => WORDS[i].r).sort((a, b) => b - a);
  const r = ranks[Math.min(cap, ranks.length - 1)] ?? 1;
  return stageOfRank(r);
};

const items = [];
const audioWords = new Map();         // word index -> {fr:true, qc:true}
const audioSent = new Set();          // Tatoeba ids

// ── word kinds and distractors ───────────────────────────────────────────
const KW = WORDS.map((w) => new Set([...kw(w.g), ...(w.alt || []).flatMap((a) => [...kw(a)])]));
const GLOSS_KW = WORDS.map((w) => kw(w.g));
const byKind = new Map();
WORDS.forEach((w, i) => { if (!byKind.has(w.k)) byKind.set(w.k, []); byKind.get(w.k).push(i); });
// A word is only ever a DISTRACTOR if it is plain: a slang gloss ("to snuff it, pop one's clogs") among
// the options is a joke, not a choice, and it tells the learner which one is the odd one out.
const REG_OK = (i) => !WORDS[i].reg;
// Options for "what does this mean?": other words of the same kind from the
// same stretch of the frequency list, with nothing in common in meaning.
const glossOthers = (i, n, rnd) => {
  const w = WORDS[i];
  const pool = (byKind.get(w.k) || []).filter((j) => j !== i && Math.abs(j - i) < 400 && REG_OK(j) && !overlap(KW[i], GLOSS_KW[j]) && !overlap(KW[j], GLOSS_KW[i]) && WORDS[j].g !== w.g);
  const len = wcount(w.g);
  const seen = new Set([w.g]);
  const c = [];
  for (const j of shuffled(pool, rnd)) { const g = WORDS[j].g; if (seen.has(g)) continue; seen.add(g); c.push({ g, d: Math.abs(wcount(g) - len), r: rnd() }); }
  c.sort((a, b) => a.d - b.d || a.r - b.r);
  return c.slice(0, n).map((x) => x.g);
};
// Options for "which word means this?": other words of the same kind, same
// length of spelling, not synonyms. A gendered noun is set against nouns of the
// same gender, so the article does not give it away.
const formOthers = (i, n, rnd) => {
  const w = WORDS[i];
  const len = w.w.length;
  const pool = (byKind.get(w.k) || []).filter((j) => j !== i && Math.abs(j - i) < 500 && REG_OK(j) && !overlap(KW[i], GLOSS_KW[j]) && !overlap(KW[j], GLOSS_KW[i]) && (!w.gen || !WORDS[j].gen || WORDS[j].gen === w.gen));
  const c = shuffled(pool, rnd).map((j) => ({ j, d: Math.abs(WORDS[j].w.length - len), r: rnd() }));
  c.sort((a, b) => a.d - b.d || a.r - b.r);
  return c.slice(0, n).map((x) => WORDS[x.j].w);
};

// ── example sentences ────────────────────────────────────────────────────
// Up to three per word, easiest first: within reach, with a recording, short.
// A sentence about a word is only worth showing if the OTHER words in it are
// ones the learner has met by then — the callback rule, in ranks.
// A recording counts only if the audio server still has it (build/probe-audio.mjs) and it is under a
// Creative Commons licence; the licence and the speaker are shown with every clip.
const ALIVE = new Set(existsSync(join(ROOT, "corpus", "audio-ok.json")) ? read("audio-ok.json") : []);
const recorded = (s) => !!s.a && ALIVE.has(s.id);
const byWord = new Map();
for (const s of SENT) {
  if (s.reg === 'fam' || s.u > 1) continue;
  for (const i of s.w) { if (!byWord.has(i)) byWord.set(i, []); byWord.get(i).push(s); }
}
const maxTokens = (r) => (r < 300 ? 8 : r < 1000 ? 10 : r < 3000 ? 12 : 16);
const reachOf = (s, i) => { const others = s.w.filter((j) => j !== i); if (!others.length) return 1; const r = WORDS[i].r; return others.filter((j) => WORDS[j].r <= r * 1.5 + 50).length / others.length; };
const examples = {};
for (const [i, list] of byWord) {
  const w = WORDS[i];
  if (w.k === 'int' && w.r > 2000) continue;
  const lim = maxTokens(w.r);
  const pick = list.filter((s) => s.n <= lim && s.n >= 4)
    .map((s) => ({ s, r: reachOf(s, i), a: recorded(s) ? 1 : 0 }))
    .sort((x, y) => (y.r >= 0.8) - (x.r >= 0.8) || y.a - x.a || x.s.n - y.s.n || y.r - x.r)
    .slice(0, 3).map((x) => x.s);
  if (pick.length) examples[i] = pick.map((s) => ({ id: s.id, t: s.t, e: s.e, a: recorded(s) ? 1 : 0, ...(s.qc ? { qc: 1 } : {}) }));
}

// Every recorded example sentence is wanted too: hearing a word in a sentence is the point.
for (const list of Object.values(examples)) for (const e of list) if (e.a) audioSent.add(e.id);

// ── 1. the five word questions ───────────────────────────────────────────
const READ_UP_TO = 7000;
const AUDIO_WORDS = 4000;               // recordings bundled for words this far down the list
for (const [i, w] of WORDS.entries()) {
  const rnd = seeded('w' + w.w);
  const stage = stageOfRank(w.r);
  const level = Math.min(9, Math.ceil(w.r / 800));
  const g3 = glossOthers(i, 3, rnd);
  if (g3.length === 3) {
    // Read it, know what it means: the first question, and the fastest way to
    // find out whether a word is already yours.
    if (i < READ_UP_TO) items.push({ id: `wr/${w.w}`, k: 'word-read', i, options: g3, level });
    // Hear it, know what it means. Needs a voice or a recording.
    if (w.fr || w.qcAudio || i < AUDIO_WORDS) items.push({ id: `wl/${w.w}`, k: 'word-listen', i, options: g3, level: level + 1 });
  }
  // See the meaning, say the word: the reveal gives the IPA and a recording.
  items.push({ id: `ws/${w.w}`, k: 'word-say', i, level: level + 2 });
  // Meaning in, word out.
  const f3 = formOthers(i, 3, rnd);
  if (f3.length === 3) items.push({ id: `wp/${w.w}`, k: 'word-pick', i, options: f3, level: level + 1 });
}

// ── 2. the gap: which word belongs here? ─────────────────────────────────
// Real sentences, one word taken out. The distractors are other words of the
// same kind in the SAME form — the same slot in the conjugation, the same
// number — so the ending is not the giveaway.
const slotOf = (w, tok) => {
  if (w.k !== 'v' || !w.conj) return null;
  for (const [t, row] of Object.entries(w.conj)) {
    if (Array.isArray(row)) { const p = row.indexOf(tok); if (p >= 0) return [t, p]; }
    else if (row === tok) return [t, 0];
  }
  return null;
};
const CLOZE_WORDS = 4500;
const usedSent = new Map();
const lemmaOf = (tok) => { const h = SPELL[tok]; if (!h) return null; return h[0]; };
const wordIndex = new Map(WORDS.map((w, i) => [w.lem || w.w, i]));
for (const [i, w] of WORDS.entries()) {
  if (i >= CLOZE_WORDS || !['n', 'v', 'adj', 'adv'].includes(w.k)) continue;
  const cands = (byWord.get(i) || []).filter((s) => s.n >= 6 && s.n <= maxTokens(w.r) + 2 && s.u === 0);
  let best = null;
  for (const s of cands.sort((a, b) => b.n - a.n)) {
    if ((usedSent.get(s.id) || 0) >= 1) continue;
    const toks = tokens(s.t);
    const at = toks.map((t, k) => ({ t, k })).filter(({ t }) => { const l = lemmaOf(t); return l && wordIndex.get(l[0]) === i; });
    if (at.length !== 1) continue;
    best = { s, tok: at[0].t, k: at[0].k };
    break;
  }
  if (!best) continue;
  const rnd = seeded('cz' + w.w);
  // The surface form as written in the sentence, with its original case.
  const re = new RegExp("(?<![\\p{L}'’-])" + best.tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/oe/g, '(?:oe|œ)') + "(?![\\p{L}-])", 'iu');
  const m = re.exec(best.s.t);
  if (!m) continue;
  const surface = m[0];
  const slot = slotOf(w, best.tok);
  let options = [];
  if (w.k === 'v') {
    if (!slot) { if (best.tok !== (w.lem || w.w)) continue; }   // an infinitive, or a form we cannot place
    const pool = shuffled((byKind.get('v') || []).filter((j) => j !== i && Math.abs(j - i) < 500), rnd);
    for (const j of pool) {
      const o = WORDS[j];
      let form = null;
      if (slot) { const row = o.conj?.[slot[0]]; form = Array.isArray(row) ? row[slot[1]] : row; } else form = o.w;
      if (form && form !== best.tok && !options.includes(form) && !overlap(KW[i], GLOSS_KW[j])) options.push(form);
      if (options.length === 3) break;
    }
  } else if (w.k === 'n') {
    const plural = best.tok !== (w.lem || w.w) && /[sx]$/.test(best.tok);
    const pool = shuffled((byKind.get('n') || []).filter((j) => j !== i && Math.abs(j - i) < 500 && (!w.gen || WORDS[j].gen === w.gen) && REG_OK(j) && !overlap(KW[i], GLOSS_KW[j])), rnd);
    for (const j of pool) {
      const base = WORDS[j].w;
      const form = plural ? (/[sxz]$/.test(base) ? base : /(au|eau|eu)$/.test(base) ? base + 'x' : /al$/.test(base) ? base.slice(0, -2) + 'aux' : base + 's') : base;
      if (!options.includes(form) && form !== best.tok) options.push(form);
      if (options.length === 3) break;
    }
    if (best.tok !== (w.lem || w.w) && !plural) continue;
  } else {
    if (best.tok !== (w.lem || w.w)) continue;
    const pool = shuffled((byKind.get(w.k) || []).filter((j) => j !== i && Math.abs(j - i) < 500 && REG_OK(j) && !overlap(KW[i], GLOSS_KW[j])), rnd);
    for (const j of pool) { if (!options.includes(WORDS[j].w)) options.push(WORDS[j].w); if (options.length === 3) break; }
  }
  if (options.length < 3) continue;
  usedSent.set(best.s.id, 1);
  if (recorded(best.s)) audioSent.add(best.s.id);
  items.push({
    id: `cz/${w.w}`, k: 'word-cloze', i, sid: best.s.id,
    text: best.s.t, eng: best.s.e, audio: recorded(best.s) ? 1 : 0,
    blank: surface, answer: surface.toLowerCase(), options,
    level: Math.min(9, Math.ceil(w.r / 800)) + 2,
    stageHint: Math.max(stageOfRank(w.r), sentStage(best.s)),
  });
}

// ── 2b. several gaps at once: tap the words into place ───────────────────
// A real sentence with two or three words taken out and a bank of words to
// choose from, the right ones and a couple of decoys. Robert asked for this
// kind of question by name: press buttons, watch the words drop into the
// sentence. The blanks are always of DIFFERENT kinds (a verb and a noun, say),
// so there is only one way to fill them; two nouns would be a coin toss.
const FILL_PER_STAGE = 170;
const spans = (t) => { const out = []; const re = /[\p{L}-]+/gu; let m; while ((m = re.exec(t))) out.push({ w: m[0], at: m.index }); return out; };
const formOk = (w, tok) => {
  const lemma = norm(w.lem || w.w);
  if (w.k === 'v') return tok === lemma || !!slotOf(w, tok);
  if (w.k === 'n') return tok === lemma || (tok === lemma + 's' && !/[sxz]$/.test(lemma)) || (/[sxz]$/.test(lemma) && tok === lemma);
  return tok === lemma;
};
const fillPool = SENT.filter((s) => s.n >= 6 && s.n <= 12 && s.u === 0 && s.reg !== 'fam' && !/[«»:;]/.test(s.t));
for (let st = 0; st < SYLLABUS.length; st++) {
  const mine = fillPool.filter((s) => sentStage(s, 1) === st);
  const rnd0 = seeded('fm' + st);
  let made = 0;
  for (const s of shuffled(mine, rnd0)) {
    if (made >= FILL_PER_STAGE) break;
    if ((usedSent.get(s.id) || 0) >= 1) continue;
    const sp = spans(s.t);
    const cands = [];
    for (const [k, x] of sp.entries()) {
      const tok = norm(x.w);
      const h = SPELL[tok];
      if (!h) continue;
      const wi2 = wordIndex.get(h[0][0]);
      if (wi2 == null) continue;
      const w = WORDS[wi2];
      // not the first hundred words: est, ça and avoir are not a choice, they are the glue
      if (!['n', 'v', 'adj'].includes(w.k) || w.r > 4500 || w.r <= 100 || !formOk(w, tok)) continue;
      if (sp.filter((y) => norm(y.w) === tok).length !== 1) continue;
      cands.push({ k, x, wi: wi2, w, kind: w.k });
    }
    // two or three blanks, each of a different kind, none next to another
    const chosen = [];
    for (const c of shuffled(cands, seeded('fmc' + s.id))) {
      if (chosen.length >= (s.n >= 9 ? 3 : 2)) break;
      if (chosen.some((o) => o.kind === c.kind || Math.abs(o.k - c.k) < 2)) continue;
      chosen.push(c);
    }
    if (chosen.length < 2) continue;
    chosen.sort((a, b) => a.x.at - b.x.at);
    const segs = [];
    let at = 0;
    for (const c of chosen) { segs.push(s.t.slice(at, c.x.at)); at = c.x.at + c.x.w.length; }
    segs.push(s.t.slice(at));
    const answers = chosen.map((c) => c.x.w.toLowerCase());
    // decoys: another word of the same kind as one of the blanks, in the same form
    const rnd = seeded('fmd' + s.id);
    const decoys = [];
    for (const c of shuffled(chosen, rnd)) {
      const slot2 = slotOf(c.w, norm(c.x.w));
      const plural = c.kind === 'n' && norm(c.x.w) !== norm(c.w.lem || c.w.w);
      for (const j of shuffled((byKind.get(c.kind) || []).filter((j) => j !== c.wi && Math.abs(j - c.wi) < 400 && REG_OK(j) && !overlap(KW[c.wi], GLOSS_KW[j])), rnd)) {
        const o = WORDS[j];
        let form = o.w;
        if (c.kind === 'v' && slot2) { const row = o.conj?.[slot2[0]]; form = Array.isArray(row) ? row[slot2[1]] : row; }
        else if (c.kind === 'n' && plural) form = /[sxz]$/.test(form) ? form : form + 's';
        if (!form || /\s/.test(form) || answers.includes(form) || decoys.includes(form)) continue;
        decoys.push(form);
        break;
      }
      if (decoys.length >= 2) break;
    }
    if (decoys.length < 2) continue;
    usedSent.set(s.id, 1);
    if (recorded(s)) audioSent.add(s.id);
    items.push({ id: `fm/${s.id}`, k: 'fill-multi', i: chosen[0].wi, i2: chosen.slice(1).map((c) => c.wi), sid: s.id, segs, answers, bank: shuffled([...answers, ...decoys], rnd), text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, level: 3 + st, stageHint: st });
    made++;
  }
}

// ── 3. listening: real recorded sentences ────────────────────────────────
// Short ones first, within reach of the early words; a different set of
// speakers (every recording carries its speaker's name).
const listenPool = SENT.filter((s) => recorded(s) && s.u === 0 && s.n >= 4 && s.n <= 11 && s.reg !== 'fam')
  .map((s) => ({ s, st: sentStage(s, 1) }))
  .sort((a, b) => a.st - b.st || a.s.n - b.s.n);
const engPool = listenPool.map((x) => x.s.e);
const pickEng = (self, pool, n, rnd) => {
  const len = wcount(self);
  const seen = new Set([self]);
  const cand = [];
  for (const x of shuffled(pool, rnd).slice(0, 200)) { if (seen.has(x)) continue; seen.add(x); cand.push({ x, d: Math.abs(wcount(x) - len), r: rnd() }); }
  cand.sort((a, b) => a.d - b.d || a.r - b.r);
  return cand.slice(0, n).map((c) => c.x);
};
// A fixed allowance per stage, so listening is a thread through the whole
// course and not the first two stages' worth of short, easy clips. Longer
// sentences as the stages go on; the speakers taken in turn, so no one voice
// is the sound of French.
const LISTEN_PER_STAGE = 160;
const listenChosen = [];
for (let st = 0; st < SYLLABUS.length; st++) {
  const here = listenPool.filter((x) => x.st <= st && x.s.n >= Math.min(9, 4 + st) && x.s.n <= 7 + st * 2 && !listenChosen.some((y) => y.s.id === x.s.id));
  const bySpeaker = new Map();
  for (const x of here) { if (!bySpeaker.has(x.s.a.by)) bySpeaker.set(x.s.a.by, []); bySpeaker.get(x.s.a.by).push(x); }
  const lists = [...bySpeaker.values()].map((l) => shuffled(l, seeded('ls' + st)));
  const take = [];
  for (let n = 0; take.length < LISTEN_PER_STAGE && n < 400; n++) for (const l of lists) if (l[n] && take.length < LISTEN_PER_STAGE) take.push({ ...l[n], st });
  listenChosen.push(...take);
}
for (const { s, st } of listenChosen) {
  const rnd = seeded('sl' + s.id);
  const options = pickEng(s.e, engPool, 3, rnd);
  if (options.length < 3) continue;
  audioSent.add(s.id);
  items.push({ id: `sl/${s.id}`, k: 'sentence-listen', sid: s.id, text: s.t, eng: s.e, by: s.a.by, options, level: 3, stageHint: st });
}

// ── 4. gender: un or une ─────────────────────────────────────────────────
// Only for nouns Lexique and Wiktionary agree about.
const endings = { f: GP.get('gender').endings.f, m: GP.get('gender').endings.m };
const endingStats = {};
for (const [g, list] of Object.entries(endings)) for (const e of list) {
  const hit = WORDS.filter((w) => w.k === 'n' && w.gen && w.w.endsWith(e));
  const n = hit.length;
  const right = hit.filter((w) => w.gen === g).length;
  endingStats[e] = { g, n, pct: n ? Math.round((right / n) * 100) : 0 };
}
for (const [i, w] of WORDS.entries()) {
  if (w.k !== 'n' || !w.gen) continue;
  const ex = (examples[i] || [])[0] || null;
  const suffix = Object.entries(endingStats).filter(([e, s]) => w.w.endsWith(e) && s.n >= 12 && s.pct >= 85 && s.g === w.gen).sort((a, b) => b[0].length - a[0].length)[0];
  items.push({ id: `gp/${w.w}`, k: 'gender-pick', i, gid: 'gender', answer: w.gen === 'm' ? 'un' : 'une', options: ['un', 'une'], suffix: suffix ? suffix[0] : undefined, level: Math.min(9, Math.ceil(w.r / 800)) + 1 });
}

// ── 5. verbs: the form for this tense ────────────────────────────────────
const TENSE = { pr: 'present', im: 'imperfect', fu: 'future', co: 'conditional', su: 'subjunctive' };
const TENSE_FR = { pr: 'présent', im: 'imparfait', fu: 'futur', co: 'conditionnel', su: 'subjonctif' };
const PRONOUN = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const regularEr = (w) => {
  if (!w.w.endsWith('er') || !w.conj?.pr) return false;
  const st = w.w.slice(0, -2);
  const want = [st + 'e', st + 'es', st + 'e', st + 'ons', st + 'ez', st + 'ent'];
  return want.every((x, k) => w.conj.pr[k] === x);
};
const pointFor = (w, tense) => {
  if (tense === 'pr') {
    if (GP.get('etre-avoir').lemmas.includes(w.w)) return 'etre-avoir';
    if (regularEr(w)) return 'present-er';
    if (GP.get('present-irreg').irregular.includes(w.w)) return 'present-irreg';
    return null;
  }
  return { im: 'imparfait', fu: 'futur-simple', co: 'conditionnel', su: 'subjonctif' }[tense];
};
// A token's tense slot is only a question if the form belongs to ONE tense of
// this verb: parle is present AND subjunctive, so it cannot test either.
const inRows = (w, tok) => Object.entries(w.conj || {}).filter(([k, row]) => TENSE[k] && Array.isArray(row) && row.includes(tok)).map(([k]) => k);
const conjCount = new Map();
for (const s of SENT) {
  if (s.reg === 'fam' || s.u > 1 || s.n < 4 || s.n > 12) continue;
  const toks = tokens(s.t);
  for (let k = 0; k < toks.length; k++) {
    const l = lemmaOf(toks[k]);
    if (!l) continue;
    const vi = wordIndex.get(l[0]);
    if (vi == null) continue;
    const w = WORDS[vi];
    if (w.k !== 'v' || !w.conj || w.r > 3500) continue;
    const tenses = inRows(w, toks[k]);
    if (tenses.length !== 1) continue;
    const tense = tenses[0];
    const point = pointFor(w, tense);
    if (!point) continue;
    const key = `${w.w}/${tense}`;
    if ((conjCount.get(key) || 0) >= 1) continue;
    if (toks.filter((x) => x === toks[k]).length !== 1) continue;      // the blank must be unambiguous
    // The person shown by the subject: a pronoun right before the verb (or
    // before a negation / object pronoun) settles which slot is meant.
    const row = w.conj[tense];
    const slotsOf = row.map((f, p) => (f === toks[k] ? p : -1)).filter((p) => p >= 0);
    if (!slotsOf.length) continue;
    // The question shows the sentence with the gap, so it needs the original text for that token.
    const re = new RegExp("(?<![\\p{L}'’-])" + toks[k].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/oe/g, '(?:oe|œ)') + "(?![\\p{L}-])", 'iu');
    const m = re.exec(s.t);
    if (!m) continue;
    const surface = m[0];
    // Wrong answers: same tense, other persons (distinct strings); and one
    // from another tense of the same verb in the same person.
    const rnd = seeded('cj' + key + s.id);
    const same = [...new Set(row.filter((f) => f !== toks[k]))];
    const otherTenses = Object.entries(w.conj).filter(([t]) => TENSE[t] && t !== tense).map(([, r]) => r[slotsOf[0]]).filter((f) => f && f !== toks[k] && !same.includes(f));
    let options = shuffled(same, rnd).slice(0, 2);
    const tenseWrong = shuffled(otherTenses, rnd)[0];
    if (tenseWrong) options.push(tenseWrong);
    for (const f of shuffled(same, rnd)) { if (options.length >= 3) break; if (!options.includes(f)) options.push(f); }
    options = [...new Set(options)].slice(0, 3);
    if (options.length < 3) continue;
    // Match the capitalisation of the sentence where the verb opens it.
    conjCount.set(key, 1);
    if (recorded(s)) audioSent.add(s.id);
    items.push({
      id: `cj/${w.w}/${tense}/${s.id}`, k: 'conj-pick', i: vi, gid: point, tense, sid: s.id,
      text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, blank: surface, answer: surface.toLowerCase(), options,
      slot: slotsOf[0],
      level: 4,
    });
  }
}

// ── 6. the passé composé: avoir or être? ─────────────────────────────────
const SUBJ = { je: 0, "j'": 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };
const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
const ETRE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'];
const participleOf = new Map();            // spelling (any agreement) -> verb index
const AGREE = (pp) => ({ ms: pp, fs: pp + 'e', mp: /[sx]$/.test(pp) ? pp : pp + 's', fp: pp + 'es' });
for (const [i, w] of WORDS.entries()) {
  if (w.k !== 'v' || !w.conj?.pp || !w.aux) continue;
  for (const f of Object.values(AGREE(w.conj.pp))) if (!participleOf.has(f)) participleOf.set(f, i);
}
const reflexiveBefore = new Set(['me', "m'", 'te', "t'", 'se', "s'"]);
const auxCount = new Map();
for (const s of SENT) {
  if (s.reg === 'fam' || s.u > 0 || s.n < 4 || s.n > 11) continue;
  const toks = tokens(s.t);
  for (let k = 0; k + 1 < toks.length; k++) {
    const subj = toks[k];
    if (!(subj in SUBJ) && subj !== "j'") continue;
    // aux, optionally after a negation ne … pas (skip those: the gap would sit inside it)
    const a = toks[k + 1], p = toks[k + 2];
    const person = SUBJ[subj];
    const ia = AVOIR[person] === a ? 'avoir' : ETRE[person] === a ? 'etre' : null;
    if (!ia || !p) continue;
    const vi = participleOf.get(p);
    if (vi == null) continue;
    const w = WORDS[vi];
    if (w.aux !== ia) continue;
    if (k > 0 && reflexiveBefore.has(toks[k - 1])) continue;
    const key = w.w + '/' + ia;
    if ((auxCount.get(key) || 0) >= 1) continue;
    const re = new RegExp("(?<![\\p{L}'’-])" + a + "(?![\\p{L}-])", 'iu');
    // the aux token that follows this subject — find the occurrence right after the subject
    const subjRe = new RegExp("(?<![\\p{L}])" + (subj === "j'" ? "j['’]" : subj) + "\\s?(" + a + ")(?![\\p{L}-])", 'iu');
    const m = subjRe.exec(s.t);
    if (!m) continue;
    const other = ia === 'avoir' ? ETRE : AVOIR;
    const same = ia === 'avoir' ? AVOIR : ETRE;
    const num = person >= 3 ? [3, 4, 5] : [0, 1, 2];
    const flip = person >= 3 ? 2 : 5;                           // the other number
    const options = [...new Set([other[person], same[flip], other[flip]].filter((x) => x !== a))];
    if (options.length < 3) continue;
    auxCount.set(key, 1);
    if (recorded(s)) audioSent.add(s.id);
    items.push({
      id: `ax/${w.w}/${s.id}`, k: 'aux-pick', i: vi, gid: 'passe-compose', sid: s.id,
      text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, blank: m[1], answer: m[1], options, aux: ia, participle: p, subject: subj,
      level: 3,
    });
    // Agreement, for être verbs with a gendered subject.
    if (ia === 'etre') {
      const g = { il: 'ms', elle: 'fs', ils: 'mp', elles: 'fp' }[subj];
      const forms = AGREE(w.conj.pp);
      if (g && p === forms[g] && Object.values(forms).every((f) => SPELL[norm(f)])) {
        items.push({
          id: `ag/${w.w}/${s.id}`, k: 'agree-pick', i: vi, gid: 'accord-etre', sid: s.id,
          text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, blank: p, answer: p, options: [...new Set(Object.values(forms).filter((f) => f !== p))].slice(0, 3), subject: subj,
          level: 5,
        });
      }
    }
  }
}

// ── 6b. the little pronouns: y, en, lui, leur, le, la, les ───────────────
// A subject, then the pronoun, then a verb. The pronoun is blanked; the
// English translation carries what it stands for, and the learner chooses
// among the other object pronouns. Only the unambiguous slots are used: a
// pronoun followed by a verb form Lexique knows.
const OBJ = ['y', 'en', 'lui', 'leur', 'le', 'la', 'les'];
const SUBJECTS = new Set(['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on']);
const pronCount = new Map();
for (const s of SENT) {
  if (s.reg === 'fam' || s.u > 0 || s.n < 4 || s.n > 9) continue;
  const toks = tokens(s.t);
  for (let k = 0; k + 2 < toks.length; k++) {
    if (!SUBJECTS.has(toks[k]) || !OBJ.includes(toks[k + 1])) continue;
    const verb = SPELL[toks[k + 2]];
    if (!verb || verb[0][1] !== 'VER') continue;
    const p = toks[k + 1];
    if ((pronCount.get(p) || 0) >= 22) continue;
    if (toks.filter((x) => x === p).length !== 1) continue;
    const re = new RegExp("(?<![\\p{L}'’-])" + toks[k] + "\\s+(" + p + ")(?![\\p{L}'’-])", 'iu');
    const m = re.exec(s.t);
    if (!m) continue;
    const rnd = seeded('pr' + s.id);
    const options = shuffled(OBJ.filter((x) => x !== p), rnd).slice(0, 3);
    pronCount.set(p, (pronCount.get(p) || 0) + 1);
    if (recorded(s)) audioSent.add(s.id);
    items.push({ id: `pr/${p}/${s.id}`, k: 'pronoun-pick', gid: 'pronouns-object', sid: s.id, text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, blank: m[1], answer: p, options, level: 5 });
  }
}

// ── 7. words that sound alike ────────────────────────────────────────────
const hpat = (w) => new RegExp("(?<![\\p{L}-])" + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?![\\p{L}'’-])", 'iu');
const homoItems = [];
for (const [setId, set] of Object.entries(HOMO)) {
  const pats = set.words.map((x) => hpat(x.w));
  const found = [];
  for (const s of SENT) {
    if (s.n < 5 || s.n > 12 || s.u > 1 || s.reg === 'fam') continue;
    const hits = pats.map((re, k) => ({ k, m: s.t.match(new RegExp(re.source, 'giu')) || [] })).filter((x) => x.m.length);
    if (hits.length !== 1 || hits[0].m.length !== 1) continue;
    found.push({ s, k: hits[0].k });
  }
  // Even across the words in the set, shortest first, and with the stage of the sentence.
  const per = set.words.map(() => []);
  for (const f of found.sort((a, b) => a.s.n - b.s.n)) per[f.k].push(f);
  const take = [];
  for (let n = 0; n < 8; n++) for (const list of per) if (list[n]) take.push(list[n]);
  for (const { s, k } of take.slice(0, 14)) {
    const m = s.t.match(new RegExp(pats[k].source, 'iu'));
    const answer = m[0];
    const options = set.words.map((x) => x.w);
    homoItems.push({ id: `hp/${setId}/${s.id}`, k: 'homophone-pick', gid: set.point || undefined, set: setId, sid: s.id, text: s.t, eng: s.e, audio: recorded(s) ? 1 : 0, blank: answer, answer: set.words[k].w, options: shuffled(options.filter((x) => x !== set.words[k].w), seeded('hp' + s.id)).concat([]), level: 4, stageHint: set.stage - 1 });
    if (recorded(s)) audioSent.add(s.id);
  }
}
items.push(...homoItems);

// ── 8. the sounds of French: which did you hear? ─────────────────────────
// Minimal pairs from Lexique's own phonemic spellings: two common words that
// differ in exactly one sound, in a contrast English speakers do not make.
// Lexique writes: y = u (tu), u = ou, e = é, E = è, o = o, O = ò (porte),
// 2 = eu (peu), 9 = eu (peur), @ = an, § = on, 1 = in.
const CONTRASTS = [
  ['y', 'u', 'u / ou', 'The u in tu is made with rounded lips and the tongue forward; the ou in tout with rounded lips and the tongue back.'],
  ['e', 'E', 'é / è', 'Closed é, as in été, against open è, as in mère.'],
  ['o', 'O', 'o / ô', 'Closed o, as in beau, against open o, as in porte.'],
  ['2', '9', 'eu / eu', 'Closed eu, as in peu, against open eu, as in peur.'],
  ['@', '§', 'an / on', 'The nasal vowels: sans against son.'],
  ['@', '5', 'an / in', 'The nasal vowels: vent against vin.'],
  ['§', '5', 'on / in', 'The nasal vowels: bon against bien.'],
  ['i', 'y', 'i / u', 'Spread lips, as in si, against rounded lips, as in su.'],
];
const hasAudio = (i) => !!(WORDS[i].fr || WORDS[i].qcAudio);
const phonOf = (i) => LEXICON_PHON.get(WORDS[i].lem || WORDS[i].w);
const pairs = [];
const cand = WORDS.map((w, i) => i).filter((i) => i < 4000 && hasAudio(i) && phonOf(i) && ['n', 'v', 'adj', 'adv'].includes(WORDS[i].k));
const byPhonLen = new Map();
for (const i of cand) { const p = phonOf(i); if (!byPhonLen.has(p.length)) byPhonLen.set(p.length, []); byPhonLen.get(p.length).push(i); }
const PHON_SEEN = new Map();
for (const group of byPhonLen.values()) {
  for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) {
    const pa = phonOf(group[a]), pb = phonOf(group[b]);
    if (pa === pb) continue;
    let diff = -1, n = 0;
    for (let k = 0; k < pa.length; k++) if (pa[k] !== pb[k]) { n++; diff = k; if (n > 1) break; }
    if (n !== 1) continue;
    const c = CONTRASTS.findIndex(([x, y]) => (pa[diff] === x && pb[diff] === y) || (pa[diff] === y && pb[diff] === x));
    if (c < 0) continue;
    if ((WORDS[group[a]].lem || WORDS[group[a]].w) === (WORDS[group[b]].lem || WORDS[group[b]].w)) continue;
    if (overlap(KW[group[a]], GLOSS_KW[group[b]])) continue;
    pairs.push({ a: group[a], b: group[b], c, r: WORDS[group[a]].r + WORDS[group[b]].r });
  }
}
pairs.sort((x, y) => x.r - y.r);
const perContrast = new Array(CONTRASTS.length).fill(0);
for (const p of pairs) {
  if (perContrast[p.c] >= 26) continue;
  perContrast[p.c]++;
  const [, , label, tip] = CONTRASTS[p.c];
  const a = WORDS[p.a], b = WORDS[p.b];
  items.push({ id: `sd/${a.w}/${b.w}`, k: 'sound-pair', choices: [p.a, p.b], contrast: label, tip, level: 2 + Math.floor(perContrast[p.c] / 8) });
  for (const x of [p.a, p.b]) audioWords.set(x, { ...(audioWords.get(x) || {}), fr: true });
}

// ── 9. spelling: which is it? ────────────────────────────────────────────
// The word is heard; the learner picks the spelling. The wrong spellings are
// the ones French actually punishes — the missing accent, the single letter
// where there are two, the silent ending — and each is checked not to be a
// real word, in Lexique or in this deck.
const REAL = new Set(Object.keys(SPELL));
const VOWEL = /[aeiouyàâäéèêëîïôöùûü]/;
const slip = (w) => {
  const out = new Set();
  const swapAccent = { é: ['è', 'e', 'ê'], è: ['é', 'e', 'ê'], ê: ['e', 'è'], e: ['é', 'è'], à: ['a'], â: ['a'], ô: ['o'], î: ['i'], û: ['u'], ç: ['c'], ù: ['u'] };
  for (let k = 0; k < w.length; k++) {
    for (const r of swapAccent[w[k]] || []) out.add(w.slice(0, k) + r + w.slice(k + 1));
    // a doubled consonant written once…
    if (/[bcdfglmnprstvz]/.test(w[k]) && w[k + 1] === w[k]) out.add(w.slice(0, k) + w.slice(k + 1));
    // …and a single one between vowels written twice
    else if (/[lmnprst]/.test(w[k]) && k > 0 && VOWEL.test(w[k - 1]) && VOWEL.test(w[k + 1] || '') && w[k - 1] !== w[k]) out.add(w.slice(0, k + 1) + w[k] + w.slice(k + 1));
  }
  // the silent ending
  if (/t$/.test(w)) out.add(w.slice(0, -1) + 'd');
  if (/d$/.test(w)) out.add(w.slice(0, -1) + 't');
  if (/[aeiouéèê]$/.test(w) && w.length > 4) out.add(w + 's');
  if (/ph/.test(w)) out.add(w.replace('ph', 'f'));
  if (/ss/.test(w)) out.add(w.replace('ss', 'c'));
  if (/eau/.test(w)) out.add(w.replace('eau', 'o'));
  if (/ai/.test(w)) out.add(w.replace('ai', 'é'));
  if (/^h/.test(w) && w.length > 4) out.add(w.slice(1));
  if (/an/.test(w)) out.add(w.replace('an', 'en')); else if (/en/.test(w)) out.add(w.replace('en', 'an'));
  if (/qu/.test(w)) out.add(w.replace('qu', 'cu'));
  out.delete(w);
  return [...out].filter((x) => x.length >= 3 && !REAL.has(norm(x)) && !WORDS.some((y) => y.w === x));
};
let spellN = 0;
for (const [i, w] of WORDS.entries()) {
  if (i >= 3200 || w.k === 'int' || w.w.includes(' ') || w.w.includes('-') || w.w.length < 4) continue;
  if (!hasAudio(i) && i >= AUDIO_WORDS) continue;
  const bad = slip(w.w);
  if (bad.length < 3) continue;
  const rnd = seeded('sp' + w.w);
  // prefer a spread of slips: accent, doubling, ending
  const options = shuffled(bad, rnd).slice(0, 3);
  items.push({ id: `sp/${w.w}`, k: 'spell-pick', i, answer: w.w, options, level: 4 + Math.min(4, Math.floor(w.r / 900)) });
  spellN++;
}

// ── 10. the Canadian French track ────────────────────────────────────────
const srcOf = (e) => CAN_SRC.filter((x) => x.w === e.qc);
const canWords = CANADIAN.map((e, ix) => ({ e, ix }));
const canMeans = CANADIAN.map((e) => e.means);
const canKw = CANADIAN.map((e) => kw(e.means));
const canDeck = [];
for (const { e, ix } of canWords) {
  const src = srcOf(e);
  // the Wiktionary sense that backs the claim, and the sense it contrasts with
  const sense = src.flatMap((x) => x.senses.map((s) => ({ s, x }))).find(({ s }) => (s.g || '').toLowerCase().replace(/’/g, "'").includes(e.src.toLowerCase().replace(/’/g, "'")) && (!e.tags.length || s.t.some((t) => e.tags.includes(t))));
  const audio = src.flatMap((x) => x.audio).find((a) => a.t.some((t) => t === 'Canada' || t === 'Quebec'));
  const ipaQc = src.flatMap((x) => x.ipa).find((p) => p.t.some((t) => t === 'Canada' || t === 'Quebec'));
  const ipa = src.flatMap((x) => x.ipa).find((p) => !p.t.length);
  const ex = SENT.filter((s) => { const toks = ' ' + tokens(s.t).join(' ') + ' '; return toks.includes(' ' + norm(e.qc).replace(/’/g, "'") + ' '); })
    .sort((a, b) => (b.qc ? 1 : 0) - (a.qc ? 1 : 0) || a.n - b.n)[0];
  canDeck.push({
    qc: e.qc, kind: e.kind, means: e.means, std: e.std || undefined, fr: e.fr || undefined, note: e.note || undefined, stage: e.stage - 1,
    tags: sense ? sense.s.t.filter((t) => ['Quebec', 'Canada', 'North-America', 'informal', 'colloquial', 'slang'].includes(t)) : [],
    gloss: sense ? sense.s.g : null,
    contrast: e.contrast ? (() => { const s2 = src.flatMap((x) => x.senses).find((s) => s.t.includes(e.contrast.tag) && (s.g || '').includes(e.contrast.src)); return s2 ? s2.g : null; })() : undefined,
    also: e.also, ipa: ipa?.ipa, ipaQc: ipaQc?.ipa,
    audio: audio ? { f: audio.f, by: (/LL-Q150 \(fra\)-(.+?)-/.exec(audio.f) || [])[1] || 'Wikimedia Commons', place: audio.note || null, mp3: audio.mp3 } : undefined,
    ex: ex ? { id: ex.id, t: ex.t, e: ex.e, a: recorded(ex) ? 1 : 0 } : undefined,
    ok: !!sense,
    fr2: CAN_FR[e.qc]?.marked ? true : undefined,
  });
}
const canIdx = new Map(canDeck.map((c, i) => [c.qc, i]));
for (const [ix, c] of canDeck.entries()) {
  if (!c.ok) { console.log('  not backed by Wiktionary, left out:', c.qc); continue; }
  const rnd = seeded('qc' + c.qc);
  // options: the contrast partners first (the meals), then others of the same kind
  const partners = (c.also || []).map((w) => canIdx.get(w)).filter((j) => j != null);
  const same = shuffled(canDeck.map((x, j) => j).filter((j) => j !== ix && canDeck[j].ok && canDeck[j].kind === c.kind && !overlap(canKw[ix], canKw[j])), rnd);
  const pickIdx = [...new Set([...partners, ...same])].filter((j) => canDeck[j].ok).slice(0, 3);
  if (pickIdx.length < 3) continue;
  const stage = c.stage;
  if (c.kind === 'word') {
    items.push({ id: `qm/${c.qc}`, k: 'qc-mean', q: ix, options: pickIdx.map((j) => canDeck[j].means), level: 3, stageHint: stage });
    items.push({ id: `qp/${c.qc}`, k: 'qc-pick', q: ix, options: pickIdx.map((j) => canDeck[j].qc), level: 4, stageHint: stage });
    if (c.audio) items.push({ id: `ql/${c.qc}`, k: 'qc-listen', q: ix, options: pickIdx.map((j) => canDeck[j].means), level: 4, stageHint: stage });
  } else {
    // spoken forms: oral → standard, and the meaning
    const stds = canDeck.filter((x, j) => j !== ix && x.ok && x.kind === 'oral' && x.std && x.std !== c.std).map((x) => x.std);
    if (c.std && stds.length >= 3) items.push({ id: `qo/${c.qc}`, k: 'qc-oral', q: ix, options: shuffled(stds, rnd).slice(0, 3), level: 3, stageHint: stage });
    items.push({ id: `qm/${c.qc}`, k: 'qc-mean', q: ix, options: pickIdx.map((j) => canDeck[j].means), level: 3, stageHint: stage });
  }
}

// ── 11. put it in order ──────────────────────────────────────────────────
// Real sentences carrying the structure the grammar point teaches, in pieces.
const buildItems = [];
for (const g of GRAMMAR.filter((x) => x.drill === 'build')) {
  const re = new RegExp(g.match, 'iu');
  const hits = SENT.filter((s) => s.n >= 4 && s.n <= 8 && s.u === 0 && s.reg !== 'fam' && re.test(s.t) && !/[«»:;]/.test(s.t))
    .sort((a, b) => (recorded(b) ? 1 : 0) - (recorded(a) ? 1 : 0) || a.n - b.n);
  const take = [];
  const seenShape = new Set();
  for (const s of hits) {
    const shape = s.t.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    if (seenShape.has(shape)) continue;
    seenShape.add(shape);
    take.push(s);
    if (take.length >= 24) break;
  }
  for (const s of take) {
    // a French sentence may end " !" with a space before the mark; that is not a piece
    const pieces = s.t.replace(/\s*[.!?…]+$/, '').split(/\s+/).filter(Boolean);
    if (pieces.length < 4 || pieces.length > 8) continue;
    const text = s.t;
    if (recorded(s)) audioSent.add(s.id);
    buildItems.push({ id: `gb/${g.id}/${s.id}`, k: 'grammar-build', gid: g.id, sid: s.id, text, eng: s.e, audio: recorded(s) ? 1 : 0, pieces, level: 4 });
  }
}
items.push(...buildItems);

// ── 12. confusable words ─────────────────────────────────────────────────
const wi = new Map(WORDS.map((w, i) => [w.w, i]));
const notes = [];
for (const n of NOTES) {
  const idx = n.words.map((w) => wi.get(w));
  if (idx.some((i) => i == null)) { console.log('  note dropped, a word is not in the deck:', n.id, n.words.filter((w) => !wi.has(w)).join(', ')); continue; }
  notes.push({ id: n.id, kind: n.kind, title: n.title, plain: n.plain, watch: n.watch || null, words: idx });
  if (!n.ask) continue;
  const answer = wi.get(n.ask.answer);
  const others = n.ask.with.map((w) => wi.get(w)).filter((i) => i != null);
  if (answer == null || others.length < 2) continue;
  items.push({ id: `np/${n.id}`, k: 'note-pick', nid: n.id, prompt: n.ask.prompt, i: answer, options: others.map((i) => WORDS[i].w), level: 3, stageHint: stageOfRank(WORDS[answer].r) });
}
const cues = {};
for (const n of NOTES) for (const [w, cue] of Object.entries(n.cues || {})) { const i = wi.get(w); if (i != null) cues[i] = cue; }

// ── 13. grammar: the points, with real examples ──────────────────────────
const grammar = GRAMMAR.map((g) => {
  const re = g.match ? new RegExp(g.match, 'iu') : null;
  const ex = re ? SENT.filter((s) => s.n >= 4 && s.n <= 9 && s.u === 0 && re.test(s.t) && s.reg !== 'fam').sort((a, b) => (recorded(b) ? 1 : 0) - (recorded(a) ? 1 : 0) || a.n - b.n).slice(0, 5).map((s) => ({ id: s.id, t: s.t, e: s.e, a: recorded(s) ? 1 : 0 })) : [];
  for (const e of ex) if (e.a) audioSent.add(e.id);
  return { id: g.id, title: g.title, fr: g.fr, plain: g.plain, watch: g.watch || null, drill: g.drill, stage: stageOfPoint.get(g.id) ?? null, examples: ex, endings: g.endings || undefined, sets: g.sets || undefined };
});

// ── 13b. the conjugation drill ───────────────────────────────────────────
// "tu ____" + parler + présent. Built from the verb's own table, so nothing is invented, and
// laid out as a ladder (content/conjugation.mjs): the commonest verbs and tenses first.
//   - a compound tense is the auxiliary's own row plus the participle, so the table of
//     avoir / être is the source for every "ai / as / a …";
//   - only verbs that take ONE auxiliary are asked (passer, sortir, monter can take either, so
//     "j'ai passé" would be a wrong "wrong answer");
//   - an être verb is only asked where the participle's agreement is settled by the subject
//     shown (il / elle / ils / elles);
//   - the impératif is derived (tu drops the s of an -er verb), and the build re-derives it.
const LADDER = await load('content/conjugation.mjs');
const ETRE_VERBS = new Set(['aller', 'venir', 'arriver', 'partir', 'rester', 'tomber', 'naître', 'mourir', 'devenir', 'revenir', 'entrer']);
const ASPIRATED_H = new Set(['haïr', 'hurler', 'heurter', 'hisser', 'hanter', 'harceler', 'hacher', 'hausser', 'harponner', 'hennir', 'honnir', 'happer', 'harasser']);
const IMPERSONAL = new Set(['falloir', 'pleuvoir', 'neiger', 'venter', 'geler', 'bruiner', 'grêler']);   // "elle faut" is not French
const IMP_SKIP = new Set(['pouvoir', 'vouloir', 'falloir', 'valoir', 'pleuvoir', 'devoir', 'mourir']);
const DROP_S = new Set(['ouvrir', 'offrir', 'couvrir', 'souffrir', 'cueillir', 'accueillir', 'recueillir', 'découvrir', 'recouvrir', 'entrouvrir', 'aller']);
const TENSE_LABEL = {
  pr: ['présent', 'present'], im: ['imparfait', 'imperfect'], fu: ['futur', 'future'], co: ['conditionnel', 'conditional'], su: ['subjonctif', 'subjunctive'],
  pc: ['passé composé', 'past (passé composé)'], pqp: ['plus-que-parfait', 'pluperfect'], fa: ['futur antérieur', 'future perfect'], cop: ['conditionnel passé', 'conditional perfect'],
  sup: ['subjonctif passé', 'past subjunctive'], fp: ['futur proche', 'near future'], ip: ['impératif', 'imperative'],
};
const AUX_ROW = { pc: 'pr', pqp: 'im', fa: 'fu', cop: 'co', sup: 'su' };
const bad = (f) => !f || f === '-';
const idxOf = (l) => wordIndex.get(l);
const vowelStart = (s) => /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(s);
// "je" / "j'", "il" / "elle" / "on", with "que" before a subjunctive.
const pronounFor = (slot, variant, next, subj) => {
  const base = [['je'], ['tu'], ['il', 'elle', 'on'], ['nous'], ['vous'], ['ils', 'elles']][slot];
  const p = base[variant % base.length];
  if (subj) return p === 'je' ? (vowelStart(next) ? 'que j’' : 'que je ') : /^(il|elle|on|ils|elles)$/.test(p) ? 'qu’' + p + ' ' : 'que ' + p + ' ';
  if (p === 'je' && vowelStart(next)) return 'j’';
  return p + ' ';
};
const dropS = (w, row) => (w.w.endsWith('er') || DROP_S.has(w.w)) && row[1].endsWith('s') ? row[1].slice(0, -1) : row[1];
const impForm = (w, slot) => {
  const lem = w.w;
  if (lem === 'être') return ['', 'sois', '', 'soyons', 'soyez'][slot];
  if (lem === 'avoir') return ['', 'aie', '', 'ayons', 'ayez'][slot];
  if (lem === 'savoir') return ['', 'sache', '', 'sachons', 'sachez'][slot];
  return slot === 1 ? dropS(w, w.conj.pr) : slot === 3 ? w.conj.pr[3] : w.conj.pr[4];
};
const aux = (name, key, slot) => WORDS[idxOf(name)].conj[key]?.[slot];
const ppAgree = (pp, slot, variant) => {
  if (slot === 2) return variant === 1 ? pp + 'e' : pp;                      // il / elle (on stays masculine)
  if (slot === 5) return variant === 1 ? pp + 'es' : /[sx]$/.test(pp) ? pp : pp + 's';
  return pp;
};
// The whole form for one cell: { answer, wrongs[], pron, slot, variant } or null.
function drillCell(w, tense, slot, variant) {
  const c = w.conj, inf = w.w;
  if (!c || !c.pp || c.pp === '-') return null;
  const wrongPool = [];
  let answer, subj = tense === 'su' || tense === 'sup';
  if (['pr', 'im', 'fu', 'co', 'su'].includes(tense)) {
    answer = c[tense][slot];
    if (bad(answer)) return null;
    const row = c[tense];
    for (let k = 0; k < 6; k++) if (k !== slot) wrongPool.push(row[k]);
    for (const t2 of ['pr', 'im', 'fu', 'co', 'su']) if (t2 !== tense) wrongPool.push(c[t2][slot]);
  } else if (tense === 'ip') {
    if (IMP_SKIP.has(inf) || ![1, 3, 4].includes(slot)) return null;
    answer = impForm(w, slot);
    if (bad(answer) || bad(c.pr[slot])) return null;
    wrongPool.push(c.pr[slot], c.su[slot], c.pr[slot === 1 ? 4 : slot === 3 ? 4 : 3], c.pr[slot === 4 ? 3 : 1], c.fu[slot], c.im[slot]);
  } else if (tense === 'fp') {
    const go = aux('aller', 'pr', slot);
    answer = `${go} ${inf}`;
    wrongPool.push(`${aux('aller', 'pr', (slot + 1) % 6)} ${inf}`, `${aux('aller', 'pr', (slot + 3) % 6)} ${inf}`, `${go} ${c.pp}`, `${go} ${c.pr[slot]}`);
  } else {
    // a compound tense: auxiliary row + participle
    const useEtre = ETRE_VERBS.has(inf);
    if (!useEtre && w.aux !== 'avoir') return null;
    if (useEtre && ![2, 5].includes(slot)) return null;
    const key = AUX_ROW[tense];
    const own = aux(useEtre ? 'être' : 'avoir', key, slot), other = aux(useEtre ? 'avoir' : 'être', key, slot);
    if (bad(own) || bad(other)) return null;
    const pp = useEtre ? ppAgree(c.pp, slot, variant) : c.pp;
    answer = `${own} ${pp}`;
    const o1 = aux(useEtre ? 'être' : 'avoir', key, (slot + 1) % 6), o2 = aux(useEtre ? 'être' : 'avoir', key, (slot + 3) % 6);
    wrongPool.push(`${other} ${pp}`, inf.endsWith('er') && inf !== c.pp ? `${own} ${inf}` : `${o1} ${pp}`, `${o1} ${pp}`, `${o2} ${pp}`);
    if (useEtre && pp !== c.pp) wrongPool.push(`${own} ${c.pp}`);
    if (tense === 'pc') wrongPool.push(`${aux(useEtre ? 'être' : 'avoir', 'im', slot)} ${pp}`);
  }
  const wrongs = [];
  for (const x of wrongPool) { if (x && !bad(x) && x !== answer && !wrongs.includes(x) && !String(x).includes('undefined')) wrongs.push(x); if (wrongs.length === 3) break; }
  if (wrongs.length < 3) return null;
  const next = answer;
  const pron = tense === 'ip' ? '' : pronounFor(slot, variant, next, subj);
  return { answer, wrongs, pron, slot, variant, subj };
}
const rankOf = (w) => w.r;
const drillItems = [];
const drillSeen = new Set();
const SLOT_ORDER = [0, 1, 2, 3, 4, 5];
const verbsForRung = (rg) => {
  const v = rg.verbs;
  const all = WORDS.map((w, i) => ({ w, i })).filter((x) => x.w.k === 'v' && x.w.conj);
  if (v.only) return v.only.map((l) => all.find((x) => x.w.w === l)).filter(Boolean);
  return all.filter(({ w }) => rankOf(w) <= v.maxRank && (v.kind === 'any' || (v.kind === 'er' ? regularEr(w) : !regularEr(w) && !v_only_used.has(w.w))));
};
const v_only_used = new Set(LADDER[0].verbs.only || []);
for (const [rungIdx, rg] of LADDER.entries()) {
  const stage = rg.stage;
  for (const tense of rg.tenses) {
    for (const { w, i } of verbsForRung(rg)) {
      if (ASPIRATED_H.has(w.w) || IMPERSONAL.has(w.w)) continue;
      // a rung with `perVerb` asks each verb in only that many of its tenses (a different pair per verb)
      if (rg.perVerb && !shuffled(rg.tenses, seeded('pv' + w.w)).slice(0, rg.perVerb).includes(tense)) continue;
      const rnd = seeded('cd' + w.w + tense);
      const slots = tense === 'ip' ? [1, 3, 4] : SLOT_ORDER;
      const start = Math.floor(rnd() * slots.length);
      const order = slots.slice(start).concat(slots.slice(0, start));
      let made = 0;
      for (const slot of order) {
        if (made >= rg.persons) break;
        const key = `cd/${w.w}/${tense}/${slot}`;
        if (drillSeen.has(key)) continue;
        const variant = Math.floor(rnd() * 3);
        const cell = drillCell(w, tense, slot, variant);
        if (!cell) continue;
        // distinct forms only: a verb whose "je" and "il" are the same string is asked once in the pair
        const text = tense === 'ip' ? cell.answer + ' !' : cell.pron + cell.answer;
        drillSeen.add(key);
        // (the English for the question — the verb's gloss and the tense — is made in the app,
        // and the blank is the answer, so neither is stored 10,000 times)
        drillItems.push({
          id: key, k: 'conj-drill', v: i, tense, slot, rung: rungIdx,
          text, answer: cell.answer, options: cell.wrongs,
          level: Math.min(9, rungIdx + 2), stageHint: stage,
        });
        made++;
      }
    }
  }
}
items.push(...drillItems);
// The lessons that teach each step, and the model verb each one shows.
const LESSONS = await load('content/conjugation-lessons.mjs');
const BUILDS = (await import(pathToFileURL(join(ROOT, 'content', 'conjugation-lessons.mjs')).href)).BUILDS;
LADDER.forEach((rg, n) => {
  const b = BUILDS[rg.id];
  if (!b) throw new Error('no "builds on" for ' + rg.id);
  for (const f of b.from) if (LADDER.findIndex((x) => x.id === f) >= n || LADDER.findIndex((x) => x.id === f) < 0) throw new Error(`${rg.id} builds on ${f}, which is not an earlier step`);
});
for (const rg of LADDER) if (!LESSONS[rg.id]) throw new Error('no lesson for the conjugation step ' + rg.id);

// ── 13c. expressions and odd usages ──────────────────────────────────────
// "avoir du bol" — to be lucky. Only expressions English Wiktionary backs (build/lib/expressions.mjs)
// are kept, and a note about an origin is kept only if the head word's etymology says it.
const { backing, exampleFor } = await import(pathToFileURL(join(ROOT, 'build', 'lib', 'expressions.mjs')).href);
const EXPR = await load('content/expressions.mjs');
const EXPR_SRC = existsSync(join(ROOT, 'corpus', 'expressions-src.json')) ? read('expressions-src.json') : {};
const exprDeck = [];
for (const e of EXPR) {
  const why = backing(e, EXPR_SRC);
  if (why.length) { console.log(`  expression left out (Wiktionary does not back it): ${e.fr} — ${why.join('; ')}`); continue; }
  const wi = wordIndex.get(e.word) ?? wordIndex.get(e.word.replace(/œ/g, 'oe'));
  // (a head word outside the 7,000 is fine: the expression is taught on its own, from the third stage)
  const ex = exampleFor(e, EXPR_SRC);
  exprDeck.push({ id: e.id, fr: e.fr, en: e.en, literal: e.literal, i: wi ?? undefined, reg: e.reg || undefined, note: e.note, ex: ex ? { t: ex.t, e: ex.e } : undefined });
}
for (const [n, e] of exprDeck.entries()) {
  // three other meanings that share no content word with this one, to choose among
  const mine = kw(e.en);
  const pool = shuffled(exprDeck.filter((o) => o !== e && !overlap(mine, kw(o.en)) && o.en !== e.en), seeded('ex' + e.id));
  const options = [];
  for (const o of pool) { if (!options.some((x) => overlap(kw(x), kw(o.en)))) options.push(o.en); if (options.length === 3) break; }
  if (options.length < 3) continue;
  items.push({ id: `ex/${e.id}`, k: 'idiom-mean', x: n, options, level: 4, stageHint: e.i == null ? 2 : Math.max(1, stageOfRank(WORDS[e.i].r)) });
}

const conjTenses = Object.fromEntries(Object.entries(TENSE_LABEL).map(([k, [fr, en]]) => [k, { fr, en }]));
const conjLadder = LADDER.map((rg, n) => ({ id: rg.id, title: rg.title, en: rg.en, why: rg.why, tenses: rg.tenses, stage: rg.stage, n: drillItems.filter((x) => x.rung === n).length,
  builds: BUILDS[rg.id].from.map((f) => LADDER.findIndex((x) => x.id === f)), uses: BUILDS[rg.id].uses,
  teach: { ...LESSONS[rg.id], model: LESSONS[rg.id].model ? idxOf(LESSONS[rg.id].model) : null, words: (LESSONS[rg.id].words || []).map(idxOf) } }));
for (const r of conjLadder) { if (r.teach.model === undefined || r.teach.words.some((x) => x == null)) throw new Error('a lesson names a verb that is not in the deck: ' + r.id); }

// ── 14. the stages, and where each question sits ─────────────────────────
const stages = SYLLABUS.map((st) => ({
  id: st.id, title: st.title, en: st.en, cefr: st.cefr, can: st.can, why: st.why, gate: st.gate, grammar: st.grammar,
  words: WORDS.map((w, i) => i).filter((i) => WORDS[i].r >= st.from && WORDS[i].r <= st.to),
}));
const stageOfWordIdx = (i) => stageOfRank(WORDS[i].r);
const stageOfGrammar = (gid) => stageOfPoint.get(gid);
// Where each question sits in the teaching sequence. Word questions follow the
// frequency rank (reading first, hearing next, saying later); every OTHER kind
// is spread evenly through its own stage, so a stage is a mixture of
// vocabulary and grammar rather than all of its words and then all of its
// grammar — which is what the first version did, and a learner would have
// reached the first conjugation after the 300th word.
const WORD_BASED = new Set(['word-read', 'word-listen', 'word-pick', 'word-cloze', 'word-say', 'gender-pick', 'spell-pick']);
const OFFSET = { 'word-read': 0, 'word-listen': 1, 'word-pick': 2, 'gender-pick': 2.5, 'word-cloze': 150 / 5, 'word-say': 300 / 5, 'spell-pick': 400 / 5 };
const placeMap = new Map();
const buildPlaces = () => {
for (const it of items) if (WORD_BASED.has(it.k)) placeMap.set(it.id, WORDS[it.i].r * 5 + (OFFSET[it.k] || 0) * (it.k === 'word-cloze' || it.k === 'word-say' || it.k === 'spell-pick' ? 5 : 1));
{
  const groups = new Map();
  for (const it of items) if (!WORD_BASED.has(it.k)) { const n = it.stage ?? SYLLABUS.length - 1; if (!groups.has(n)) groups.set(n, []); groups.get(n).push(it); }
  for (const [n, list] of groups) {
    const st = SYLLABUS[Math.min(n, SYLLABUS.length - 1)];
    const lo = st.from * 5, hi = st.to * 5;
    // easiest first within a stage, then an even spread
    list.sort((a, b) => (a.level || 0) - (b.level || 0) || a.id.localeCompare(b.id));
    const mix = shuffled(list, seeded('stage' + n));
    mix.forEach((it, k) => placeMap.set(it.id, lo + ((k + 0.5) / mix.length) * (hi - lo)));
  }
}
};
const place = (it) => placeMap.get(it.id) ?? 1e6;
for (const it of items) {
  let n;
  if (it.stageHint != null) n = it.stageHint;
  else if (it.k === 'sound-pair') n = Math.max(...it.choices.map((c) => stageOfWordIdx(c)));
  else if (it.gid && it.i != null) n = Math.max(stageOfGrammar(it.gid) ?? 0, stageOfWordIdx(it.i));
  else if (it.gid) n = stageOfGrammar(it.gid) ?? 0;
  else if (it.i != null) n = stageOfWordIdx(it.i);
  if (it.k === 'gender-pick') n = Math.max(0, stageOfWordIdx(it.i));
  if (n != null) it.stage = n;
  delete it.stageHint;
}
// A grammar point is "met" when one of its questions has been answered, so a
// point listed in a stage needs a question inside that stage. Pull the
// easiest question of each such point forward if none sits there.
const stageOf = (it) => it.stage ?? 99;
for (const [gid, gs] of stageOfPoint) {
  const mine = items.filter((it) => it.gid === gid);
  if (!mine.length) { console.log('  WARNING: grammar point has no questions:', gid); continue; }
  if (mine.some((it) => stageOf(it) <= gs)) continue;
  const best = mine.slice().sort((a, b) => stageOf(a) - stageOf(b))[0];
  best.stage = gs;
}
buildPlaces();
items.sort((a, b) => (place(a) - place(b)) || a.id.localeCompare(b.id));
// If two ids collide, something upstream is wrong.
const ids = new Set();
for (const it of items) { if (ids.has(it.id)) throw new Error('duplicate id: ' + it.id); ids.add(it.id); }

// ── 15. audio the deck wants ─────────────────────────────────────────────
// Word recordings bundled with the app: the early words, in both accents
// where both exist. The rest play from Wikimedia Commons when there is
// signal, and from the phone's own voice when there is not.
const wordAudio = [];
for (const [i, w] of WORDS.entries()) {
  if (i < AUDIO_WORDS || audioWords.has(i)) {
    if (w.fr) wordAudio.push({ i, a: 'fr', f: w.fr.f, mp3: w.fr.mp3 });
    if (w.qcAudio) wordAudio.push({ i, a: 'qc', f: w.qcAudio.f, mp3: w.qcAudio.mp3 });
  }
}
for (const c of canDeck) if (c.audio && c.ok) wordAudio.push({ q: c.qc, a: 'qc', f: c.audio.f, mp3: c.audio.mp3 });
for (const it of drillItems) delete it.level;                 // only needed to order them above
mkdirSync(join(ROOT, 'app', 'data'), { recursive: true });
const aidOf = new Map(SENT.filter((s) => s.a).map((s) => [s.id, s.a.aid]));
const sentMeta = Object.fromEntries(SENT.filter((s) => audioSent.has(s.id) && s.a).map((s) => [s.id, { by: s.a.by, lic: s.a.lic }]));
const aid = Object.fromEntries([...audioSent].map((id) => [id, aidOf.get(id)]));
writeFileSync(join(ROOT, 'build', '_audio-plan.json'), JSON.stringify({ words: wordAudio, sentences: [...audioSent], aid }));

// ── 16. write ────────────────────────────────────────────────────────────
// A compact word record for the app: no download URLs (the app rebuilds them
// from the file name), and no fields only the build needs.
// The folder Commons files a transcoded clip under ("b/be"): the app rebuilds the URL from it.
const pathOf = (url) => (/transcoded\/([0-9a-f]\/[0-9a-f]{2})\//.exec(url || '') || [])[1];
const wire = WORDS.map((w, i) => ({
  w: w.w, d: w.d, k: w.k, r: w.r, g: w.g, gl: w.gl, alt: w.alt, gen: w.gen, g2: w.g2, ipa: w.ipa, ipaQc: w.ipaQc, reg: w.reg, qc: w.qc, aux: w.aux,
  fr: w.fr ? { by: w.fr.by, place: w.fr.place, f: w.fr.f, p: pathOf(w.fr.mp3) } : undefined,
  qcA: w.qcAudio ? { by: w.qcAudio.by, place: w.qcAudio.place, f: w.qcAudio.f, p: pathOf(w.qcAudio.mp3) } : undefined,
}));
const conj = {};
for (const [i, w] of WORDS.entries()) if (w.conj && w.k === 'v') conj[i] = w.conj;
const deck = {
  built: new Date().toISOString().slice(0, 10),
  stages, words: wire, conj, conjLadder, conjTenses, expressions: exprDeck, endings: endingStats,
  examples, grammar, notes, cues,
  canadian: canDeck.filter((c) => c.ok).map((c) => ({ ...c, ok: undefined, audio: c.audio ? { by: c.audio.by, place: c.audio.place, f: c.audio.f, p: pathOf(c.audio.mp3) } : undefined })),
  homophones: Object.fromEntries(Object.entries(HOMO).map(([k, v]) => [k, { point: v.point, tip: v.tip, words: v.words }])),
  items,
  audio: { words: wordAudio.length, sentences: [...audioSent] },
  sentAudio: sentMeta,
};
writeFileSync(join(ROOT, 'app', 'data', 'deck.json'), JSON.stringify(deck));
const byK = items.reduce((m, i) => ({ ...m, [i.k]: (m[i.k] || 0) + 1 }), {});
console.log(`deck: ${items.length.toLocaleString()} questions from ${WORDS.length.toLocaleString()} words (${(JSON.stringify(deck).length / 1e6).toFixed(1)} MB)`);
for (const [k, n] of Object.entries(byK)) console.log(`  ${k.padEnd(16)} ${n.toLocaleString()}`);
console.log(`  stages: ${stages.map((s) => `${s.cefr} ${s.words.length}w/${items.filter((i) => i.stage === stages.indexOf(s)).length}q`).join(', ')}`);
console.log(`  examples for ${Object.keys(examples).length.toLocaleString()} words; recordings wanted: ${wordAudio.length.toLocaleString()} words, ${audioSent.size.toLocaleString()} sentences`);
