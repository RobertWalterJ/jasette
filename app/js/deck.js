// Jasette — the deck, and the small questions asked of it everywhere.
//
// The deck is a word list plus items that point into it (build/items.mjs). It is
// fetched beside the app, once, and kept by the service worker.

let deck = null;
export const D = () => deck;

export async function loadDeck() {
  if (window.JASETTE_DECK) { deck = window.JASETTE_DECK; return deck; }
  const url = window.JASETTE_DECK_URL || 'data/deck.json';
  const r = await fetch(url);
  if (!r.ok) throw new Error('The word list did not load.');
  deck = await r.json();
  return deck;
}

export const wordAt = (i) => deck.words[i];
export const wordOf = (it) => (it.i != null ? deck.words[it.i] : null);
export const examplesOf = (i) => deck.examples[i] || [];
export const itemById = (id) => deck.byId.get(id);

// The six things being learnt, so progress is reported per skill rather than as
// one number that hides which is lagging.
export const SKILL = {
  'word-listen': 'listening', 'sentence-listen': 'listening', 'sound-pair': 'listening', 'qc-listen': 'listening',
  'word-say': 'speaking', 'word-pick': 'speaking',
  'word-read': 'reading', 'note-pick': 'reading',
  'spell-pick': 'writing', 'homophone-pick': 'writing',
  'word-cloze': 'grammar', 'fill-multi': 'grammar', 'gender-pick': 'grammar', 'conj-pick': 'grammar', 'aux-pick': 'grammar', 'agree-pick': 'grammar',
  'pronoun-pick': 'grammar', 'grammar-build': 'grammar',
  'qc-mean': 'canada', 'qc-pick': 'canada', 'qc-oral': 'canada',
};
export const SKILLS = ['listening', 'speaking', 'reading', 'writing', 'grammar', 'canada'];

// Items whose answer is judged by the learner, not the app: a phone cannot mark
// "did you say this word" — so it asks, and says so.
export const SELF_RATED = new Set(['word-say']);

export function indexDeck() {
  deck.byId = new Map(deck.items.map((it) => [it.id, it]));
  deck.wordIndex = new Map(deck.words.map((w, i) => [w.w, i]));
  deck.grammarById = new Map(deck.grammar.map((g) => [g.id, g]));
  deck.noteById = new Map((deck.notes || []).map((n) => [n.id, n]));
  deck.notesForWord = new Map();
  for (const n of deck.notes || []) for (const i of n.words) { if (!deck.notesForWord.has(i)) deck.notesForWord.set(i, []); deck.notesForWord.get(i).push(n); }
  deck.canIndex = new Map((deck.canadian || []).map((c, i) => [c.qc, i]));
  // The word an item is about, used to keep two questions on one word out of
  // the same round.
  deck.groupOf = (id) => {
    const it = deck.byId.get(id);
    if (!it) return null;
    if (it.i != null) return 'w' + it.i;
    if (it.q != null) return 'q' + it.q;
    if (it.gid) return 'g' + it.gid + (it.sid ? '/' + it.sid : '');
    if (it.choices) return 's' + it.id;
    return 's' + it.id;
  };
  return deck;
}
export const allIds = () => deck.items.map((it) => it.id);

// ── the course, and where the learner has got to ─────────────────────────
// A stage is passed when enough of its own words can be answered and each of its
// grammar points has been met. Only NEW material is gated: reviews of anything
// already met keep coming whatever stage you are on.
//
// `floor`: the furthest the learner has ever got, or placed. A stage is judged
// from answers, and an answer can change — miss three stage-one words in a
// review and the stage would un-pass, and the whole sense of having got
// somewhere would fall back to where it was weeks ago. No app a learner has
// used revokes a finished unit, and none should: a gate that shuts again is a
// punishment for the ordinary act of forgetting. The live have/need count still
// moves both ways; what has been opened stays open.
export function stageState({ canAnswerWord, grammarMet, floor = 0 }) {
  const stages = deck.stages.map((st, n) => {
    const have = st.words.filter(canAnswerWord).length;
    const need = Math.max(1, Math.ceil(st.words.length * st.gate));
    const grammarHave = st.grammar.filter(grammarMet).length;
    return { ...st, n, have, need, grammarHave, grammarNeeded: st.grammar.length, passed: have >= need && grammarHave >= st.grammar.length };
  });
  const i = stages.findIndex((s) => !s.passed);
  const current = Math.max(i < 0 ? stages.length : i, floor);
  return { stages, current, done: current >= stages.length };
}

// Questions that need a French voice or a recording to be answerable at all.
const NEEDS_SOUND = new Set(['word-listen', 'sentence-listen', 'sound-pair', 'qc-listen', 'spell-pick']);
// Questions that ask the LEARNER to make a noise. On a bus, in a waiting room,
// beside someone sleeping, those are impossible — and being asked them anyway is
// what makes an app something you can only use at home.
export const SPEAKING_ALOUD = new Set(['word-say']);
const askable = (it, canSound, noSpeaking) => (canSound || !NEEDS_SOUND.has(it.k)) && !(noSpeaking && SPEAKING_ALOUD.has(it.k));

// How much material a learner has never seen must be reachable at any moment.
// The stage gate decides the ORDER new words arrive in, and was also deciding
// HOW MANY exist, which was never the intention (Hok Gong's loop: "the same
// questions keep coming back over and over"). So the horizon widens past the
// current stage until there is a real supply of unseen material.
const SUPPLY = 220;
// `floor` is where the learner placed: a question in a stage BELOW it that has not
// been asked is "assumed known" — kept out of the new material, and offered only
// as occasional spot checks (see Round, in schedule.js).
// A word is first asked ONE way — read it, know it. The other ways (hear it, say it, pick it,
// the gap, the spelling, the gender) open for that word once the first has graduated to
// review. Six independent questions per word, all scheduled at once, multiplied the review
// pile by six and throttled new words to a trickle (the simulation found it: ten a day).
// Spread over the weeks instead, the same material is a steadier load and a more varied one.
const GATED = new Set(['word-listen', 'word-pick', 'word-cloze', 'word-say', 'spell-pick', 'gender-pick']);
export function askableIds({ canSound = true, current = Infinity, floor = 0, met = () => false, wordMet = () => false, unlocked = () => true, noSpeaking = false } = {}) {
  const ok = (it) => askable(it, canSound, noSpeaking) && (met(it.id) || !(GATED.has(it.k) && it.i != null) || unlocked(it.i) || (it.stage != null && it.stage < floor));
  const tail = deck.stages.length;
  const opensAt = (it) => (met(it.id) ? 0 : it.stage != null ? it.stage : tail);
  let horizon = current;
  if (horizon < tail) {
    const unseenAt = new Array(tail + 1).fill(0);
    for (const it of deck.items) {
      if (!ok(it) || met(it.id)) continue;
      const o = opensAt(it);
      if (o <= tail && o >= floor) unseenAt[o]++;
    }
    let running = 0;
    for (let h0 = floor; h0 <= horizon; h0++) running += unseenAt[h0];
    while (horizon < tail && running < SUPPLY) { horizon++; running += unseenAt[horizon]; }
  }
  const ids = [], assumed = [];
  for (const it of deck.items) {
    if (!ok(it)) continue;
    if (met(it.id)) { ids.push(it.id); continue; }
    const st = it.stage != null ? it.stage : tail;
    if (st < floor) { assumed.push(it.id); continue; }
    if (st <= horizon) ids.push(it.id);
  }
  return { ids, assumed };
}
export const setAsideCount = (canSound) => deck.items.filter((it) => !askable(it, canSound, false)).length;
