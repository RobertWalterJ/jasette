// Jasette — what the learner can answer, and what the course lets through.
// Shared by the home screen, the round and the browsing screens.

import { State, cardState, isHolding } from './schedule.js';
import { D, stageState, askableIds, SKILL, SKILLS } from './deck.js';
import { canPlayAnything } from './audio.js';
import { BANDS } from './placement.js';

export const SITTINGS = {
  short: { label: 'Courte', en: 'Short', note: 'Environ 12 questions', size: 12 },
  five: { label: 'Cinq minutes', en: 'Five minutes', note: 'Environ 25 questions', size: 25 },
  long: { label: 'Longue', en: 'Longer', note: 'Environ 40 questions — le réglage par défaut', size: 40 },
};
export const sitting = () => SITTINGS[State.data.settings.sitting] || SITTINGS.long;

// These OVERRIDE the scheduler's own constants (Hok Gong's lesson: the app
// shipped 18 new a day for a week after the constant was retuned to 32, because
// a preset passed on every round won). They carry the numbers the app means.
export const PACES = {
  gentle: { label: 'Tranquille', en: 'Gentle', note: 'Environ 15 nouveautés par jour', newPerRound: 5, newPerDay: 15 },
  steady: { label: 'Régulier', en: 'Steady', note: '30 à 40 nouveautés par jour — le réglage par défaut', newPerRound: 13, newPerDay: 40 },
  keen: { label: 'Intense', en: 'Keen', note: 'Jusqu’à 80 par jour : beaucoup de révisions les jours suivants', newPerRound: 22, newPerDay: 80 },
};
export const pace = () => PACES[State.data.settings.pace] || PACES.steady;
export const noSpeaking = () => !!State.data.settings?.quiet;

// The furthest the learner has got or placed. A placement sets `maxStage` once;
// passing stages after it raises it. It never falls (see stageState).
export const floorStage = () => Math.max(State.data.maxStage || 0, State.data.placement?.floor || 0);

export function course() {
  const d = D();
  const wordRight = new Set(), grammarRight = new Set();
  for (const it of d.items) {
    const c = State.card(it.id);
    if (!c || c.st === 'new' || !c.ok) continue;
    if (it.i != null) wordRight.add(it.i);
    if (it.gid != null) grammarRight.add(it.gid);
  }
  const st = stageState({ canAnswerWord: (i) => wordRight.has(i), grammarMet: (g) => grammarRight.has(g), floor: floorStage() });
  // Stages below the floor are behind the learner: said, or shown, to be known.
  // They are not asked as new material; spot checks keep them honest.
  for (const s of st.stages) if (s.n < floorStage()) { s.passed = true; s.placed = true; }
  if (st.current > (State.data.maxStage || 0)) { State.data.maxStage = st.current; State.save(); }
  return st;
}

export const isMet = (id) => !!State.card(id);
// The other ways of asking about a word open once reading it has graduated to review.
export const unlocked = (i) => { const w = D().words[i]; const c = State.card('wr/' + w.w); return !D().byId.has('wr/' + w.w) || (!!c && c.st === 'review'); };
// A word counts as met once any question about it has been asked.
export const wordMet = (i) => ['wr/', 'wl/', 'ws/', 'wp/'].some((p) => State.card(p + D().words[i]?.w));

// What the app may ask right now: what this phone can play, and what the
// course has opened — and, separately, what the learner has said they know.
export function inPlay() {
  const c = course();
  return askableIds({ canSound: canPlayAnything(), current: c.current, floor: floorStage(), met: isMet, wordMet, unlocked, noSpeaking: noSpeaking() });
}

// How each word stands, from the best of its own questions.
export function wordStates() {
  const d = D();
  const rank = { unseen: 0, met: 1, holding: 2, known: 3, secure: 4 };
  const out = new Array(d.words.length).fill('unseen');
  for (const it of d.items) {
    if (it.i == null) continue;
    const c = State.card(it.id);
    if (!c) continue;
    const s = isHolding(c) ? 'holding' : cardState(c);
    if (rank[s] > rank[out[it.i]]) out[it.i] = s;
  }
  return out;
}

// Per skill: how much of what has been opened can be answered right now.
export function skillStats() {
  const d = D();
  const stats = Object.fromEntries(SKILLS.map((s) => [s, { total: 0, met: 0, can: 0, known: 0 }]));
  const cur = course().current;
  for (const it of d.items) {
    const sk = SKILL[it.k];
    if (!sk) continue;
    const c = State.card(it.id);
    const reach = it.stage == null ? cur >= d.stages.length : it.stage <= cur;
    if (reach || c) stats[sk].total++;
    if (c) {
      stats[sk].met++;
      if (c.st !== 'new' && c.ok) stats[sk].can++;
      if (['known', 'secure'].includes(cardState(c))) stats[sk].known++;
    }
  }
  return stats;
}

// A word the level check says the learner probably knows, even though it sits above
// the stage they placed at. A first RIGHT answer to its reading question is almost
// certainly a word they had, not a lucky guess, so it graduates straight to a
// two-week review instead of being asked on three separate days to prove it. That is
// what lets 30-plus new questions a day be a sustainable load for someone who already
// has French: the proven words cost one answer, and the review pile only grows for
// the words they actually did not have. A wrong answer goes the ordinary way.
export function likelyKnown(it) {
  const pl = State.data.placement;
  if (!pl?.proportions || it.k !== 'word-read' || it.i == null) return false;
  const r = D().words[it.i].r;
  const b = BANDS.findIndex(([lo, hi]) => r >= lo && r <= hi);
  return b >= 0 && (pl.proportions[b] ?? 0) >= 0.6;
}
