// Jasette — what the learner can answer, and what the course lets through.
// Shared by the home screen, the round and the browsing screens.

import { State, cardState, isHolding, newLeftToday, dayKey, now, DAY } from './schedule.js';
import { D, stageState, askableIds, SKILL, SKILLS, drillIds } from './deck.js';
import { canPlayAnything } from './audio.js';
import { BANDS } from './placement.js';

// A round is short on purpose: 15 to 20 questions, a few minutes. Up to 40 new questions a day
// are READY (the pace below), but they arrive across as many rounds as the learner chooses to
// do; one round a day simply means a slower 15 to 20 a day, with nothing owed or forced.
export const SITTINGS = {
  short: { label: 'Courte', en: 'Short', note: 'Environ 12 questions', size: 12 },
  standard: { label: 'Normale', en: 'Standard', note: 'De 15 à 20 questions — le réglage par défaut', size: 18 },
  five: { label: 'Cinq minutes', en: 'Five minutes', note: 'Environ 25 questions', size: 25 },
  long: { label: 'Longue', en: 'Longer', note: 'Environ 40 questions', size: 40 },
};
// ("long" was the default in the first version; a learner who never chose it gets the standard length.)
export const sitting = () => {
  const s = State.data.settings;
  if (s.sitting === 'long' && !s.sittingChosen) return SITTINGS.standard;
  return SITTINGS[s.sitting] || SITTINGS.standard;
};

// These OVERRIDE the scheduler's own constants (Hok Gong's lesson: the app
// shipped 18 new a day for a week after the constant was retuned to 32, because
// a preset passed on every round won). They carry the numbers the app means.
export const PACES = {
  gentle: { label: 'Tranquille', en: 'Gentle', note: 'Environ 15 nouveautés par jour', newPerRound: 5, newPerDay: 15 },
  steady: { label: 'Régulier', en: 'Steady', note: 'Jusqu’à 40 nouveautés par jour, 15 à 20 si tu fais une seule série — le réglage par défaut', newPerRound: 9, newPerDay: 40 },
  keen: { label: 'Intense', en: 'Keen', note: 'Jusqu’à 80 par jour : beaucoup de révisions les jours suivants', newPerRound: 14, newPerDay: 80 },
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

// ── conjugation: its own ladder, its own daily allowance ─────────────────
// A rung opens when the one before it is about half met (never more than 120 questions: the big
// later rungs would otherwise hold the ladder for months), or because the learner skipped ahead
// ("I know these") — settings.conjOpen is how many rungs they have opened that way.
export const CONJ_PER_DAY = [6, 12, 24, 40];
export const conjPerDay = () => State.data.settings?.conjPerDay || 12;
export const conjPace = () => ({ newPerRound: Math.min(conjPerDay(), 12), newPerDay: conjPerDay() });
const NEED_CAP = 120;
export function conjState() {
  const d = D();
  const ladder = d.conjLadder || [];
  const rungs = ladder.map((r) => ({ ...r, n: 0, met: 0, can: 0, known: 0, open: false, need: 0 }));
  for (const it of d.items) {
    if (it.k !== 'conj-drill') continue;
    const r = rungs[it.rung];
    r.n++;
    const c = State.card(it.id);
    if (!c) continue;
    r.met++;
    if (c.st !== 'new' && c.ok) r.can++;
    if (['known', 'secure'].includes(cardState(c))) r.known++;
  }
  const skipped = State.data.settings?.conjOpen || 1;
  rungs.forEach((r, k) => {
    r.need = Math.min(Math.ceil(r.n * 0.5), NEED_CAP);
    // A step opens when the one before is about half met AND going reasonably well (six in ten of
    // what has been met answered right the last time): each block is built on the one under it.
    const prev = rungs[k - 1];
    r.open = k === 0 || k < skipped || (prev.open && prev.met >= prev.need && prev.can >= Math.ceil(prev.met * 0.6));
    // where the learner stands on this step
    r.level = r.met === 0 ? 'new' : r.met >= r.need && r.known >= r.met * 0.5 ? 'mastered' : r.met >= r.need && r.can >= r.met * 0.75 ? 'solid' : 'learning';
  });
  const open = rungs.filter((r) => r.open).length;
  return { rungs, open, current: Math.max(0, open - 1), total: rungs.length };
}
// A sitting is as long as what is owed (reviews due + today's new allowance), never shorter than
// ten: the ordinary round tops itself up with more new material when reviews run out, which would
// make "12 new a day" untrue. Choosing to keep going (or to just practise) lifts it.
export function conjSize(opts = {}) {
  if (opts.beyondDaily || opts.practice) return sitting().size;
  const due = State.dueIds(conjIds().filter(isMet)).length;
  const room = newLeftToday(conjPace(), 'newC');
  return Math.max(10, Math.min(sitting().size, due + room));
}
// How conjugation is going over time: this week's answers against last week's.
export function conjTrend() {
  const week = (from) => { let n = 0, right = 0; for (let k = from; k < from + 7; k++) { const d = State.data.days[dayKey(now() - k * DAY)]; if (d?.cn) { n += d.cn; right += d.cr || 0; } } return { n, right, pct: n ? Math.round((right / n) * 100) : null }; };
  return { thisWeek: week(0), lastWeek: week(7) };
}
export function conjIds() {
  const cs = conjState();
  return drillIds({ rungOpen: (r) => cs.rungs[r]?.open, met: isMet });
}
// "I know these": opens the next rung without waiting for the half-way mark.
export function skipConjAhead() {
  const cs = conjState();
  if (cs.open >= cs.total) return false;
  State.data.settings.conjOpen = cs.open + 1;
  State.save();
  return true;
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
    if (it.k === 'conj-drill' && !c) continue;                 // reported on the Conjugaison screen, not as thousands of unopened grammar questions
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
