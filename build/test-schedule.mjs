// Does the learning loop hold up over months, on a deck of 41,000 questions?
//
//   node build/test-schedule.mjs
//
// Plays the real scheduler against the real deck with a seeded learner, and
// fails the build if the loop misbehaves. The rules checked are the ones that
// actually broke in Hok Gong, Palimpsest and Landfall:
//
//   - no question twice in one session (repeats made the pack feel small);
//   - no round longer than the sitting the learner chose, and few shorter — a
//     sitting cut to two questions is what sent Robert back with "the lessons
//     are way too short";
//   - new material keeps arriving, every day, while any remains unseen;
//   - reviews are not buried: the due pile must not grow without limit;
//   - every skill gets started, not just the easy one.
//
// And two things Jasette adds, because its learner already has French:
//
//   - a learner who placed at stage four gets SPOT CHECKS from the stages
//     behind them — enough to notice a gap, few enough not to be a chore;
//   - a spot check answered right graduates at once (a two-week review), one
//     answered wrong becomes ordinary new material.
//
// THE LESSON FROM HOK GONG: an audit must simulate the regime the app ships. So
// this does not build its own Round options or its own reach rule: it asks the
// app's own core.js for what is in play, what the pace is and how long a sitting
// is, exactly as the home screen does.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
let mseed = 7;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);

const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
globalThis.window = { JASETTE_DECK: deck };
const S = await import('../app/js/schedule.js');
const D = await import('../app/js/deck.js');
const C = await import('../app/js/core.js');
await D.loadDeck(); D.indexDeck();

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const fails = [];

function simulate({ label, floor, days, conj = false }) {
  store.clear();
  S.State.data = { v: 1, cards: {}, days: {}, settings: { sound: true, theme: 'fleurdelise', scheme: 'auto', voice: 'qc', lang: 'both', pace: 'steady', sitting: 'long' }, placement: null };
  if (floor) { S.State.data.placement = { at: 0, floor, size: 3000, asked: 30, proportions: [1, 1, 1, 1, 0.9, 0.8, 0.6, 0.35, 0.2, 0.1, 0, 0] }; S.State.data.maxStage = floor; }
  let t = new Date(2026, 8, 1, 8, 30).getTime();
  S.__setClock(() => t);
  const skills = new Set();
  const newByDay = [];
  let worstBacklog = 0, rounds = 0, empty = 0, short = 0, spotAsked = 0, spotRight = 0, spotGraduated = 0, dry = 0, longestDry = 0, totalNew = 0;
  let conjRounds = 0, conjNew = 0, conjQs = 0, worstConjDue = 0;
  const failsHere = [];
  for (let day = 0; day < days; day++) {
    const sittings = day % 7 === 3 ? 6 : day % 3 === 0 ? 2 : 4;   // he plays in bursts, several times a day
    const asked = new Set();
    let newToday = 0;
    for (let s = 0; s < sittings; s++) {
      t += 90 * 60e3;
      const { ids, assumed } = C.inPlay();
      const size = C.sitting().size;
      const round = new S.Round(ids, { exclude: asked, pace: C.pace(), groupOf: D.D().groupOf, stageOf: (id) => D.D().byId.get(id)?.stage, size, spot: assumed.length ? { ids: assumed, n: Math.max(2, Math.round(size * 0.2)) } : null });
      if (round.empty) { empty++; continue; }
      rounds++;
      if (round.queue.length > size) failsHere.push(`day ${day}: a round of ${round.queue.length}, longer than the sitting of ${size}`);
      if (round.queue.length < size && day > 3) short++;
      const seenHere = new Set();
      let id;
      while ((id = round.next())) {
        if (seenHere.has(id)) failsHere.push(`day ${day}: ${id} asked twice in one round`);
        if (asked.has(id)) failsHere.push(`day ${day}: ${id} asked twice in one session`);
        seenHere.add(id); asked.add(id);
        const it = D.D().byId.get(id);
        const sk = D.SKILL[it.k];
        if (sk) skills.add(sk);
        const card = S.State.card(id);
        // a conjugation drill nobody has opened must never turn up in an ordinary round
        if (it.k === 'conj-drill' && !card) failsHere.push(`day ${day}: the unstarted drill ${id} was offered in an ordinary round`);
        const isSpot = round.spotSet.has(id);
        if (!card) { if (!isSpot) { newToday++; totalNew++; } }
        // A placed learner knows what is behind them (92%); new things go at 55-60%; reviews at 88%.
        const lk = C.likelyKnown(it);
        const right = rand() < (isSpot ? 0.92 : card && card.st !== 'new' ? 0.88 : lk ? 0.85 : 0.5);
        if (isSpot) { spotAsked++; if (right) spotRight++; }
        S.State.answer(id, right, { practice: round.extra.has(id), known: isSpot || lk });
        if (isSpot && right && S.State.card(id)?.fast) spotGraduated++;
        t += 12e3;
      }
      S.State.snapshot(deck.items.map((x) => x.id));
    }
    // The conjugation sitting: one a day, with its own ladder, allowance and sitting length (core.js).
    if (conj) {
      t += 90 * 60e3;
      const cids = C.conjIds();
      const csize = C.conjSize();
      const cround = new S.Round(cids, { exclude: asked, pace: C.conjPace(), newKey: 'newC', capNew: true, groupOf: D.D().groupOf, stageOf: (id) => D.D().byId.get(id)?.rung, size: csize });
      if (!cround.empty) {
        conjRounds++;
        if (cround.queue.length > csize) failsHere.push(`day ${day}: a conjugation sitting of ${cround.queue.length}, longer than ${csize}`);
        const seenC = new Set();
        let cid;
        while ((cid = cround.next())) {
          if (seenC.has(cid)) failsHere.push(`day ${day}: ${cid} asked twice in one conjugation sitting`);
          seenC.add(cid); asked.add(cid);
          const card = S.State.card(cid);
          if (!card) conjNew++;
          conjQs++;
          S.State.answer(cid, rand() < (card && card.st !== 'new' ? 0.88 : 0.7), { practice: cround.extra.has(cid) });
          t += 9e3;
        }
      }
      worstConjDue = Math.max(worstConjDue, S.State.dueIds(C.conjIds().filter((id) => S.State.card(id))).length);
    }
    newByDay.push(newToday);
    const { ids: pool } = C.inPlay();
    const unseen = pool.filter((id) => !S.State.card(id)).length;
    if (newToday === 0 && unseen > 0) { dry++; longestDry = Math.max(longestDry, dry); } else dry = 0;
    worstBacklog = Math.max(worstBacklog, S.State.dueIds(pool).length);
    t = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1, 8, 30).getTime();
  }
  const all = deck.items.map((x) => x.id);
  const met = all.filter((id) => S.State.card(id)).length;
  const known = all.filter((id) => ['known', 'secure'].includes(S.cardState(S.State.card(id)))).length;
  const stage = C.course().current;
  if (longestDry > 1) failsHere.push(`no new material on ${longestDry} days running, with plenty unseen`);
  // 30-plus new questions a day is what Robert asked for, and what the first weeks deliver; the
  // review pile that follows is the price, so the throttle then holds the average lower rather
  // than let the pile grow without limit.
  const first = newByDay.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
  if (floor && first < 30) failsHere.push(`only ${first.toFixed(1)} new questions a day in the first fortnight (the aim is 30 or more)`);
  if (totalNew / days < (conj ? 13 : floor ? 18 : 10)) failsHere.push(`only ${(totalNew / days).toFixed(1)} new questions a day on average`);
  if (worstBacklog > 1300) failsHere.push(`the due pile reached ${worstBacklog} — reviews are being buried`);
  if (short > rounds * 0.25) failsHere.push(`${short} of ${rounds} rounds came up short of the sitting length`);
  if (skills.size < 5) failsHere.push(`only ${skills.size} of the six skills were ever started: ${[...skills].join(', ')}`);
  if (known < 100) failsHere.push(`only ${known} questions reached "known" in ${days} days`);
  if (floor) {
    if (spotAsked < days * 0.4) failsHere.push(`only ${spotAsked} spot checks in ${days} days from the stages behind the learner`);
    if (spotAsked > 0 && spotGraduated < spotRight * 0.95) failsHere.push(`${spotRight - spotGraduated} spot checks answered right did not graduate`);
  }
  console.log(`test-schedule · ${label}: ${days} days, ${rounds} rounds, ${met.toLocaleString()} questions met, ${known.toLocaleString()} known, now at stage ${stage + 1}`);
  console.log(`  new per day: ${(totalNew / days).toFixed(1)} (${(newByDay.slice(0, 14).reduce((a, b) => a + b, 0) / 14).toFixed(1)} in the first fortnight); worst review backlog ${worstBacklog}; rounds short ${short}/${rounds}; skills ${[...skills].sort().join(', ')}`);
  if (floor) console.log(`  spot checks: ${spotAsked} asked, ${spotRight} right, ${spotGraduated} graduated at once`);
  if (conj) {
    const cs = C.conjState();
    console.log(`  conjugation: ${conjRounds} sittings, ${conjQs.toLocaleString()} answers, ${conjNew.toLocaleString()} new (${(conjNew / days).toFixed(1)} a day), ladder at step ${cs.open} of ${cs.total}, worst drill backlog ${worstConjDue}`);
    if (conjNew / days < 8) failsHere.push(`only ${(conjNew / days).toFixed(1)} new conjugation questions a day at a pace of ${C.conjPerDay()}`);
    if (conjNew / days > C.conjPerDay() + 0.5) failsHere.push(`${(conjNew / days).toFixed(1)} new conjugation questions a day is over the allowance of ${C.conjPerDay()}`);
    if (cs.open < 6) failsHere.push(`the conjugation ladder reached only step ${cs.open} in ${days} days`);
    if (worstConjDue > 700) failsHere.push(`the conjugation review pile reached ${worstConjDue}`);
  }
  for (const f of failsHere) fails.push(`${label}: ${f}`);
}

if(!process.env.CONJ_ONLY) simulate({ label: 'from the start', floor: 0, days: 180 });
if(!process.env.CONJ_ONLY) simulate({ label: 'placed at stage 4', floor: 3, days: 180 });
simulate({ label: 'placed at stage 4, with a daily conjugation sitting', floor: 3, days: 180, conj: true });

if (fails.length) {
  console.error('\ntest-schedule FAILED:');
  for (const f of fails.slice(0, 10)) console.error('  - ' + f);
  if (fails.length > 10) console.error(`  …and ${fails.length - 10} more`);
  process.exit(1);
}
console.log('test-schedule: the loop holds.');
