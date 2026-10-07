// Jasette — "Trouver mon niveau": where does this learner already stand?
//
// Hok Gong teaches from nothing. This app is for someone who already has
// French, and the worst thing it could do is spend a month asking what chat
// means. So the first thing it offers is a short adaptive check: words from
// twelve bands of the frequency list, in meaning-pick form, with an honest
// "je ne sais pas" so a guess is not forced.
//
// The staircase: start in the middle; two right in a band moves up, two wrong
// moves down, a split asks a third. It stops after 30 questions or when it has
// seen a band answered well and the next one answered badly.
//
// What it produces:
//   - a vocabulary estimate, band by band, corrected for guessing (a four-way
//     choice is right a quarter of the time by luck; "I don't know" removes
//     most guessing, so the correction is a modest 12%);
//   - a floor: the first stage not yet comfortably known. Stages below it are
//     "assumed known" — not asked as new material, only spot-checked;
//   - real cards: every answer is a first exposure, so a right answer has
//     already graduated that word (State.answer with known:true).
//
// It is an estimate. It says so.

import { D } from './deck.js';

export const BANDS = [[1, 150], [151, 350], [351, 650], [651, 1000], [1001, 1500], [1501, 2200], [2201, 3000], [3001, 3900], [4001, 4900], [4901, 5800], [5801, 6500], [6501, 7000]];
const GUESS = 0.12;

export class Placement {
  constructor() {
    this.band = 4;                         // start around the 1,000–1,500th word
    this.log = BANDS.map(() => ({ asked: 0, right: 0 }));
    this.history = [];                     // band indices in order
    this.asked = new Set();
    this.total = 0;
    this.finished = false;
    this.lastInBand = [];                  // results in the current visit
    this.maxQuestions = 30;
  }
  pickItem() {
    const d = D();
    const [lo, hi] = BANDS[this.band];
    // Reading questions: the quickest way to tell whether a word is already yours.
    const pool = d.items.filter((it) => it.k === 'word-read' && !this.asked.has(it.id) && d.words[it.i].r >= lo && d.words[it.i].r <= hi && ['n', 'v', 'adj', 'adv'].includes(d.words[it.i].k));
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  record(it, right) {
    this.asked.add(it.id);
    const l = this.log[this.band];
    l.asked++; if (right) l.right++;
    this.total++;
    this.history.push(this.band);
    this.lastInBand.push(right);
    const last = this.lastInBand.slice(-2);
    if (last.length === 2) {
      const r = last.filter(Boolean).length;
      if (r === 2) this.move(+1); else if (r === 0) this.move(-1);
      else if (this.lastInBand.length >= 3) { this.move(this.lastInBand.slice(-3).filter(Boolean).length >= 2 ? +1 : -1); }
    }
    if (this.total >= this.maxQuestions || this.settled()) this.finished = true;
  }
  move(dir) {
    const nb = Math.max(0, Math.min(BANDS.length - 1, this.band + dir));
    if (nb !== this.band) { this.band = nb; this.lastInBand = []; }
    else if (this.log[this.band].asked >= 6) this.finished = true;      // pinned at the top or bottom
  }
  // Settled: a band answered at least two thirds right, with the next one up
  // answered at most a third right, both asked at least three times.
  settled() {
    for (let b = 0; b + 1 < BANDS.length; b++) {
      const a = this.log[b], c = this.log[b + 1];
      if (a.asked >= 3 && c.asked >= 3 && a.right / a.asked >= 2 / 3 && c.right / c.asked <= 1 / 3) return this.total >= 16;
    }
    return false;
  }
  // The proportion known per band: observed where asked, else interpolated from
  // the nearest asked bands so the estimate does not have holes.
  proportions() {
    const raw = this.log.map((l) => (l.asked ? Math.max(0, Math.min(1, (l.right / l.asked - GUESS) / (1 - GUESS))) : null));
    const out = raw.slice();
    for (let b = 0; b < raw.length; b++) {
      if (raw[b] != null) continue;
      let lo = b - 1; while (lo >= 0 && raw[lo] == null) lo--;
      let hi = b + 1; while (hi < raw.length && raw[hi] == null) hi++;
      if (lo >= 0 && hi < raw.length) out[b] = raw[lo] + (raw[hi] - raw[lo]) * ((b - lo) / (hi - lo));
      else if (lo >= 0) out[b] = Math.max(0, raw[lo] - 0.15 * (b - lo));       // above the top: tapering off
      else out[b] = Math.min(1, raw[hi] + 0.1 * (hi - b));                      // below the bottom: known
    }
    // Knowledge falls with rank: make the estimate monotone non-increasing.
    for (let b = 1; b < out.length; b++) out[b] = Math.min(out[b], out[b - 1]);
    return out;
  }
  result() {
    const p = this.proportions();
    const size = Math.round(BANDS.reduce((n, [lo, hi], b) => n + (hi - lo + 1) * p[b], 0));
    // The floor: how many whole stages are comfortably known (≥ 80% of their words).
    const d = D();
    let floor = 0;
    for (const st of d.stages) {
      const ranks = st.words.map((i) => d.words[i].r);
      const lo = Math.min(...ranks), hi = Math.max(...ranks);
      let have = 0, n = 0;
      BANDS.forEach(([a, b], k) => { const o = Math.max(0, Math.min(hi, b) - Math.max(lo, a) + 1); have += o * p[k]; n += o; });
      if (n && have / n >= 0.8) floor++; else break;
    }
    return { size, floor, proportions: p.map((x) => +x.toFixed(2)), asked: this.total, log: this.log };
  }
}
