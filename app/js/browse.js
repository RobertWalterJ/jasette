// Jasette — the screens you go to rather than the ones you are sent to:
// the course as a Métro line, the words, progress, and where it all comes from.

import { h, typo, ICON, sheet, closeSheet, show, iconBtn, disclosure, toast } from './ui.js';
import { State, DAY, dayKey, now, cardState } from './schedule.js';
import { D, SKILLS } from './deck.js';
import { t, sub } from './strings.js';
import { course, wordStates, skillStats, floorStage } from './core.js';
import { S, wordNode, wordCard, playBtn, wordVoices, sentenceBlock, qcIcon, creditLine, readBtn, lab } from './parts.js';
import { playWord, playCanadian, bundledCount } from './audio.js';
import VERSIONS from './versions.js';

const bar = (title, { back = false, actions = [] } = {}) => h('header', { class: 'bar' },
  back ? iconBtn('back', t('back'), () => history.back()) : null,
  h('h1', {}, title), ...actions);

// ── the course, as a Métro line ──────────────────────────────────────────
export function courseScreen() {
  const d = D();
  const c = course();
  const metro = h('div', { class: 'metro' });
  const pctOf = (st) => Math.round((Math.min(st.have, st.need) / st.need) * 100);
  c.stages.forEach((st, n) => {
    const state = n < c.current ? 'done' : n === c.current ? 'here' : 'later';
    const pct = state === 'done' ? 100 : pctOf(st);
    const fold = state === 'done';
    const body = h(fold ? 'details' : 'div', { class: 'card' + (fold ? ' flat' : '') },
      fold ? h('summary', { style: 'cursor:pointer;list-style:none' }, h('h3', {}, st.title, h('span', { class: 'cefr' }, st.cefr)), h('p', { class: 'note', style: 'margin:2px 0 0' }, st.placed ? 'Passé — tu as dit le connaître' : 'Passé')) : null,
      h('h3', {}, st.title, h('span', { class: 'cefr' }, st.cefr)),
      h('p', { class: 'note' }, st.en),
      h('p', {}, st.can),
      state !== 'later' ? h('div', {}, h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` })),
        h('p', { class: 'note' }, st.placed ? 'Tu as dit connaître cette étape — on la vérifie de temps en temps.' : `${st.have} sur ${st.need} mots que tu peux répondre${st.grammarNeeded ? `, et ${st.grammarHave} sur ${st.grammarNeeded} points de grammaire` : ''}.`)) : null,
      st.grammarNeeded ? h('div', { class: 'chips' }, ...st.grammar.map((gid) => {
        const g = d.grammarById.get(gid);
        const met = state === 'done' || State.data.cards && d.items.some((it) => it.gid === gid && State.card(it.id)?.ok);
        return h('button', { class: 'chip' + (met ? ' accent' : ''), type: 'button', onclick: () => grammarSheet(gid) }, met ? '✓ ' : '', g.fr || g.title);
      })) : null,
      disclosure(lab('whyThese'), h('p', { class: 'note' }, st.why)));
    metro.append(h('div', { class: 'stn ' + state }, h('span', { class: 'dot' }), body));
  });
  return [bar(t('course'), { actions: [iconBtn('gear', t('settings'), () => show('settings'))] }),
    h('main', {},
      h('p', { class: 'note' }, c.done ? 'Les huit étapes sont derrière toi : tout le reste de la liste est ouvert.' : `Étape ${c.current + 1} sur ${c.stages.length}.`),
      metro,
      h('button', { class: 'btn ghost wide', type: 'button', onclick: () => show('placement') }, t('findLevel')),
      h('p', { class: 'note centre', style: 'margin-top:12px' }, 'Les étapes suivent la fréquence des mots dans les sous-titres et les livres (Lexique 3.83). Les niveaux CECR sont une indication, pas une mesure.'))];
}

export function grammarSheet(gid) {
  const g = D().grammarById.get(gid);
  if (!g) return;
  const box = sheet(
    h('h2', {}, g.fr || g.title), g.fr ? h('p', { class: 'note', style: 'margin-top:-6px' }, g.title) : null,
    h('p', {}, g.plain, readBtn(g.plain + ' ' + (g.watch || ''))),
    g.watch ? h('div', { class: 'gpoint' }, h('p', { class: 'watch' }, g.watch)) : null,
    g.endings ? endingsTable() : null,
    g.examples?.length ? h('div', {}, h('p', { class: 'eyebrow', style: 'margin-top:16px' }, t('examples')), ...g.examples.map((e) => sentenceBlock({ text: e.t, eng: e.e, sid: e.id, hasAudio: !!e.a }))) : null,
    h('p', { class: 'evidence' }, 'L’explication est de moi ; les exemples viennent de Tatoeba, avec leur auteur et leur licence.'));
  return box;
}
function endingsTable() {
  const e = D().endings;
  const rows = Object.entries(e).filter(([, s]) => s.n >= 12).sort((a, b) => b[1].pct - a[1].pct);
  return h('div', { class: 'gpoint' }, h('h3', {}, 'Les terminaisons, mesurées'),
    h('p', { class: 'note' }, 'Sur la liste de mots de l’app, pour les noms dont Lexique et Wiktionary donnent le même genre :'),
    h('table', { class: 'ctable' }, h('tbody', {}, ...rows.map(([k, s]) => h('tr', {}, h('td', { class: 'f' }, '-' + k), h('td', {}, s.g === 'f' ? 'féminin' : 'masculin'), h('td', { class: 'p' }, `${s.pct} %`), h('td', { class: 'p' }, `${s.n} mots`))))));
}

// ── words ────────────────────────────────────────────────────────────────
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');
let wq = { text: '', filter: 'all', shown: 60 };
export function wordsScreen() {
  const d = D();
  const states = wordStates();
  const list = h('div', {});
  const legend = h('div', { class: 'legend' },
    h('span', {}, h('i', { class: 'st' }), t('notMet')), h('span', {}, h('i', { class: 'st met' }), t('met')), h('span', {}, h('i', { class: 'st known' }), t('known')));
  const input = h('input', { type: 'search', placeholder: t('searchWords'), value: wq.text, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': t('searchWords'),
    oninput: (e) => { wq.text = e.target.value; wq.shown = 60; paint(); } });
  const FILTERS = [['all', t('all')], ['qc', t('qcOnly')], ['v', t('verbs')], ['n', t('nouns')], ['adj', t('adjectives')], ['review', t('forgotten')]];
  const chips = h('div', { class: 'filters' }, ...FILTERS.map(([k, label]) => h('button', { class: 'fchip', type: 'button', 'aria-pressed': wq.filter === k ? 'true' : 'false',
    onclick: (e) => { wq.filter = k; wq.shown = 60; for (const b of chips.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); paint(); } }, label)));
  const row = (i) => {
    const w = d.words[i];
    const st = states[i];
    return h('button', { class: 'wrow', type: 'button', onclick: () => wordSheet(i) },
      h('div', {}, h('div', { class: 'w' }, wordNode(w)), h('div', { class: 'g' }, w.g)),
      h('i', { class: 'st ' + (st === 'unseen' ? '' : st === 'met' ? 'met' : 'known'), 'aria-label': st }));
  };
  const paint = () => {
    const q = norm(wq.text.trim());
    if (wq.filter === 'qc') {
      const items = d.canadian.filter((c) => !q || norm(c.qc).includes(q) || norm(c.means).includes(q) || (c.fr && norm(c.fr).includes(q)));
      list.replaceChildren(
        h('p', { class: 'note' }, 'Le français du Québec, tel que Wiktionary le décrit. La colonne « En France » est de moi.'),
        ...items.map((c) => h('button', { class: 'wrow', type: 'button', onclick: () => canadianSheet(c) },
          h('div', {}, h('div', { class: 'w' }, typo(c.qc), c.kind === 'oral' ? h('span', { class: 'reg' }, 'à l’oral') : null), h('div', { class: 'g' }, c.means + (c.fr ? ` · France : ${c.fr}` : ''))),
          h('span', { class: 'qcmark', html: ICON.fleur }))));
      return;
    }
    let ids = d.words.map((_, i) => i);
    if (q) ids = ids.filter((i) => { const w = d.words[i]; return norm(w.w).startsWith(q) || norm(w.w).includes(q) || norm(w.g).includes(q) || (w.alt || []).some((a) => norm(a).includes(q)); })
      .sort((a, b) => (norm(d.words[b].w).startsWith(q) - norm(d.words[a].w).startsWith(q)) || a - b);
    if (wq.filter === 'v' || wq.filter === 'n' || wq.filter === 'adj') ids = ids.filter((i) => d.words[i].k === wq.filter);
    if (wq.filter === 'review') ids = ids.filter((i) => states[i] === 'met');
    const slice = ids.slice(0, wq.shown);
    list.replaceChildren(
      h('p', { class: 'note' }, `${ids.length.toLocaleString('fr-CA')} mot${ids.length === 1 ? '' : 's'}`),
      ...slice.map(row),
      ids.length > wq.shown ? h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:12px', onclick: () => { wq.shown += 80; paint(); } }, lab('moreWords')) : null,
      !ids.length ? h('p', { class: 'empty' }, lab('nothingFound')) : null);
  };
  paint();
  return [bar(t('words'), { actions: [iconBtn('gear', t('settings'), () => show('settings'))] }),
    h('main', {}, h('div', { class: 'search' }, h('span', { html: ICON.search }), input), chips, legend, list)];
}

export function wordSheet(i) {
  const d = D();
  const w = d.words[i];
  const exs = (d.examples[i] || []);
  const conj = d.conj?.[i];
  const body = h('div', {}, wordCard(i, { example: false }));
  if (conj) body.append(conjTable(w, conj));
  if (exs.length) body.append(h('p', { class: 'eyebrow', style: 'margin-top:16px' }, t('examples')), ...exs.map((e) => sentenceBlock({ text: e.t, eng: e.e, sid: e.id, hasAudio: !!e.a, qc: !!e.qc })));
  const meta = [`Rang ${w.r} sur ${d.words.length}`, w.k === 'v' && w.aux ? `auxiliaire : ${w.aux === 'etre' ? 'être' : 'avoir'}` : null].filter(Boolean).join(' · ');
  body.append(h('p', { class: 'evidence' }, `${meta}. Sens : Wiktionary (CC BY-SA). Fréquence : Lexique 3.83 (CC BY-SA).`));
  return sheet(body);
}
const TENSES = [['pr', 'Présent'], ['im', 'Imparfait'], ['fu', 'Futur'], ['co', 'Conditionnel'], ['su', 'Subjonctif']];
const PERSONS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
function conjTable(w, conj) {
  const wrap = h('div', {});
  const tabs = h('div', { class: 'seg' });
  const body = h('div', {});
  const have = TENSES.filter(([k]) => conj[k]);
  const render = (k) => {
    const row = conj[k];
    body.replaceChildren(h('table', { class: 'ctable' }, h('tbody', {}, ...row.map((f, p) => h('tr', {}, h('td', { class: 'p' }, p === 0 && /^[aeiouyhâéèêîôû]/.test(f) ? 'j’' : PERSONS[p]), h('td', { class: 'f' }, typo(f)))))),
      conj.pp ? h('p', { class: 'note' }, `Participe passé : ${conj.pp}${conj.ger ? ` · Gérondif : ${conj.ger}` : ''}`) : null);
    for (const b of tabs.children) b.setAttribute('aria-pressed', b.dataset.k === k ? 'true' : 'false');
  };
  for (const [k, label] of have) tabs.append(h('button', { type: 'button', 'data-k': k, onclick: () => render(k) }, label));
  wrap.append(h('p', { class: 'eyebrow', style: 'margin-top:16px' }, t('conjugation')), tabs, body);
  if (have.length) render(have[0][0]);
  return wrap;
}
export function canadianSheet(c) {
  const note = h('p', { class: 'note centre' });
  return sheet(
    h('p', { class: 'eyebrow' }, qcIcon(), ' ', t('inQuebec')),
    h('h2', {}, typo(c.qc)),
    c.std ? h('p', {}, 'À l’écrit : ', h('b', {}, typo(c.std))) : null,
    h('p', { class: 'gloss big' }, c.means),
    c.ipaQc || c.ipa ? h('p', { class: 'ipa' }, c.ipaQc ? `Québec ${c.ipaQc}` : '', c.ipa ? ` · ${c.ipa}` : '') : null,
    c.audio ? h('div', { class: 'voices' }, playBtn({ label: 'Québec', note, play: (end) => playCanadian(c, { onend: end }) })) : null, note,
    c.fr ? h('p', {}, h('b', {}, 'En France : '), c.fr, ' ', h('span', { class: 'note' }, '(de moi)')) : null,
    c.contrast ? h('p', {}, h('b', {}, 'En France, selon Wiktionary : '), c.contrast) : null,
    c.note ? h('div', { class: 'gpoint' }, h('p', { class: 'watch' }, c.note)) : null,
    c.ex ? sentenceBlock({ text: c.ex.t, eng: c.ex.e, sid: c.ex.id, hasAudio: !!c.ex.a, qc: true }) : null,
    h('p', { class: 'evidence' }, `Sens : Wiktionary${c.gloss ? ` (« ${c.gloss} »)` : ''}, CC BY-SA.`, c.fr2 ? ' Confirmé aussi par le Wiktionnaire en français.' : ''));
}

// ── progress ─────────────────────────────────────────────────────────────
export function progressScreen() {
  const d = D();
  const states = wordStates();
  const nMet = states.filter((s) => s !== 'unseen').length;
  const nKnown = states.filter((s) => s === 'known' || s === 'secure').length;
  const placed = State.data.placement;
  const stats = skillStats();
  const c = course();
  const SK = { listening: 'ear', speaking: 'mic', reading: 'eye', writing: 'pen', grammar: 'puzzle', canada: 'fleur' };
  const days = State.data.days;
  const heat = h('div', { class: 'heat', 'aria-label': 'Les 56 derniers jours' });
  for (let k = 55; k >= 0; k--) {
    const day = days[dayKey(now() - k * DAY)];
    const n = day ? day.n : 0;
    heat.append(h('i', { class: n === 0 ? '' : n < 20 ? 'l1' : n < 50 ? 'l2' : 'l3', title: n ? `${n} réponses` : '' }));
  }
  const total = Object.values(days).reduce((a, x) => a + (x.n || 0), 0);
  const rightTotal = Object.values(days).reduce((a, x) => a + (x.right || 0), 0);
  return [bar(t('progress'), { actions: [iconBtn('gear', t('settings'), () => show('settings'))] }),
    h('main', {},
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, lab('vocabulary')),
        h('div', { style: 'display:flex;gap:24px;align-items:flex-end;flex-wrap:wrap' },
          h('div', {}, h('div', { class: 'bignum' }, nKnown.toLocaleString('fr-CA')), h('p', { class: 'note' }, 'mots connus (réussis après plus de trois semaines)')),
          h('div', {}, h('div', { class: 'bignum', style: 'font-size:1.8rem' }, nMet.toLocaleString('fr-CA')), h('p', { class: 'note' }, 'mots vus'))),
        placed ? h('p', { class: 'note' }, `Au départ, le test de niveau estimait environ ${placed.size.toLocaleString('fr-CA')} mots, sur ${placed.asked} questions. C’est une estimation, pas une mesure.`) : null),
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, lab('skills')),
        h('div', { class: 'skills' }, ...SKILLS.map((s) => {
          const st = stats[s];
          const pct = st.total ? Math.round((st.can / st.total) * 100) : 0;
          return h('div', { class: 'skillrow' }, h('div', { class: 'top' }, h('span', {}, h('span', { html: ICON[SK[s]], style: 'display:inline-flex;width:18px;vertical-align:-3px;margin-right:6px;color:var(--accent)' }), t(s)), h('span', {}, `${st.can.toLocaleString('fr-CA')} sur ${st.total.toLocaleString('fr-CA')}`)),
            h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` })),
            h('p', { class: 'note' }, st.known ? `dont ${st.known.toLocaleString('fr-CA')} sûrement acquises` : 'pas encore de réponse sûre'));
        })),
        h('p', { class: 'note', style: 'margin-top:14px' }, 'Chaque barre compte les questions ouvertes par le parcours auxquelles ta dernière réponse était juste. Elle ne dit pas ce que tu ferais dans une vraie conversation, seulement ce qu’il te reste dans la tête.')),
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Régularité'),
        h('p', {}, `${total.toLocaleString('fr-CA')} réponses au total, ${total ? Math.round((rightTotal / total) * 100) : 0} % de justes.`),
        heat, h('p', { class: 'note' }, 'Les 56 derniers jours, la plus récente en bas à droite.')),
      h('section', { class: 'card flat' },
        h('p', { class: 'eyebrow' }, `Étape ${Math.min(c.current + 1, c.stages.length)} sur ${c.stages.length}`),
        h('button', { class: 'btn ghost wide', type: 'button', onclick: () => show('course') }, t('course'))))];
}

// ── where it comes from ──────────────────────────────────────────────────
export function aboutScreen() {
  const d = D();
  const src = (name, what, lic, url) => h('div', { style: 'margin-bottom:16px' }, h('p', { style: 'margin:0' }, h('a', { href: url, target: '_blank', rel: 'noopener' }, h('b', {}, name)), ' · ', lic), h('p', { class: 'note', style: 'margin:0' }, what));
  return [bar(t('about'), { back: true }),
    h('main', {},
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Version'),
        h('p', { style: 'font-size:1.5rem;font-weight:800;margin:0' }, `Jasette ${VERSIONS[0].v}`),
        h('p', { class: 'note' }, `Publiée le ${VERSIONS[0].date}. Si ce n’est pas la dernière version, ferme l’app et rouvre-la : elle se met à jour toute seule.`)),
      h('section', { class: 'card' },
        h('p', {}, 'Jasette garde et étend ton français, québécois d’abord. Tout ce qu’elle enseigne vient d’une des sources ci-dessous ; rien n’est inventé. Les explications de grammaire et les conseils d’emploi sont de moi, et l’app le dit chaque fois.'),
        src('Lexique 3.83', 'La fréquence de chaque mot (sous-titres de films et livres), les formes fléchies et le genre.', 'CC BY-SA 4.0', 'http://www.lexique.org'),
        src('Wiktionary (en anglais)', 'Les sens, étiquetés par région et par registre ; la prononciation (API) ; les tables de conjugaison. Via kaikki.org.', 'CC BY-SA 3.0 / 4.0', 'https://kaikki.org/dictionary/French/'),
        src('Tatoeba', 'Chaque phrase d’exemple et sa traduction, avec son auteur. Les enregistrements de phrases sont presque tous sous licence CC BY-NC(-ND) : gratuits, non modifiés, sans usage commercial.', 'CC BY 2.0 FR ; audio : voir chaque clip', 'https://tatoeba.org'),
        src('OQLF : Banque de dépannage linguistique', 'Les phrases grammaticales et agrammaticales de la question « Laquelle est correcte ? », avec la page de règle de l’Office québécois de la langue française. Données ouvertes (Données Québec) ; usage non commercial, partage dans les mêmes conditions.', 'CC BY-NC-SA 4.0', 'https://donneesquebec.ca/recherche/dataset/donnees-linguistiques'),
        src('Wikipedia (en anglais)', 'Les notes de la section Culture sont écrites avec les mots de l’app à partir d’articles nommés sous chaque note ; chaque affirmation clé est vérifiée contre l’article à la construction.', 'CC BY-SA 4.0', 'https://en.wikipedia.org'),
        src('Lingua Libre / Wikimedia Commons', 'Les voix des mots : un locuteur du Québec (Shawinigan) et des locuteurs de France (Paris, Lyon, Toulouse, Vosges), nommés sur chaque clip.', 'CC BY-SA 4.0', 'https://lingualibre.org')),
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Ce que l’app ne peut pas faire'),
        h('p', { class: 'note' }, 'Elle ne peut pas entendre si tu prononces bien : la reconnaissance vocale (si tu l’actives) envoie ta voix au fabricant du navigateur et se trompe plus souvent avec un apprenant. Elle ne remplace pas une conversation. Les phrases de Tatoeba sont surtout en français de France ; le français du Québec passe par les mots enregistrés et par la piste « Québec ».'),
        h('p', { class: 'note' }, `Voix fournies avec l’app : ${bundledCount().toLocaleString('fr-CA')} enregistrements. Le reste se charge depuis Wikimedia et Tatoeba quand il y a du réseau, et reste gardé ensuite.`)),
      h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Historique des versions'),
        ...VERSIONS.map((v) => h('div', { style: 'margin-bottom:12px' }, h('b', {}, `${v.v} · ${v.date}`), h('p', { class: 'note', style: 'margin:0' }, v.what)))),
      h('p', { class: 'note centre' }, `Données du ${d.built}. ${d.words.length.toLocaleString('fr-CA')} mots, ${d.items.length.toLocaleString('fr-CA')} questions.`))];
}
