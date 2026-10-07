// The word list the app teaches: corpus/lexicon.json → corpus/words.json.
//
//   node build/words.mjs      (after build/extract.mjs and build/senses.mjs)
//
// One entry per word. The decisions made here, and why:
//
//   WHICH WORDS. Content words and the prepositions and conjunctions that hold
//     them together. Pronouns, articles and numerals are taught by the grammar
//     points, not as vocabulary: a learner who has French does not need a card
//     that says je means I, and the cloze and gender questions test them in
//     their sentences anyway.
//   WHICH MEANING. The sense the translators of 378,000 sentences reach for
//     (build/senses.mjs), unless a person chose (content/glosses.mjs). Senses
//     tagged for Québec or Canada are kept apart — they are taught on their own
//     track, as Canadian French, not slipped in as if they were the only one.
//   GENDER. Settled only where Lexique and Wiktionary agree.
//   SOUND. One recording from France and one from Québec where the sources
//     have them, and the IPA each source gives for each.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, 'corpus', f), 'utf8'));
const LEX = read('lexicon.json');
const SENSES = read('senses.json');
const HAND = (await import(pathToFileURL(join(ROOT, 'content', 'glosses.mjs')).href)).default;

import { shorten } from './lib/shorten.mjs';

const WORDS = 7000;
const KEEP = new Set(['NOM', 'VER', 'ADJ', 'ADV', 'PRE', 'CON', 'INT']);
const KIND = { NOM: 'n', VER: 'v', ADJ: 'adj', ADV: 'adv', PRE: 'prep', CON: 'conj', INT: 'int' };

const SKIP_TAG = new Set(['obsolete', 'archaic', 'historical', 'dated', 'rare', 'misspelling', 'nonstandard', 'abbreviation', 'initialism', 'acronym', 'proscribed', 'Louisiana', 'Belgium', 'Switzerland', 'Africa', 'form-of', 'alt-of', 'Antilles', 'Guyana', 'Normandy', 'Cajun', 'regional', 'Anglicism']);
const CA = (t) => t.some((x) => x === 'Canada' || x === 'Quebec' || x === 'Acadia' || x === 'Acadian' || x === 'Ontario' || x === 'North-America');
// Strong vulgarities are not taught as vocabulary. They are real, and the app has one card that says
// what they are; it does not drill them, and it must be safe to run aloud on a bus.
const RUDE = new Set(['bordel', 'merde', 'putain', 'con', 'connard', 'connasse', 'salaud', 'salope', 'cul', 'bite', 'couille', 'couilles', 'chier', 'foutre', 'enculer', 'niquer', 'pute', 'pisser', 'baiser', 'branler', 'bander', 'nichon', 'nichons', 'cocu', 'conne', 'emmerder', 'enfoiré', 'enculé', 'pédé', 'nègre', 'bougnoule', 'négro', 'garce', 'bâtard', 'crétin', 'ordure', 'führer', 'moi']);
const FAM = new Set(['colloquial', 'informal', 'slang', 'familiar']);
const BAD = new Set(['vulgar', 'offensive', 'derogatory', 'pejorative']);

// ── choose a sense for each lemma/category ───────────────────────────────
const pickSense = (e) => {
  const k = e.w + '|' + e.c;
  const sc = SENSES[k] || [];
  const ok = e.senses.map((s, i) => i).filter((i) => {
    const s = e.senses[i];
    return !s.t.some((t) => SKIP_TAG.has(t)) && !CA(s.t) && !s.g.startsWith('Elision') && !s.g.startsWith('alternative') && !s.g.startsWith('contraction');
  });
  if (!ok.length) return null;
  // The translation evidence counts when there is some; Wiktionary's own order
  // is the tie-break and the prior.
  const score = (i) => (sc[i]?.ev || 0) + 0.05 / (1 + i);
  return ok.slice().sort((a, b) => score(b) - score(a))[0];
};

// A spelling can be more than one category: tout is an adjective, an adverb and
// a pronoun; aller is a verb and, rarely, an outward journey; si is "if" and
// "so". LEX is in frequency order, so the first one met is the commoner and is
// the entry — unless a person chose, in content/glosses.mjs, which category is
// the one to teach (`pick`: nouveau is an adjective before it is a noun).
const byWord = new Map();
const cands = new Map();
for (const e of LEX) {
  if (!KEEP.has(e.c)) continue;
  if (/'$/.test(e.w)) continue;               // elisions: l', d', qu'
  if (e.w.length < 2 && e.w !== 'à') continue; // the letter a, the letter y
  if (RUDE.has(e.w)) continue;
  const hand = HAND[e.w + '|' + KIND[e.c]];
  const i = pickSense(e);
  if (i == null && !hand) continue;
  const s = i != null ? e.senses[i] : null;
  if (!hand && s.t.some((t) => BAD.has(t))) continue;
  if (!cands.has(e.w)) cands.set(e.w, []);
  cands.get(e.w).push({ e, i, s, hand });
}
for (const [w, list] of cands) {
  const chosen = list.find((c) => c.hand?.pick) || list[0];
  byWord.set(w, { ...chosen, rs: Math.max(...list.map((c) => c.e.s)), also: list.filter((c) => c !== chosen).map((c) => c.e.c) });
}

const FR_ORDER = ['GrandCelinien', 'WikiLucas00', 'Poslovitch', 'LoquaxFR', 'Lepticed7', 'Jérémy-Günther-Heinz Jähnick'];
const speakerOf = (f) => { const m = /LL-Q150 \(fra\)-(.+?)-[^-]+\.wav$/.exec(f); return m ? m[1] : null; };
const bestFr = (audio) => {
  const a = audio.filter((x) => x.mp3 && x.t.includes('France'));
  if (!a.length) return null;
  const rank = (x) => { const sp = speakerOf(x.f); const k = FR_ORDER.indexOf(sp); return k < 0 ? 99 : k; };
  return a.slice().sort((x, y) => rank(x) - rank(y))[0];
};
const bestQc = (audio) => {
  const a = audio.filter((x) => x.mp3 && x.t.some((t) => t === 'Canada' || t === 'Quebec'));
  return a[0] || null;
};
const ipaOf = (list, qc) => {
  const pick = list.filter((x) => (qc ? x.t.some((t) => t === 'Canada' || t === 'Quebec') : !x.t.some((t) => ['Canada', 'Quebec', 'Louisiana', 'Belgium', 'Switzerland', 'Africa'].includes(t))));
  const slash = pick.find((x) => x.ipa.startsWith('/')) || pick[0];
  return slash ? slash.ipa : null;
};

// ── the conjugation, in six slots ────────────────────────────────────────
// Person order: je tu il nous vous ils. Only a COMPLETE row of six is kept —
// a defective verb (falloir, pleuvoir) simply has no table to quiz on.
const PERSON = (t) => {
  const p = t.includes('first-person') ? 0 : t.includes('second-person') ? 1 : t.includes('third-person') ? 2 : -1;
  if (p < 0) return -1;
  return t.includes('plural') ? p + 3 : p;
};
const conjugation = (forms) => {
  const out = {};
  const slot = (key, test) => {
    const row = new Array(6).fill(null);
    for (const f of forms) { if (test(f.t)) { const p = PERSON(f.t); if (p >= 0 && !row[p]) row[p] = f.f; } }
    if (row.every(Boolean)) out[key] = row;
  };
  const has = (t, ...x) => x.every((y) => t.includes(y));
  slot('pr', (t) => has(t, 'present', 'indicative'));
  slot('im', (t) => has(t, 'imperfect', 'indicative'));
  slot('fu', (t) => has(t, 'future', 'indicative'));
  slot('co', (t) => has(t, 'conditional'));
  slot('su', (t) => has(t, 'present', 'subjunctive'));
  const pp = forms.find((f) => has(f.t, 'participle', 'past'));
  if (pp) out.pp = pp.f;
  const ger = forms.find((f) => has(f.t, 'participle', 'present'));
  if (ger) out.ger = ger.f;
  return Object.keys(out).length ? out : null;
};

// ── assemble ─────────────────────────────────────────────────────────────
const picked = [...byWord.values()].sort((a, b) => b.rs - a.rs).slice(0, WORDS);
const words = [];
for (const [n, p] of picked.entries()) {
  const { e, i, s, hand } = p;
  const longG = hand ? hand.g : s.g;
  const g = hand ? hand.g : shorten(s.g);
  if (!g) continue;
  const alt = e.senses
    .map((x, k) => ({ x, k }))
    .filter(({ x, k }) => k !== i && !x.t.some((t) => SKIP_TAG.has(t) || BAD.has(t)) && !CA(x.t))
    .slice(0, 6)
    .map(({ x }) => shorten(x.g))
    .filter((x) => x && x !== g && x.length <= 34 && !/^(used|in particular|see |to be able to communicate)/i.test(x))
    .filter((x, k, a) => a.indexOf(x) === k)
    .slice(0, 2);
  const qcSenses = e.senses.filter((x) => CA(x.t) && !x.t.some((t) => BAD.has(t) || t === 'form-of' || t === 'alt-of')).map((x) => shorten(x.g)).filter(Boolean).slice(0, 2);
  const lexG = e.lexGender;
  const wikG = e.wikGender;
  const gen = e.c === 'NOM' ? (lexG && wikG.length === 1 && wikG[0] === lexG ? lexG : null) : null;
  const wikOnly = e.c === 'NOM' && !gen && wikG.length === 1 ? wikG[0] : null;
  const fr = bestFr(e.audio), qc = bestQc(e.audio);
  const reg = s && s.t.some((t) => FAM.has(t)) ? 'fam' : s && s.t.some((t) => ['literary', 'formal'].includes(t)) ? 'lit' : null;
  const w = {
    w: e.disp || e.w, lem: e.disp ? e.w : undefined, k: KIND[e.c], r: n + 1, f: e.s,
    g, gl: longG === g ? undefined : longG,
    alt: alt.length ? alt : undefined,
    gen: gen || undefined, g2: wikOnly || undefined,
    ipa: ipaOf(e.ipa, false) || undefined, ipaQc: ipaOf(e.ipa, true) || undefined,
    reg: reg || undefined,
    qc: qcSenses.length ? qcSenses : undefined,
    aux: e.c === 'VER' ? (e.aux || undefined) : undefined,
    conj: e.c === 'VER' ? (conjugation(e.forms) || undefined) : undefined,
    fr: fr ? { f: fr.f, by: speakerOf(fr.f) || 'Wikimedia Commons', place: fr.t.filter((t) => t !== 'France')[0] || null, mp3: fr.mp3 } : undefined,
    qcAudio: qc ? { f: qc.f, by: speakerOf(qc.f) || 'Wikimedia Commons', place: qc.note || null, mp3: qc.mp3 } : undefined,
    also: p.also.length ? p.also.map((c) => KIND[c] || c.toLowerCase()) : undefined,
    from: hand ? hand.from : undefined,
    d: hand?.d,
  };
  words.push(w);
}
// Drop two entries with the same display gloss and kind at adjacent ranks? No —
// that is a question for the question builder, which keeps near-synonyms out of
// one another's options. Here the list is only what the sources support.
writeFileSync(join(ROOT, 'corpus', 'words.json'), JSON.stringify(words));
const kinds = words.reduce((m, w) => ({ ...m, [w.k]: (m[w.k] || 0) + 1 }), {});
console.log(`words: ${words.length.toLocaleString()}`, kinds);
console.log(`  with a gender both sources agree on: ${words.filter((w) => w.gen).length.toLocaleString()}`);
console.log(`  with a conjugation table: ${words.filter((w) => w.conj).length.toLocaleString()}; with France audio: ${words.filter((w) => w.fr).length.toLocaleString()}; with Québec audio: ${words.filter((w) => w.qcAudio).length.toLocaleString()}; with a Québec sense: ${words.filter((w) => w.qc).length}`);
