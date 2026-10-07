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
import { conjState, conjIds, conjPerDay, skipConjAhead, CONJ_PER_DAY, isMet, conjTrend } from './core.js';
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

export const ctable = (rows, hot = -1) => h('table', { class: 'ctable' }, h('tbody', {}, ...rows.map(([p, f], k) =>
  h('tr', { class: k === hot ? 'hot' : '' }, h('td', { class: 'p' }, p), h('td', { class: 'f' }, typo(f))))));

export const ETRE_VERBS = ['aller', 'venir', 'arriver', 'partir', 'rester', 'tomber', 'naître', 'mourir', 'devenir', 'revenir', 'entrer'];
// "je", "j’", with "que" before a subjunctive: the pronoun as it is written before this form.
const withPronoun = (slot, form, subj = false) => {
  const vowel = /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(form);
  const base = ['je', 'tu', 'il', 'nous', 'vous', 'ils'][slot];
  if (subj) return slot === 0 ? (vowel ? 'que j’' : 'que je ') + form : slot === 2 || slot === 5 ? `qu’${base} ${form}` : `que ${base} ${form}`;
  return slot === 0 && vowel ? `j’${form}` : `${base} ${form}`;
};
// The six rows of one tense of one verb, as a table would show them: [[label, form]]. For a compound
// tense the helper’s row plus the participle; null if the verb has no such table.
export function modelRows(vi, tense) {
  const d = D(), c = d.conj[vi];
  if (!c) return null;
  if (['pr', 'im', 'fu', 'co', 'su'].includes(tense)) return c[tense].map((f, k) => [(tense === 'su' ? 'que ' : '') + PERSON[k], f]);
  if (COMPOUND.has(tense)) {
    const etre = ETRE_VERBS.includes(d.words[vi].w);
    const row = d.conj[d.wordIndex.get(etre ? 'être' : 'avoir')][AUX_ROW[tense]];
    return row.map((f, k) => [PERSON[k], `${f} ${c.pp}`]);
  }
  return null;
}
export const elide = withPronoun;

// What a whole-paradigm question showed, completed, as read aloud: "je suis. tu es. il est…"
export const paradigmText = (it) => it.segs.map((s, k) => `${s}${it.answers[k] || ''}`.trim()).join('. ');

// After a whole-tense or across-the-tenses question: the table, correct, in the order it was asked.
export function paradigmAfter(it) {
  const d = D();
  const w = d.words[it.v];
  const inf = w.d || w.w;
  const rows = it.segs.slice(0, -1).map((s, k) => [s.trim().replace(/\s*$/, ''), it.answers[k]]);
  const title = it.k === 'conj-row' ? `${typo(inf)} · ${d.conjTenses[it.tense].fr}` : `${typo(inf)} · ${PERSON[it.slot]}, à travers les temps`;
  return h('div', { class: 'gpoint' }, h('h3', {}, title), h('p', { class: 'note' }, w.g), ctable(rows));
}

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
const LEVEL = { new: ['Not started', ''], learning: ['Learning', ''], solid: ['Solid', 'accent'], mastered: ['Mastered', 'accent'] };
export function conjScreen({ header, start, refresh, openLesson }) {
  const cs = conjState();
  const trend = conjTrend();
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
    const prevName = n > 0 ? cs.rungs[n - 1].title : null;
    const body = h('div', { class: 'card' + (state === 'done' ? ' flat' : '') },
      h('h3', {}, r.title, r.open ? h('span', { class: 'cefr' }, LEVEL[r.level][0]) : null),
      h('p', { class: 'note' }, r.en),
      r.builds?.length ? h('p', { class: 'note' }, h('b', {}, 'Builds on: '), r.builds.map((b) => cs.rungs[b].title.replace(/^L[ae]s? /, '')).join(' · ')) : null,
      r.open ? h('div', {}, h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` })),
        h('p', { class: 'note' }, `${r.met} of ${r.n} questions met, ${r.can} answered right last time` + (r.met < r.need ? ` · the next step opens at ${r.need} met` : ''))) : h('p', { class: 'note' }, `${r.n} questions · opens when “${prevName}” is about half met and going well`),
      h('p', { class: 'note' }, r.why),
      r.open || n === 0 ? h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:8px', onclick: () => openLesson(n) }, 'Read the lesson') : null);
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
    trend.thisWeek.n || trend.lastWeek.n ? h('section', { class: 'card flat' },
      h('p', { class: 'eyebrow' }, 'Getting better'),
      h('p', {}, trend.thisWeek.n ? `This week: ${trend.thisWeek.pct}% right over ${trend.thisWeek.n} answers.` : 'Nothing answered yet this week.',
        trend.lastWeek.n ? ` Last week: ${trend.lastWeek.pct}% over ${trend.lastWeek.n}.` : ''),
      trend.thisWeek.n >= 10 && trend.lastWeek.n >= 10 ? h('p', { class: 'note' }, trend.thisWeek.pct > trend.lastWeek.pct ? 'Up on last week. The patterns are starting to stick.' : trend.thisWeek.pct === trend.lastWeek.pct ? 'Steady. New material keeps arriving, so holding level is progress.' : 'A little down on last week, which is normal when new steps open. The forms you miss will come round again.') : null) : null,
    h('section', { class: 'card' },
      h('div', { class: 'srow col', style: 'border:0' }, h('div', {}, h('div', { class: 'slabel' }, 'New questions a day'), h('div', { class: 'note' }, 'Separate from the words: conjugation has its own allowance.')), paceSeg)),
    h('p', { class: 'eyebrow', style: 'margin:18px 4px 6px' }, 'The steps, most useful first'),
    ladder)];
}
