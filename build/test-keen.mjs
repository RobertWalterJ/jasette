// Can a willing learner actually learn for as long as they want?
//
//   node build/test-keen.mjs
//
// Robert, on Hok Gong, 20 Sept 2026: "I can't get it to serve me up 25 questions
// back to back if I try my hardest." He was right, and three separate rules were
// doing it at once — the day's allowance of new questions (which a 25-question
// sitting spends in a single round), the four-hour cool-down (which put every
// question he had just answered out of reach of the top-up), and a stage gate
// that opened too little. Together they produced "today's words are done" after
// twenty minutes.
//
// Pacing rules must govern how much work ARRIVES on its own. They must never
// shorten a sitting the learner has started, and there must always be a button.
// This plays a learner who keeps pressing it — eight rounds back to back, for a
// learner starting fresh and for one placed at stage four — and fails the build
// if any round comes up short.
//
// And, as there, it asks the app's own core.js what is in play and how long a
// sitting is, rather than reimplementing either: a test that reimplements the
// thing it is testing tests nothing.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
let mseed = 11;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);

const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
globalThis.window = { JASETTE_DECK: deck };
const S = await import('../app/js/schedule.js');
const D = await import('../app/js/deck.js');
const C = await import('../app/js/core.js');
await D.loadDeck(); D.indexDeck();

let seed = 5;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const fails = [];

function evening(label, floor) {
  store.clear();
  S.State.data = { v: 1, cards: {}, days: {}, settings: { sound: true, theme: 'fleurdelise', scheme: 'auto', voice: 'qc', lang: 'both', pace: 'steady', sitting: 'standard' }, placement: null };
  if (floor) { S.State.data.placement = { at: 0, floor, size: 3000, asked: 30, proportions: [] }; S.State.data.maxStage = floor; }
  let t = new Date(2026, 8, 20, 16, 30).getTime();
  S.__setClock(() => t);
  const size = C.sitting().size;
  const lengths = [];
  let fresh0 = 0;
  for (let r = 0; r < 8; r++) {
    const { ids, assumed } = C.inPlay();
    const due = S.State.dueIds(ids).length;
    const fresh = ids.filter((id) => !S.State.card(id)).length;
    const room = S.newLeftToday(C.pace());
    // What home does: a normal round while something is owed, otherwise the
    // "Continuer" button, which lifts the day's allowance; and practice when
    // nothing unseen remains.
    const owed = due || Math.min(room, fresh);
    const round = new S.Round(ids, {
      beyondDaily: !owed && fresh > 0, practice: !owed && fresh === 0, exclude: new Set(), pace: C.pace(),
      groupOf: D.D().groupOf, stageOf: (id) => D.D().byId.get(id)?.stage, size,
      spot: assumed.length && owed ? { ids: assumed, n: Math.max(2, Math.round(size * 0.2)) } : null,
    });
    lengths.push(round.queue.length);
    if (round.queue.length < size) fails.push(`${label}, round ${r + 1}: only ${round.queue.length} of ${size}, with ${ids.length} in reach`);
    let id;
    while ((id = round.next())) {
      const c = S.State.card(id);
      if (!c) fresh0++;
      S.State.answer(id, rand() < (c && c.st !== 'new' ? 0.9 : 0.75), { practice: round.practice || round.extra.has(id), known: round.spotSet.has(id) });
      t += 11e3;
    }
    S.State.snapshot(deck.items.map((x) => x.id));
    t += 4 * 60e3;                      // a short break, well inside the cool-down
  }
  console.log(`test-keen · ${label}: eight rounds back to back, ${lengths.reduce((a, b) => a + b, 0)} questions, shortest ${Math.min(...lengths)}, ${fresh0} of them new to the learner`);
}
evening('from the start', 0);
evening('placed at stage 4', 3);

if (fails.length) {
  console.error('\ntest-keen FAILED:');
  for (const f of fails.slice(0, 8)) console.error('  - ' + f);
  process.exit(1);
}
console.log('test-keen: the app keeps up with a learner who wants to keep going.');
