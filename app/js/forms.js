// Jasette — which form of a verb is this? (pure: no DOM, so it can be tested in Node.)
//
// A new verb is taught with an example sentence, and a sentence like "Il est apparu de nulle
// part" hides a tense: est apparu is the passé composé of apparaître. This finds the forms of ONE
// verb (the word being taught) in a sentence and says what each is, using that verb's own
// conjugation table, so it never guesses at a verb it was not asked about. A form that fits more
// than one reading (parle: present je / il / elle, or subjunctive) is shown with all of them,
// narrowed by the pronoun right before it when there is one.
//
//   readForms({ verb, conj, aux }, sentence, tenseNames) → [{ surface, says }]
//   tenseNames: { pr: { fr, en }, … } from the deck.

const SUBJ = { je: 0, "j'": 0, tu: 1, il: 2, elle: 2, on: 2, nous: 3, vous: 4, ils: 5, elles: 5 };
const PERSON = ['je', 'tu', 'il / elle / on', 'nous', 'vous', 'ils / elles'];
const SIMPLE = ['pr', 'im', 'fu', 'co', 'su'];
const AVOIR_PR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
const ETRE_PR = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'];
const norm = (s) => String(s).toLowerCase().replace(/’/g, "'").replace(/œ/g, 'oe');

// Words with their original spelling, split the way French is written: j'ai → j' + ai.
export function tokenize(text) {
  const out = [];
  for (const m of String(text).matchAll(/[\p{L}'’-]+/gu)) {
    for (const part of m[0].split(/(?<=['’])/)) if (part) out.push({ surface: part, key: norm(part) });
  }
  return out;
}

const agreements = (pp) => [pp, pp + 'e', /[sx]$/.test(pp) ? pp : pp + 's', pp + 'es'];

export function readForms({ verb, conj, aux }, sentence, tenseNames) {
  if (!conj) return [];
  const toks = tokenize(sentence);
  const found = [];
  const name = (t) => tenseNames?.[t]?.en || t;
  for (let k = 0; k < toks.length; k++) {
    const { surface, key } = toks[k];
    const prev = toks[k - 1]?.key;
    const prevSlot = prev in SUBJ ? SUBJ[prev] : null;
    // simple tenses
    const hits = [];
    for (const t of SIMPLE) {
      const slots = (conj[t] || []).map((f, s) => (norm(f) === key ? s : -1)).filter((s) => s >= 0);
      if (slots.length) hits.push({ t, slots });
    }
    if (hits.length) {
      // the subjunctive follows "que" (que tu parles): without one, it is not the likely reading
      const que = (x) => x === 'que' || x === "qu'";
      const afterQue = que(toks[k - 1]?.key) || que(toks[k - 2]?.key);
      const likely = !afterQue && hits.some((h) => h.t !== 'su') ? hits.filter((h) => h.t !== 'su') : hits;
      // a pronoun just before settles the person; otherwise list what the form could be
      const narrowed = prevSlot == null ? likely : likely.map((h) => ({ ...h, slots: h.slots.filter((s) => s === prevSlot) })).filter((h) => h.slots.length);
      const use = narrowed.length ? narrowed : likely;
      found.push({ surface, says: use.map((h) => `${name(h.t)}, ${h.slots.map((s) => PERSON[s]).join(' or ')}`).join(' — or — ') });
      continue;
    }
    // the participle: with a helper before it, it is the passé composé
    if (conj.pp && agreements(norm(conj.pp)).includes(key)) {
      const helper = prev && (AVOIR_PR.includes(prev) || ETRE_PR.includes(prev));
      const says = helper
        ? `${name('pc')}: the helper “${toks[k - 1].surface}” + the past participle of ${verb}`
        : `past participle of ${verb} (used with avoir or être to make the past tense, or as an adjective)`;
      found.push({ surface: helper ? `${toks[k - 1].surface} ${surface}` : surface, says });
      continue;
    }
    if (conj.ger && key === norm(conj.ger)) { found.push({ surface, says: `gerund of ${verb} (“while doing”, usually after en)` }); continue; }
    if (key === norm(verb)) found.push({ surface, says: `the infinitive: the verb’s name form (after another verb, or after a preposition)` });
  }
  return found;
}
