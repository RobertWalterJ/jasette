// Jasette — teaching before testing.
//
// A quiz that only asks cannot teach. Three things are TAUGHT, in a short card, the first time they
// are about to be asked:
//
//   - a conjugation step (the lesson: what the tense is for, how it is made, what to watch for, a
//     worked model verb, and the earlier steps it is built on, with how the learner is doing on each);
//   - a new word (its meaning, sound, and example sentences, and for a verb its present tense and
//     which form each example sentence uses: "est apparu" = passé composé);
//   - an expression whose words do not add up (avoir du bol).
//
// The card ends in one button; nothing is timed. The question follows, and is easier for it.
// Lessons are always shown (a tense taught as a bare drill is not taught); the new-word and
// expression cards can be switched off in Settings.

import { h, typo, ICON } from './ui.js';
import { State } from './schedule.js';
import { D, examplesOf } from './deck.js';
import { conjState, likelyKnown } from './core.js';
import { readForms } from './forms.js';
import { wordCard, sentenceBlock, readBtn, exprCard, wordNode } from './parts.js';
import { ctable, modelRows, PERSON, ETRE_VERBS } from './conj.js';

const btn = (label, onclick, cls = 'btn primary wide') => h('button', { class: cls, type: 'button', onclick }, label);
const dock = (...kids) => h('div', { class: 'dock' }, ...kids);
const lessonsSeen = () => (State.data.settings.lessons ||= {});

// ── a conjugation step ───────────────────────────────────────────────────
// The "model" is a real verb whose table comes from the deck. `words` are other verbs listed beside
// it: their participle, future or subjunctive stem, whichever the step is about.
function wordRows(t, tense) {
  const d = D();
  return (t.words || []).map((vi) => {
    const c = d.conj[vi], w = d.words[vi], inf = w.d || w.w;
    if (!c) return null;
    if (tense === 'pc') return [inf, c.pp];
    if (tense === 'fu') return [inf, `je ${c.fu[0]}`.replace(/^je ([aeiouyh])/, 'j’$1')];
    if (tense === 'su') return [inf, `que ${/^[aeiouyh]/.test(c.su[0]) ? 'j’' : 'je '}${c.su[0]}`];
    return [inf, `${/^[aeiouyh]/.test(c.pr[0]) ? 'j’' : 'je '}${c.pr[0]} · nous ${c.pr[3]}`];
  }).filter(Boolean);
}

export function lessonCard(n, onGo, { replay = false } = {}) {
  const d = D(), cs = conjState(), r = cs.rungs[n], t = r.teach;
  const kids = [];
  kids.push(h('p', { class: 'eyebrow' }, `Step ${n + 1} of ${cs.total} · ${replay ? 'lesson' : 'new lesson'}`));
  kids.push(h('h2', { style: 'margin:0 0 4px' }, r.title));
  kids.push(h('p', { class: 'note' }, r.en));

  // the building blocks: what this step stands on, and how the learner is doing on each
  if (r.builds?.length) {
    kids.push(h('div', { class: 'gpoint' },
      h('h3', {}, 'What this builds on'),
      h('p', { class: 'note' }, r.uses),
      h('div', { class: 'chips' }, ...r.builds.map((b) => {
        const rb = cs.rungs[b];
        const solid = rb.level === 'solid' || rb.level === 'mastered';
        return h('span', { class: 'chip' + (solid ? ' accent' : '') }, `${solid ? '✓ ' : ''}${rb.title.replace(/^L[ae]s? /, '')} · ${rb.level === 'new' ? 'not started' : rb.level}`);
      }))));
  } else kids.push(h('p', { class: 'note' }, r.uses));
  if (n > 0 && !replay) {
    const p = cs.rungs[n - 1];
    if (p.met) kids.push(h('p', { class: 'note' }, `The step before went like this: ${p.can} of the ${p.met} questions you have met were right the last time you saw them.`));
  }

  for (const [head, text] of [['What it is', t.what], ['How it is made', t.build], ['Watch for', t.watch]]) {
    kids.push(h('div', {}, h('h3', { style: 'margin:14px 0 4px' }, head, readBtn(text)), h('p', {}, text)));
  }

  // the worked example
  const tenses = t.show || [];
  if (t.model != null && tenses.length) {
    const w = d.words[t.model];
    for (const tense of tenses) {
      let rows = modelRows(t.model, tense);
      if (r.id === 'futur-proche') rows = rows?.map(([p, f]) => [p, `${f} parler`]);
      const nm = d.conjTenses[tense]?.en || tense;
      if (rows) kids.push(h('div', { class: 'gpoint' }, h('h3', {}, `${typo(w.d || w.w)} · ${nm}`), h('p', { class: 'note' }, w.g), ctable(rows)));
    }
  }
  const rows = wordRows(t, tenses[0]);
  if (rows.length) {
    const label = { pc: 'verb → past participle', fu: 'verb → future stem', su: 'verb → subjunctive', pr: 'verb → present' }[tenses[0]] || 'verbs';
    kids.push(h('div', { class: 'gpoint' }, h('h3', {}, 'The ones to learn by heart'), h('p', { class: 'note' }, label),
      h('table', { class: 'ctable' }, h('tbody', {}, ...rows.map(([a, b]) => h('tr', {}, h('td', { class: 'p' }, typo(a)), h('td', { class: 'f' }, typo(b))))))));
  }
  kids.push(h('p', { class: 'note' }, 'Every form in these tables is one Wiktionary lists; the explanation is mine.'));
  kids.push(dock(btn(replay ? 'Done' : 'Got it — start the questions', onGo)));
  return h('section', { class: 'card qcard lesson' }, ...kids);
}

// ── a new word ───────────────────────────────────────────────────────────
function verbBlock(i) {
  const d = D(), w = d.words[i], c = d.conj[i];
  // Definite only where it is: the closed list of être verbs, and avoir for the verbs the source gives
  // avoir. A verb the source gives être but that is not on the list (apparaître, passer…) can take either.
  const helper = ETRE_VERBS.includes(w.w) ? 'it takes être' : w.aux === 'avoir' ? 'it takes avoir' : 'it can take être or avoir, depending on the sentence';
  return h('div', { class: 'gpoint' },
    h('h3', {}, 'Present tense'),
    ctable(c.pr.map((f, k) => [PERSON[k], f])),
    h('p', { class: 'note' }, 'Past participle: ', h('b', { class: 'fr' }, c.pp), ` · in the past tense ${helper}`));
}
function formsNote(i, sentence) {
  const d = D(), w = d.words[i];
  const forms = readForms({ verb: w.lem || w.w, conj: d.conj[i], aux: w.aux }, sentence, d.conjTenses);
  if (!forms.length) return null;
  return h('div', { class: 'note formsnote' }, ...forms.map((f) => h('p', { style: 'margin:2px 0' }, h('b', { class: 'fr' }, typo(f.surface)), ' — ', f.says)));
}
export function wordIntro(it, onGo) {
  const d = D(), i = it.i, w = d.words[i];
  const isVerb = w.k === 'v' && d.conj?.[i];
  const exs = examplesOf(i).slice(0, 2);
  return h('section', { class: 'card qcard intro' },
    h('p', { class: 'eyebrow' }, 'Nouveau mot · New word'),
    wordCard(i, { example: false }),
    isVerb ? verbBlock(i) : null,
    exs.length ? h('p', { class: 'eyebrow', style: 'margin-top:14px' }, 'How it is used') : null,
    ...exs.map((e) => h('div', {}, sentenceBlock({ text: e.t, eng: e.e, sid: e.id, hasAudio: !!e.a, qc: !!e.qc }), isVerb ? formsNote(i, e.t) : null)),
    h('p', { class: 'note' }, 'Next you will be asked what it means. A wrong answer is fine: it comes back on other days.'),
    dock(btn('Got it — ask me', onGo)));
}

// ── an expression ────────────────────────────────────────────────────────
export function exprIntro(it, onGo) {
  const x = D().expressions[it.x];
  return h('section', { class: 'card qcard intro' },
    h('p', { class: 'eyebrow' }, 'Nouvelle expression · New expression'),
    exprCard(x),
    h('p', { class: 'note' }, 'Next you will be asked what it means.'),
    dock(btn('Got it — ask me', onGo)));
}

// What, if anything, should be taught before this question is asked? Returns a card or null.
// `onGo` is called when the learner presses the button (and, for a lesson, records it as seen).
export function introFor(it, round, onGo) {
  const s = State.data.settings;
  if (State.card(it.id)) return null;                           // met before: nothing new to teach
  if (it.k === 'conj-drill') {
    const rung = D().conjLadder[it.rung];
    if (lessonsSeen()[rung.id]) return null;
    return lessonCard(it.rung, () => { lessonsSeen()[rung.id] = true; State.save(); onGo(); });
  }
  if (s.teachNew === false) return null;
  if (it.k === 'word-read' && it.i != null && !round?.spotSet?.has(it.id) && !likelyKnown(it)) return wordIntro(it, onGo);
  if (it.k === 'idiom-mean') return exprIntro(it, onGo);
  return null;
}
