// Jasette — conjugation: what a drill says about itself, what it shows afterwards, and the
// Conjugaison screen (the ladder, the pace, the way in).
//
// The questions themselves are made by build/items.mjs from the verb's own table; nothing here
// derives a form. After an answer the app shows the table the answer came from, so a wrong
// guess is followed by the pattern, not just the right word.

import { h, typo, ICON } from './ui.js';
import { State } from './schedule.js';
import { D } from './deck.js';
import { t } from './strings.js';
import { conjState, conjIds, conjPerDay, skipConjAhead, CONJ_PER_DAY, isMet } from './core.js';
import { newLeftToday } from './schedule.js';
import { lab } from './parts.js';

export const PERSON = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const AUX_ROW = { pc: 'pr', pqp: 'im', fa: 'fu', cop: 'co', sup: 'su' };
const AUX_LABEL = { pc: 'present', pqp: 'imperfect', fa: 'future', cop: 'conditional', sup: 'subjunctive' };
const COMPOUND = new Set(['pc', 'pqp', 'fa', 'cop', 'sup']);

export function conjFacts(it) {
  const d = D();
  const w = d.words[it.v];
  const tn = d.conjTenses[it.tense];
  const inf = w.d || w.w;
  return {
    w, inf, gloss: w.g, tenseFr: tn.fr, tenseEn: tn.en,
    person: it.tense === 'ip' ? PERSON[it.slot] : null,
    eng: `${w.g} · ${tn.en}`,
  };
}

const ctable = (rows, hot = -1) => h('table', { class: 'ctable' }, h('tbody', {}, ...rows.map(([p, f], k) =>
  h('tr', { class: k === hot ? 'hot' : '' }, h('td', { class: 'p' }, p), h('td', { class: 'f' }, typo(f))))));

// The pattern behind an answer.
export function conjAfter(it) {
  const d = D();
  const f = conjFacts(it);
  const c = d.conj[it.v];
  const wrap = h('div', { class: 'gpoint' }, h('h3', {}, `${typo(f.inf)} · ${f.tenseFr}`), h('p', { class: 'note' }, f.eng));
  if (['pr', 'im', 'fu', 'co', 'su'].includes(it.tense)) {
    wrap.append(ctable(c[it.tense].map((form, k) => [PERSON[k], form]), it.slot));
  } else if (COMPOUND.has(it.tense)) {
    const take = d.words[it.v].w;
    const etre = ['aller', 'venir', 'arriver', 'partir', 'rester', 'tomber', 'naître', 'mourir', 'devenir', 'revenir', 'entrer'].includes(take);
    const aux = etre ? 'être' : 'avoir';
    const row = d.conj[d.wordIndex.get(aux)][AUX_ROW[it.tense]];
    wrap.append(h('p', {}, `${aux} (${AUX_LABEL[it.tense]}) + the participle `, h('b', { class: 'fr' }, c.pp)),
      ctable(row.map((form, k) => [PERSON[k], `${form} ${c.pp}`]), it.slot),
      etre ? h('p', { class: 'note' }, 'With être the participle agrees with the subject: allé, allée, allés, allées.') : null);
  } else if (it.tense === 'fp') {
    wrap.append(h('p', {}, 'aller (present) + the infinitive: ', h('b', { class: 'fr' }, 'vais · vas · va · allons · allez · vont'), ` + ${f.inf}`));
  } else if (it.tense === 'ip') {
    wrap.append(h('p', {}, 'Mostly the present tense with the subject dropped. An -er verb loses the s of “tu”: tu parles → parle !'),
      ctable(c.pr.map((form, k) => [PERSON[k], form]), it.slot));
  }
  return wrap;
}

// ── the Conjugaison screen ───────────────────────────────────────────────
export function conjScreen({ header, start, refresh }) {
  const cs = conjState();
  const ids = conjIds();
  const due = State.dueIds(ids.filter(isMet)).length;
  const room = newLeftToday({ newPerDay: conjPerDay() }, 'newC');
  const fresh = ids.filter((id) => !State.card(id)).length;
  const waiting = Math.min(room, fresh);
  const total = cs.rungs.reduce((n, r) => n + r.met, 0);
  const owed = due || waiting;
  const go = () => start(owed ? {} : fresh ? { beyondDaily: true } : { practice: true });
  const label = owed ? t('start') : fresh ? t('keepGoing') : t('practise');
  const subline = owed ? [due ? `${due} ${t('toReview')}` : null, waiting ? `${waiting} new` : null].filter(Boolean).join(' · ') : fresh ? 'a few more' : 'revise what you have met';

  const ladder = h('div', { class: 'metro' });
  let skipShown = false;
  cs.rungs.forEach((r, n) => {
    const state = !r.open ? 'later' : r.met >= r.need ? 'done' : 'here';
    const pct = r.n ? Math.round((r.met / r.n) * 100) : 0;
    const body = h('div', { class: 'card' + (state === 'done' ? ' flat' : '') },
      h('h3', {}, r.title),
      h('p', { class: 'note' }, r.en),
      r.open ? h('div', {}, h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` })),
        h('p', { class: 'note' }, `${r.met} of ${r.n} questions met` + (r.open && r.met < r.need ? ` · the next step opens at ${r.need}` : ''))) : h('p', { class: 'note' }, `${r.n} questions · opens when the step before is about half done`),
      h('p', { class: 'note' }, r.why));
    if (!r.open && !skipShown) {
      skipShown = true;
      body.append(h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:8px', onclick: () => { skipConjAhead(); refresh(); } }, 'I already know the steps before this — open it now'));
    }
    ladder.append(h('div', { class: 'stn ' + (state === 'done' ? 'done' : state === 'here' ? 'here' : 'later') }, h('span', { class: 'dot' }), body));
  });

  const paceSeg = h('div', { class: 'seg' }, ...CONJ_PER_DAY.map((n) => h('button', { type: 'button', 'aria-pressed': conjPerDay() === n ? 'true' : 'false',
    onclick: (e) => { State.data.settings.conjPerDay = n; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, String(n))));

  return [header('Conjugaison', { backBtn: true }), h('main', {},
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Conjugaison'),
      h('p', {}, 'Verb forms, practised on their own: a pronoun, a verb and a tense, and you tap the right form. It starts with the twelve verbs you use in almost every sentence, then widens to more verbs and more tenses, step by step.'),
      h('p', { class: 'note' }, 'Wrong guesses are fine. A form you miss comes round again, and after every answer you see the whole pattern that form came from.'),
      h('button', { class: 'start', type: 'button', onclick: go }, h('span', {}, label, h('span', { class: 'sub' }, subline)), h('span', { html: ICON.chev })),
      total ? h('p', { class: 'note', style: 'margin-top:10px' }, `${total} questions met so far · step ${cs.open} of ${cs.total} open.`) : null),
    h('section', { class: 'card' },
      h('div', { class: 'srow col', style: 'border:0' }, h('div', {}, h('div', { class: 'slabel' }, 'New questions a day'), h('div', { class: 'note' }, 'Separate from the words: conjugation has its own allowance.')), paceSeg)),
    h('p', { class: 'eyebrow', style: 'margin:18px 4px 6px' }, 'The steps, most useful first'),
    ladder)];
}
