// Jasette — from the open sources to corpus/*.json.
//
//   node build/extract.mjs
//
// Three sources, and each is used for the thing it is actually good at:
//
//   Lexique 3.83 (lexique.org, CC BY-SA 4.0)  — how often a word is used, in
//       film subtitles (spoken-like) and in books (written), every inflected
//       form of every lemma, and the gender Lexique records for nouns.
//   English Wiktionary via kaikki.org (CC BY-SA 3.0/4.0) — meanings, tagged by
//       register and region; IPA by region; conjugation tables; and audio.
//   Tatoeba (CC BY 2.0 FR; audio CC BY 4.0 and others) — sentences with a
//       human translation, and recordings of some of them.
//
// Nothing here is invented. A word's gender is only treated as settled when
// Lexique and Wiktionary agree; a meaning is only taught if Wiktionary gives it
// to that lemma and part of speech.

import { createReadStream, writeFileSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = (...p) => join(ROOT, 'sources', ...p);
mkdirSync(join(ROOT, 'corpus'), { recursive: true });
const OUT = (f) => join(ROOT, 'corpus', f);

const lines = (file) => createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });

// ── 1. Lexique ───────────────────────────────────────────────────────────
// One row per (spelling, lemma, category). Lemma frequency is repeated on
// every row of a lemma, so it is read once.
const CG = {
  NOM: 'NOM', VER: 'VER', AUX: 'VER', ADJ: 'ADJ', 'ADJ:num': 'NUM', 'ADJ:pos': 'DET', 'ADJ:dem': 'DET', 'ADJ:ind': 'ADJ', 'ADJ:int': 'DET',
  ADV: 'ADV', PRE: 'PRE', CON: 'CON', ONO: 'INT',
  'PRO:per': 'PRO', 'PRO:pos': 'PRO', 'PRO:dem': 'PRO', 'PRO:ind': 'PRO', 'PRO:int': 'PRO', 'PRO:rel': 'PRO',
  'ART:def': 'DET', 'ART:ind': 'DET',
};
const lex = new Map();            // 'lemme|CG' -> entry
const forms = new Map();          // ortho -> [{l, c, g, n, iv, f}]
let rows = 0;
{
  const rl = lines(SRC('lexique', 'Lexique383.tsv'));
  let head = true;
  for await (const line of rl) {
    if (head) { head = false; continue; }
    const c = line.split('\t');
    const [ortho, phon, lemme, cgram0, genre, nombre, flf, fll, ff, fl, infover] = c;
    const cg = CG[cgram0];
    if (!cg || !lemme) continue;
    rows++;
    // Lexique frequencies are per million; the films column is subtitles.
    const lf = parseFloat(flf) || 0, ll = parseFloat(fll) || 0;
    const key = lemme + '|' + cg;
    let e = lex.get(key);
    if (!e) { e = { w: lemme, c: cg, filmsBy: new Map(), booksBy: new Map(), genre: new Set(), phon: null }; lex.set(key, e); }
    // AUX and VER rows of the same lemma split one lemma's usage between them,
    // so the lemma's frequency is their sum.
    e.filmsBy.set(cgram0, Math.max(e.filmsBy.get(cgram0) || 0, lf));
    e.booksBy.set(cgram0, Math.max(e.booksBy.get(cgram0) || 0, ll));
    if (ortho === lemme) {
      if (!e.phon) e.phon = phon;
      if (cg === 'NOM' && genre) e.genre.add(genre);
    }
    const f = (parseFloat(ff) || 0) + (parseFloat(fl) || 0);
    if (!forms.has(ortho)) forms.set(ortho, []);
    forms.get(ortho).push({ l: lemme, c: cg, g: genre, n: nombre, iv: infover || '', f });
  }
}
for (const e of lex.values()) {
  e.films = [...e.filmsBy.values()].reduce((a, b) => a + b, 0);
  e.books = [...e.booksBy.values()].reduce((a, b) => a + b, 0);
  delete e.filmsBy; delete e.booksBy;
  e.genre = [...e.genre];
}
console.log(`Lexique: ${rows.toLocaleString()} rows, ${lex.size.toLocaleString()} lemma/category pairs, ${forms.size.toLocaleString()} spellings`);

// ── 2. the ranking ───────────────────────────────────────────────────────
// Subtitles are the nearest thing Lexique has to speech, books are the nearest
// to what you will read. Neither alone: a word nobody says is worth less to a
// learner who wants to talk, and a word nobody writes is worth less to one who
// wants to read the news.
const score = (e) => 0.6 * e.films + 0.4 * e.books;
const OKCHARS = /^[a-zàâäæçéèêëîïôöœùûüÿ'’-]+( [a-zàâäæçéèêëîïôöœùûüÿ'’-]+)*$/i;
let cand = [...lex.values()].filter((e) => score(e) >= 0.3 && OKCHARS.test(e.w));
cand.sort((a, b) => score(b) - score(a));
// Only the head of the list is needed: 16,000 candidates is more than any
// learner will reach, and Wiktionary is only read for these.
cand = cand.slice(0, 16000);
const want = new Map(cand.map((e) => [e.w + '|' + e.c, e]));
const wantWords = new Set(cand.map((e) => e.w));

// ── 3. Wiktionary ────────────────────────────────────────────────────────
// Which Wiktionary part-of-speech names a Lexique category may match.
const POS = { NOM: ['noun'], VER: ['verb'], ADJ: ['adj', 'det', 'num'], ADV: ['adv'], PRE: ['prep'], CON: ['conj'], INT: ['intj'], PRO: ['pron', 'det', 'adj', 'adv'], DET: ['det', 'article', 'adj', 'pron'], NUM: ['num', 'adj', 'det'] };
const posToCg = new Map();
for (const [cg, ps] of Object.entries(POS)) for (const p of ps) { if (!posToCg.has(p)) posToCg.set(p, []); posToCg.get(p).push(cg); }

const isCanadian = (t) => t.some((x) => x === 'Canada' || x === 'Quebec' || x === 'Acadia' || x === 'Acadian' || x === 'Ontario');
const FORM_TAGS = ['form-of', 'alt-of', 'plural-of', 'inflection-of'];

// Lexique writes the ligature as two letters (coeur, soeur, oeil, oeuf); Wiktionary
// writes it as one (cœur, sœur, œil, œuf). Joined on the two-letter form, shown
// with the one-letter form.
const norm = (w) => w.replace(/œ/g, 'oe').replace(/Œ/g, 'Oe');
const wik = new Map();            // 'word|CG' -> record, keyed by Lexique's spelling
const qcAll = [];                 // every Wiktionary sense tagged for Quebec/Canada, whatever the frequency
{
  const rl = lines(SRC('wiktionary', 'kaikki-french.jsonl'));
  let n = 0;
  for await (const line of rl) {
    const e = JSON.parse(line);
    n++;
    if (e.lang_code !== 'fr') continue;
    const cgs = posToCg.get(e.pos);
    const senses = (e.senses || []).map((s) => ({
      g: (s.glosses || []).slice(-1)[0] || '',
      parent: (s.glosses || []).length > 1 ? s.glosses[0] : null,
      t: s.tags || [],
      ex: (s.examples || []).slice(0, 2).map((x) => ({ t: x.text, e: x.english || x.translation || null })).filter((x) => x.t),
      form: (s.tags || []).some((t) => FORM_TAGS.includes(t)) || !!(s.form_of || s.alt_of || []).length,
    })).filter((s) => s.g);
    // Canadian senses are kept whether or not the word is frequent.
    if (senses.some((s) => isCanadian(s.t))) {
      qcAll.push({
        w: e.word, pos: e.pos,
        senses: senses.filter((s) => isCanadian(s.t)).map((s) => ({ g: s.g, t: s.t, ex: s.ex })),
        all: senses.slice(0, 5).map((s) => ({ g: s.g, t: s.t })),
        ipa: (e.sounds || []).filter((s) => s.ipa).map((s) => ({ ipa: s.ipa, t: s.tags || [] })),
        audio: (e.sounds || []).filter((s) => s.audio).map((s) => ({ f: s.audio, t: s.tags || [], note: s.note || null, mp3: s.mp3_url || null })),
      });
    }
    const key0 = norm(e.word);
    if (!cgs || !wantWords.has(key0)) continue;
    for (const cg of cgs) {
      const k = key0 + '|' + cg;
      if (!want.has(k)) continue;
      let r = wik.get(k);
      if (!r) { r = { senses: [], ipa: [], audio: [], gender: new Set(), forms: [], head: null, aux: null, disp: null }; wik.set(k, r); }
      if (e.word !== key0 && senses.some((s) => !s.form)) r.disp = e.word;
      r.senses.push(...senses);
      r.head = r.head || (e.head_templates?.[0]?.expansion || null);
      for (const s of e.sounds || []) {
        if (s.ipa) r.ipa.push({ ipa: s.ipa, t: s.tags || [] });
        if (s.audio) r.audio.push({ f: s.audio, t: s.tags || [], note: s.note || null, mp3: s.mp3_url || null });
      }
      for (const s of e.senses || []) {
        for (const t of s.tags || []) { if (t === 'masculine') r.gender.add('m'); if (t === 'feminine') r.gender.add('f'); }
      }
      // Head line: "maison f (plural maisons)" — the letter after the word is the gender.
      const hm = /^\S+(?: \S+)*? (m or f|m|f)\b/.exec(e.head_templates?.[0]?.expansion || '');
      if (hm && cg === 'NOM') for (const g of hm[1].split(' or ')) r.gender.add(g);
      // The conjugation table, as Wiktionary generates it: one row per form,
      // each with its own tags (person, number, tense, mood). Multi-word
      // constructions ("être + past participle") are descriptions, not forms.
      if (cg === 'VER' && e.forms?.length) {
        const aux = e.forms.find((f) => (f.tags || []).includes('infinitive') && (f.tags || []).includes('multiword-construction') && /^(être|avoir) \+ past participle/.test(f.form));
        if (aux && !r.aux) r.aux = aux.form.startsWith('être') ? 'etre' : 'avoir';
        r.forms.push(...e.forms
          .filter((f) => f.source === 'conjugation' && !(f.tags || []).some((t) => ['multiword-construction', 'table-tags', 'inflection-template'].includes(t)))
          .map((f) => ({ f: f.form, t: f.tags || [], ipa: f.ipa || null })));
      }
    }
  }
  console.log(`Wiktionary: ${n.toLocaleString()} entries read; ${wik.size.toLocaleString()} matched to a Lexique lemma; ${qcAll.length.toLocaleString()} with a Canadian sense`);
}

// ── 4. Tatoeba ───────────────────────────────────────────────────────────
const eng = new Map();
for await (const line of lines(SRC('tatoeba', 'eng_sentences.tsv'))) { const c = line.split('\t'); eng.set(c[0], c[2]); }
const links = new Map();
for await (const line of lines(SRC('tatoeba', 'fra-eng_links.tsv'))) {
  const [a, b] = line.split('\t');
  if (!eng.has(b)) continue;
  if (!links.has(a)) links.set(a, []);
  links.get(a).push(b);
}
const audioBy = new Map();
for await (const line of lines(SRC('tatoeba', 'audio', 'sentences_with_audio.csv'))) {
  const c = line.split('\t');
  // c[0] is the AUDIO id, which is what tatoeba.org/en/audio/download/<id> serves;
  // the per-sentence path on audio.tatoeba.org answers 404 for most French recordings.
  if (c[1]) audioBy.set(c[1], { by: c[2], lic: c[3] || null, aid: +c[0] });
}
const tags = new Map();
for await (const line of lines(SRC('tatoeba', 'tags', 'tags.csv'))) {
  const [id, tag] = line.split('\t');
  if (!tag) continue;
  if (!tags.has(id)) tags.set(id, []);
  tags.get(id).push(tag);
}
const sentences = [];
for await (const line of lines(SRC('tatoeba', 'fra_sentences_detailed.tsv'))) {
  const [id, , text, user] = line.split('\t');
  const ls = links.get(id);
  if (!ls) continue;
  // The translation nearest in length is usually the plainest one; a very long
  // one tends to be a different sentence that was linked loosely.
  const cands = ls.map((l) => eng.get(l)).filter(Boolean);
  const len = text.length;
  cands.sort((a, b) => Math.abs(a.length - len * 0.95) - Math.abs(b.length - len * 0.95));
  const en = cands[0];
  if (!en) continue;
  const au = audioBy.get(id);
  const tg = tags.get(id) || [];
  const s = { id: +id, t: text, e: en, u: user };
  if (au) s.a = { by: au.by, lic: au.lic, aid: au.aid };
  if (tg.some((x) => /canad|qu[eé]b/i.test(x))) s.qc = 1;
  if (tg.some((x) => /colloquial|slang|vulgar|informal|familiar/i.test(x))) s.reg = 'fam';
  sentences.push(s);
}
console.log(`Tatoeba: ${sentences.length.toLocaleString()} French sentences with an English translation; ${sentences.filter((s) => s.a).length.toLocaleString()} recorded; ${sentences.filter((s) => s.qc).length} tagged Canadian`);

// ── 5. write ─────────────────────────────────────────────────────────────
// The lexicon: Lexique's numbers joined to Wiktionary's meanings. A lemma
// Wiktionary has no usable meaning for is not taught.
const lexicon = [];
for (const e of cand) {
  const r = wik.get(e.w + '|' + e.c);
  if (!r) continue;
  const gl = r.senses.filter((s) => !s.form);
  if (!gl.length) continue;
  lexicon.push({
    w: e.w, disp: r.disp || undefined, c: e.c, films: +e.films.toFixed(2), books: +e.books.toFixed(2), s: +score(e).toFixed(2),
    phon: e.phon, lexGender: e.genre.length === 1 ? e.genre[0] : null, wikGender: [...r.gender], head: r.head,
    ipa: r.ipa, audio: r.audio, aux: r.aux,
    senses: gl.map(({ g, parent, t, ex }) => ({ g, parent, t, ex })),
    forms: r.forms,
  });
}
lexicon.sort((a, b) => b.s - a.s);
lexicon.forEach((e, i) => { e.rank = i + 1; });
writeFileSync(OUT('lexicon.json'), JSON.stringify(lexicon));
console.log(`lexicon: ${lexicon.length.toLocaleString()} lemmas with a Wiktionary meaning`);

// The spelling index, for lemmatising sentences: only for lemmas in the lexicon.
const keep = new Set(lexicon.map((e) => e.w + '|' + e.c));
const spell = {};
for (const [o, list] of forms) {
  const ok = list.filter((x) => keep.has(x.l + '|' + x.c));
  if (ok.length) spell[o] = ok.sort((a, b) => b.f - a.f).slice(0, 4).map((x) => [x.l, x.c, x.g, x.n, x.iv]);
}
writeFileSync(OUT('spellings.json'), JSON.stringify(spell));
console.log(`spellings: ${Object.keys(spell).length.toLocaleString()}`);

writeFileSync(OUT('sentences.json'), JSON.stringify(sentences));
writeFileSync(OUT('canadian-senses.json'), JSON.stringify(qcAll));
console.log('wrote corpus/lexicon.json, spellings.json, sentences.json, canadian-senses.json');
