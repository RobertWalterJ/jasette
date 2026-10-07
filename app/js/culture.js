// Jasette — culture and variation: how Québec, Canadian and France French differ, and how colloquial
// French works in Montréal and across Québec.
//
// Short notes in the app's own words. Each rests on named Wikipedia articles (CC BY-SA 4.0): the screen
// says which, with the revision it was written from, and build/verify.mjs checks every key phrase of a
// note against that article, so a note cannot say what its source does not.

import { h, typo } from './ui.js';
import { D } from './deck.js';
import { readBtn } from './parts.js';

export function cultureScreen({ header }) {
  const d = D();
  const notes = d.culture || [];
  return [header('Culture', { backBtn: true }), h('main', {},
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Culture et variation'),
      h('p', {}, 'How Québec French, Canadian French and the French of France differ, how it got that way, and how everyday and colloquial French works in Montréal and across Québec.'),
      h('p', { class: 'note' }, 'These notes are written in this app’s own words from the Wikipedia articles named under each one (text under CC BY-SA 4.0). Each key claim is checked against its article when the app is built.')),
    ...notes.map((n) => h('details', { class: 'card flat culture' },
      h('summary', { style: 'cursor:pointer;list-style:none' }, h('h3', { style: 'display:inline' }, n.title)),
      h('p', {}, n.body, ' ', readBtn(n.body)),
      (n.qc || []).length ? h('div', { class: 'chips' }, ...n.qc.map((w) => { const c = d.canadian[d.canIndex.get(w)]; return c ? h('span', { class: 'chip accent' }, `${c.qc} · ${c.means}`) : null; }).filter(Boolean)) : null,
      h('p', { class: 'evidence' }, 'Sources: ', ...n.sources.flatMap((s, k) => [k ? ' · ' : '', h('a', { href: s.url, target: '_blank', rel: 'noopener' }, `Wikipedia, “${s.title}”`), ` (revision ${s.revid})`]), '. CC BY-SA 4.0.'))))];
}
