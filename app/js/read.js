// Jasette — reading aloud.
//
// Robert is dyslexic. Hearing the question is not a nicety, it is how the question is
// understood at all, so there are three layers, from least to most:
//
//   1. a speaker beside every answer choice (tap it, hear that choice);
//   2. a "read this question" button on every card: the prompt, the English tip, the word or
//      sentence being asked about, its translation, then the choices — in that order, French
//      in the French voice and English in the English one;
//   3. an AUTO-READ mode that does (2) by itself the moment a question appears, and, if wanted,
//      reads the verdict and the explanation after an answer.
//
// All three use the phone's own voices (speech.js). A human recording is better and the app
// uses one wherever it has one — for the French word itself and for sentences — but a quiz
// question is made of interface text that no one has recorded, so the phone's voice reads it.
//
// Nothing here ever moves a question on or answers it. Reading is cancelled the instant the
// learner touches anything, and it never starts a countdown.

import { h, ICON } from './ui.js';
import { State } from './schedule.js';
import { say, sayFr, stop as stopSpeech, unlock, available, frAvailable } from './speech.js';
import { stopAudio } from './audio.js';
import { getMode } from './strings.js';

const S = () => State.data.settings;
export const readMode = () => S().autoRead || 'off';               // 'off' | 'q' | 'qc'
export const rate = () => S().rate || 0.95;
const accent = () => (S().voice === 'fr' ? 'fr' : 'qc');

// ── a queue of things to say, one after another ──────────────────────────
let token = 0;
let afterAudio = null;                         // what to read once an auto-played recording ends
let gate = Promise.resolve();                  // an auto-played recording waits for this
export const readyToPlay = () => gate;
export const onAutoplayEnd = (fn) => { afterAudio = fn; };
export const takeAutoplayEnd = () => { const f = afterAudio; afterAudio = null; return f; };

export function cancelReading() { token++; stopSpeech(); }

// items: [{ text, lang: 'fr' | 'en', pause? }]. Resolves when the last has been said, or at once
// if it is cancelled or the phone has no voice for it.
export function speakQueue(items) {
  const my = ++token;
  stopSpeech(); stopAudio();
  return new Promise((done) => {
    let i = 0;
    const next = () => {
      if (my !== token) { done(false); return; }
      if (i >= items.length) { done(true); return; }
      const it = items[i++];
      const text = String(it.text || '').replace(/\s+/g, ' ').trim();
      if (!text) { next(); return; }
      const then = () => setTimeout(next, it.pause ?? 220);
      if (it.lang === 'fr') {
        if (!frAvailable()) { then(); return; }
        if (!sayFr(text, { accent: accent(), rate: rate(), onend: () => { if (my === token) then(); else done(false); } })) then();
      } else {
        if (!available()) { then(); return; }
        if (!say(text, { rate: rate(), onend: () => { if (my === token) then(); else done(false); } })) then();
      }
    };
    next();
  });
}

// ── what a question says, in order ───────────────────────────────────────
const txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
// the main line of an interface phrase, leaving out its small English underneath
const mainOf = (lab) => { if (!lab) return ''; const c = lab.cloneNode(true); c.querySelectorAll('small').forEach((x) => x.remove()); return txt(c); };

// The things on a question card worth reading, in reading order.
export function extract(card, { choices = true } = {}) {
  const out = [];
  const uiLang = getMode() === 'en' ? 'en' : 'fr';
  const prompt = card.querySelector('.prompt .lab') || card.querySelector('.prompt');
  if (prompt) out.push({ text: mainOf(prompt), lang: card.querySelector('.prompt .lab') ? uiLang : 'en', pause: 350 });
  for (const tip of card.querySelectorAll(':scope > .tip')) out.push({ text: txt(tip), lang: 'en', pause: 300 });
  for (const cue of card.querySelectorAll(':scope > .cue')) out.push({ text: txt(cue), lang: 'en' });
  for (const w of card.querySelectorAll(':scope > .bigword')) out.push({ text: txt(w), lang: 'fr', pause: 350 });
  for (const g of card.querySelectorAll(':scope > .gloss')) out.push({ text: txt(g), lang: 'en' });
  const fill = card.querySelector('.sentence-fill');
  if (fill) {
    const c = fill.cloneNode(true);
    c.querySelectorAll('.slot').forEach((s) => s.replaceWith(' … '));
    out.push({ text: txt(c), lang: 'fr', pause: 350 });
  }
  for (const t of card.querySelectorAll('.translation')) out.push({ text: txt(t), lang: 'en', pause: 300 });
  const built = card.querySelector('.built');
  if (choices) {
    for (const c of card.querySelectorAll('.choices .choice')) {
      const copy = c.cloneNode(true);
      copy.querySelectorAll('.mark, small').forEach((x) => x.remove());
      out.push({ text: txt(copy), lang: /fr-c|big-c/.test(c.className) ? 'fr' : 'en', pause: 450 });
    }
    const tiles = [...card.querySelectorAll('.bank .tile:not(.used)')].map((x) => txt(x));
    if (tiles.length && !built) out.push({ text: tiles.join(', '), lang: 'fr' });
    else if (tiles.length) out.push({ text: tiles.join(', '), lang: 'fr' });
  }
  return out;
}

// Read the whole card now (the "read this question" button).
export function readCard(card, opts = {}) { unlock(); return speakQueue(extract(card, opts)); }

// Auto-read, as a question appears. For a question whose own recording plays by itself, the
// instructions are read first and the recording waits for them; the choices are read after it.
export function autoRead(card, { listening = false } = {}) {
  const mode = readMode();
  if (mode === 'off') { gate = Promise.resolve(); return; }
  const withChoices = mode === 'qc';
  if (listening) {
    const head = extract(card, { choices: false });
    gate = speakQueue(head).then(() => undefined);
    if (withChoices) onAutoplayEnd(() => speakQueue(extract(card, { choices: true }).filter((x) => !head.some((y) => y.text === x.text))));
  } else {
    gate = Promise.resolve();
    setTimeout(() => speakQueue(extract(card, { choices: withChoices })), 350);
  }
}

// After an answer: the verdict, the right answer, the sentence and its translation.
export function readFeedback(after) {
  if (!S().readFeedback || !after) return;
  const out = [];
  const v = after.querySelector('.verdict .lab');
  if (v) out.push({ text: mainOf(v), lang: getMode() === 'en' ? 'en' : 'fr', pause: 300 });
  const ans = after.querySelector('.vans');
  if (ans) out.push({ text: txt(ans), lang: 'fr', pause: 350 });
  const tip = after.querySelector('.tip.soft');
  if (tip) out.push({ text: txt(tip), lang: 'en' });
  for (const s of after.querySelectorAll('.sentence .fr-s')) out.push({ text: txt(s), lang: 'fr', pause: 300 });
  for (const e of after.querySelectorAll('.sentence .en-s')) out.push({ text: txt(e), lang: 'en' });
  const g = after.querySelector('.gpoint p');
  if (g) out.push({ text: txt(g), lang: 'en' });
  if (out.length) setTimeout(() => speakQueue(out), 250);
}

// A speaker beside one choice, a sibling of it (a button cannot hold a button).
export function optionSpeaker(text, lang) {
  if (!S().showSpeakers && S().showSpeakers !== undefined) return null;
  return h('button', { class: 'readbtn optspk', type: 'button', 'aria-label': 'Écouter ce choix', title: 'Écouter ce choix', html: ICON.speaker,
    onclick: (e) => { e.stopPropagation(); unlock(); speakQueue([{ text, lang }]); } });
}
// (Not "Lire": that is already the name of the Reading skill chip beside it.)
export const readQuestionButton = (card) => h('button', { class: 'readq', type: 'button', 'aria-label': 'Lire la question à voix haute', title: 'Lire la question à voix haute',
  onclick: () => readCard(card, { choices: true }) }, h('span', { html: ICON.speaker }), h('span', {}, 'À voix haute'));
