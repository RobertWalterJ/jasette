// Jasette — what is kept on this phone, and what can leave it.
//
// Three tiers of recording (build/lib/tiers.mjs says why):
//   essentiel  the commonest 1,500 words and the Québec track — offered for offline use
//              and never evicted;
//   autres     every other recording — kept after it is played, and trimmed, least
//              recently played first, to the size chosen here;
//   à la demande  recordings that are not shipped at all — streamed when played.
// An evicted clip is never lost: it comes back from the app or from its source the next
// time it is played. This card shows the numbers and has the three controls.

import { h, ICON, toast } from './ui.js';
import { State } from './schedule.js';
import { t } from './strings.js';
import { lab } from './parts.js';
import { coreUrls, allBundledUrls, bundledBytes, storageUsage, setStorageCap, purgeOther, osStorage, fetchAll } from './audio.js';

const MB = 1048576;
const mo = (b) => `${(b / MB).toFixed(b < 10 * MB ? 1 : 0)} Mo`.replace('.', ',');
const CAPS = [[60 * MB, '60 Mo'], [200 * MB, '200 Mo'], [600 * MB, '600 Mo'], [0, 'Sans limite']];

export function storageCard() {
  const s = State.data.settings;
  const cap = s.audioCap ?? 200 * MB;
  const usage = h('p', { class: 'note' }, '…');
  const bar = h('div', { class: 'dlbar', hidden: true }, h('i'));
  const prog = h('p', { class: 'note' });
  const bytes = bundledBytes();

  const refresh = async () => {
    const u = await storageUsage();
    const os = await osStorage();
    if (!u) { usage.textContent = 'Le suivi du stockage n’est actif que dans l’app installée ou une fois la page rechargée.'; return; }
    usage.textContent = `Essentiel : ${mo(u.core.bytes)} (${u.core.clips} enregistrements, jamais retirés) · Autres : ${mo(u.other.bytes)} (${u.other.clips})${os?.usage ? ` · Tout ce que Jasette garde : ${mo(os.usage)}` : ''}.`;
  };
  const run = async (urls, label) => {
    if (!urls.length) { toast('Aucun enregistrement n’est fourni avec cette copie.'); return; }
    bar.hidden = false; bar.firstChild.style.width = '0%';
    const r = await fetchAll(urls, (n) => { bar.firstChild.style.width = `${(n / urls.length) * 100}%`; prog.textContent = `${n} / ${urls.length}`; });
    prog.textContent = r.fail ? `${label} : ${urls.length - r.fail} gardés, ${r.fail} introuvables.` : `${label} : ${urls.length} enregistrements gardés sur ce téléphone.`;
    refresh();
  };
  const core = coreUrls();
  const all = allBundledUrls();
  const seg = h('div', { class: 'seg' }, ...CAPS.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': cap === v ? 'true' : 'false', onclick: async (e) => {
    s.audioCap = v; State.save();
    for (const b of seg.children) b.setAttribute('aria-pressed', 'false');
    e.currentTarget.setAttribute('aria-pressed', 'true');
    const r = await setStorageCap(v);
    if (r?.freed) toast(`${mo(r.freed)} libérés.`);
    refresh();
  } }, label)));

  const card = h('section', { class: 'card' },
    h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('storage')),
    h('p', { class: 'note' }, `Les ${all.length.toLocaleString('fr-CA')} enregistrements fournis avec l’app pèsent environ ${mo(bytes.core + bytes.bundled)} ; l’essentiel (${core.length.toLocaleString('fr-CA')} clips) fait ${mo(bytes.core)}. Le reste est gardé quand tu l’écoutes, puis retiré en commençant par le plus ancien. Un enregistrement retiré revient tout seul au prochain besoin.`),
    usage,
    h('div', { class: 'srow col', style: 'border:0;padding-top:4px' }, h('div', { class: 'slabel' }, lab('audioCap')), seg),
    h('div', { style: 'display:grid;gap:8px;margin-top:10px' },
      h('button', { class: 'btn wide', type: 'button', onclick: () => run(core, 'Essentiel') }, h('span', { html: ICON.download }), lab('keepCore'), h('small', { class: 'sub', style: 'margin-left:6px' }, mo(bytes.core))),
      h('button', { class: 'btn ghost wide', type: 'button', onclick: () => run(all, 'Tout') }, lab('downloadAudio'), h('small', { class: 'sub', style: 'margin-left:6px' }, mo(bytes.core + bytes.bundled))),
      h('button', { class: 'btn ghost wide', type: 'button', onclick: async () => { const r = await purgeOther(); toast(r ? `${mo(r.freed || 0)} libérés — l’essentiel reste.` : 'Rien à libérer pour le moment.'); refresh(); } }, h('span', { html: ICON.trash }), lab('freeSpace'))),
    bar, prog);
  refresh();
  return card;
}
