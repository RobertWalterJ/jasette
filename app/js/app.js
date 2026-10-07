// Jasette — le français, canadien d’abord.
//
// Built the way Hok Gong was: retrieval practice, spacing that adapts to what
// you actually remember, and measurement you can check. The difference is the
// learner. Hok Gong starts from nothing; this is for someone who already has
// French and wants to keep it and extend it, in Québec and in France. So it
// starts by finding where you stand, asks about what you probably know only
// as spot checks, and spends its teaching on what is new.
//
// Screens live in browse.js; this file is the shell, the home screen, the
// round and the settings.

import { h, typo, ICON, iconBtn, sheet, closeSheet, show, route, back, onScreen, currentScreen, repaint, flash, toast, setLeaveGuard } from './ui.js';
import { initSpeech, unlock, onSpeaking, frVoiceInfo, frAvailable } from './speech.js';
import { loadAudioIndex, onAudio, stopAudio } from './audio.js';
import { storageCard } from './storage.js';
import { State, Round, cardState, dayKey, newLeftToday, now, DAY, shuffle } from './schedule.js';
import { loadDeck, indexDeck, D, SKILL, allIds } from './deck.js';
import { t, sub, setMode, setUi, resetFade, fadeStats } from './strings.js';
import { press as tick, right as correct, wrong, setSound as setSoundOn } from './sound.js';
import { asrSupported } from './asr.js';
import { S, wordNode, wordCard, playBtn, wordVoices, sentenceBlock, qcIcon, voicePref, afterCard, choices, lab, labFull } from './parts.js';
import { GUIDE, hintFor, tipNode } from './help.js';
import { autoRead, readQuestionButton, cancelReading, speakQueue } from './read.js';
import { renderQuestion, skillChip } from './questions.js';
import { SITTINGS, PACES, sitting, pace, noSpeaking, course, floorStage, inPlay, wordStates, isMet, likelyKnown, conjIds, conjPace, conjState, conjSize } from './core.js';
import { conjScreen } from './conj.js';
import { introFor, lessonCard, wordIntro, exprIntro } from './teach.js';
import { Placement, BANDS } from './placement.js';
import { courseScreen, wordsScreen, progressScreen, aboutScreen, wordSheet, canadianSheet } from './browse.js';
import VERSIONS from './versions.js';

export const VERSION = window.JASETTE_BUILD || { v: VERSIONS[0].v, date: '', commit: '' };

// ── look: palette, light or dark, interface language ─────────────────────
const THEMES = {
  fleurdelise: { name: 'Fleurdelisé', sub: 'Québec', bars: ['#0B47B3', '#FFFFFF', '#0B47B3'] },
  tricolore: { name: 'Tricolore', sub: 'France', bars: ['#0055A4', '#FFFFFF', '#EF4135'] },
  montreal: { name: 'Montréal', sub: 'Métro', bars: ['#00714A', '#D4620A', '#F4F1EA'] },
};
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
function applyLook() {
  const s = S();
  const dark = s.scheme === 'dark' || (s.scheme !== 'light' && mq?.matches);
  const el = document.documentElement;
  el.setAttribute('data-theme', s.theme || 'fleurdelise');
  el.setAttribute('data-eff', dark ? 'dark' : 'light');
  el.classList.toggle('big', !!s.big);
  el.classList.toggle('dys', !!s.dys);
  el.classList.toggle('plain', !!s.plain);
  const bg = getComputedStyle(el).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#F5F8FD');
  setMode(s.lang || 'fade');
  setUi(State.data.ui || (State.data.ui = { seen: {} }), { quick: (State.data.placement?.size || 0) >= 2500 });
  el.lang = s.lang === 'en' ? 'en-CA' : 'fr-CA';
  el.setAttribute('translate', 'no');
}
mq?.addEventListener?.('change', () => { applyLook(); });

// ── how it works, in English ─────────────────────────────────────────────
function guideSheet() {
  sheet(
    h('h2', {}, 'How Jasette works'),
    h('p', { class: 'note' }, 'Comment ça marche'),
    ...GUIDE.map(([title, text]) => h('div', { style: 'margin:14px 0' }, h('h3', { style: 'font-size:1.02rem;margin-bottom:4px' }, title), h('p', { style: 'margin:0' }, text))),
    h('button', { class: 'btn primary wide', type: 'button', onclick: closeSheet }, t('gotIt')));
}
const welcomeCard = () => h('section', { class: 'card welcome' },
  h('p', { class: 'eyebrow' }, 'Welcome — Bienvenue'),
  h('h2', { style: 'font-size:1.35rem;margin-bottom:8px' }, 'Let’s find where you are'),
  h('p', {}, 'You already know some French. Jasette finds out how much, then helps you keep it and grow it. Menus are in French with English underneath — the English fades as you get used to it.'),
  h('ol', { class: 'steps' },
    h('li', {}, h('b', {}, 'Take the level check. '), 'About 30 words, five minutes, no timer. Tap the English meaning — or “Je ne sais pas” if you don’t know. That’s fine.'),
    h('li', {}, h('b', {}, 'Then do a round a day. '), 'About 40 short questions. Each one tells you how to answer it.'),
    h('li', {}, h('b', {}, 'Wrong answers are normal. '), 'They come back on a later day until they stick.')),
  h('button', { class: 'btn ghost wide', type: 'button', onclick: guideSheet }, 'How it all works'));

// ── installing it ────────────────────────────────────────────────────────
// Chrome offers an install prompt only when it decides to, and its own menu can refuse
// ("already installed" with nothing installed — Night Sky's bug, Oct 2026). The way round
// it that worked is an in-page button that holds on to the `beforeinstallprompt` event and
// calls prompt() itself. Where there is no such event (iPhone, a browser that has already
// shown it, or Chrome's menu path) the same button opens the steps by hand.
let installEvent = null;
const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; if (currentScreen() === 'today') repaint(); });
window.addEventListener('appinstalled', () => { installEvent = null; State.data.installed = true; State.save(); repaint(); });
async function installApp() {
  if (installEvent) {
    installEvent.prompt();
    try { const r = await installEvent.userChoice; if (r.outcome === 'accepted') { State.data.installed = true; State.save(); } } catch { /* the sheet closes either way */ }
    installEvent = null; repaint();
    return;
  }
  installSheet();
}
function installSheet() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const step = (n, text) => h('div', { style: 'display:flex;gap:12px;align-items:flex-start;margin:10px 0' }, h('span', { class: 'chip accent', style: 'flex:none;min-width:30px;justify-content:center' }, String(n)), h('span', {}, text));
  sheet(
    h('h2', {}, lab('installSteps')),
    h('p', { class: 'note' }, 'Jasette est une application web : une fois installée, elle a son icône, s’ouvre en plein écran et garde ta progression sur ce téléphone.'),
    ios ? [
      step(1, 'Ouvre cette page dans Safari.'),
      step(2, 'Touche le bouton Partager (le carré avec une flèche vers le haut).'),
      step(3, 'Choisis « Sur l’écran d’accueil », puis « Ajouter ».'),
    ] : [
      step(1, 'Ouvre cette page dans Chrome.'),
      step(2, 'Touche le menu ⋮ en haut à droite.'),
      step(3, 'Choisis « Installer l’application » (ou « Ajouter à l’écran d’accueil »), puis confirme.'),
    ],
    h('div', { class: 'gpoint' }, h('p', { class: 'watch' }, 'Si le menu dit « déjà installée » sans qu’il y ait d’icône : touche d’abord le bouton « Installer maintenant » de cette page quand il apparaît, ou désinstalle l’ancienne icône de Jasette, puis recommence. Ta progression reste dans le navigateur ; sauvegarde-la d’abord dans les réglages.')),
    h('button', { class: 'btn primary wide', type: 'button', onclick: closeSheet }, t('gotIt')));
}
const installCard = () => (standalone() || State.data.installed ? null : h('section', { class: 'card flat' },
  h('div', { style: 'display:flex;gap:14px;align-items:center' },
    h('span', { html: ICON.download, style: 'display:inline-flex;width:28px;color:var(--accent);flex:none' }),
    h('div', { style: 'flex:1;min-width:0' }, h('div', { style: 'font-weight:700' }, lab('install')), h('div', { class: 'note', style: 'margin:0' }, t('installNote')))),
  h('div', { style: 'display:grid;gap:8px;margin-top:12px' },
    installEvent ? h('button', { class: 'btn primary wide', type: 'button', onclick: installApp }, lab('installNow')) : null,
    h('button', { class: 'btn ghost wide', type: 'button', onclick: installSheet }, lab('installSteps')))));

// ── backup ───────────────────────────────────────────────────────────────
function backupProgress() {
  const blob = new Blob([JSON.stringify({ app: 'jasette', version: VERSION.v, saved: new Date().toISOString(), data: State.data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `jasette-progression-${dayKey()}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function restoreProgress(file, onDone) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(String(r.result));
      const data = parsed?.data?.cards ? parsed.data : parsed?.cards ? parsed : null;
      if (!data) throw new Error('ce fichier n’est pas une sauvegarde de Jasette');
      const mine = Object.keys(State.data.cards || {}).length;
      State.data = { ...State.data, ...data, settings: { ...State.data.settings, ...(data.settings || {}) } };
      State.save();
      applyLook();
      onDone(`${Object.keys(data.cards || {}).length.toLocaleString('fr-CA')} questions restaurées${mine ? ` (il y en avait ${mine.toLocaleString('fr-CA')} ici)` : ''}.`);
    } catch (err) { onDone('Impossible de lire ce fichier : ' + err.message); }
  };
  r.readAsText(file);
}

// A new deploy is only useful if the phone notices.
let updateShown = false;
async function watchForUpdates() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  let reg = null;
  try { reg = await navigator.serviceWorker.register('./sw.js', { scope: './' }); } catch { return; }
  const offer = () => {
    if (updateShown) return; updateShown = true;
    const bar = h('div', { class: 'update', role: 'status' }, h('span', {}, 'Une nouvelle version est prête.'),
      h('button', { class: 'link', type: 'button', onclick: () => location.reload() }, 'Recharger'),
      iconBtn('close', 'Plus tard', () => bar.remove()));
    document.body.append(bar);
  };
  if (reg.waiting) offer();
  reg.addEventListener('updatefound', () => {
    const fresh = reg.installing;
    fresh?.addEventListener('statechange', () => { if (fresh.state === 'installed' && navigator.serviceWorker.controller) offer(); });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
}

// ── the shell: a bar of tabs ─────────────────────────────────────────────
const TABS = [['today', 'home', 'today'], ['course', 'path', 'course'], ['words', 'book', 'words'], ['progress', 'chart', 'progress']];
let tabbar = null;
function buildTabs() {
  tabbar = h('div', { class: 'tabbar', role: 'navigation' }, h('nav', {}, ...TABS.map(([name, icon, key]) =>
    h('button', { class: 'tab', type: 'button', 'data-tab': name, onclick: () => { if (currentScreen() !== name) show(name); } },
      h('span', { html: ICON[icon] }), h('span', {}, t(key)), sub(key) ? h('span', { class: 'sub' }, sub(key)) : null))));
  document.body.append(tabbar);
}
function syncTabs(name, tabs) {
  if (!tabbar) return;
  tabbar.hidden = !tabs;
  for (const b of tabbar.querySelectorAll('.tab')) b.setAttribute('aria-current', b.dataset.tab === name ? 'page' : 'false');
}
function refreshTabLabels() {
  tabbar?.remove();
  buildTabs();
  syncTabs(currentScreen(), true);
}

const header = (title, { backBtn = false, actions = null } = {}) => h('header', { class: 'bar' },
  backBtn ? iconBtn('back', t('back'), back) : null, h('h1', {}, title), ...(actions || []));

// ── home ─────────────────────────────────────────────────────────────────
function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'hello' : hr < 18 ? 'goodAfternoon' : 'goodEvening';
}
const dayHash = (salt = '') => { let x = 0; for (const ch of dayKey() + salt) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; };

// A way into the Conjugaison section from Today.
function conjCard() {
  const cs = conjState();
  const ids = conjIds();
  const due = State.dueIds(ids.filter(isMet)).length;
  const r = cs.rungs[cs.current];
  return h('section', { class: 'card' },
    h('p', { class: 'eyebrow' }, 'Conjugaison'),
    h('div', { class: 'dayword' }, h('div', { style: 'flex:1;min-width:0' },
      h('div', { class: 'w' }, r ? r.title : ''), h('div', { class: 'note' }, `${r ? r.en : ''} · step ${cs.open} of ${cs.total}${due ? ` · ${due} to review` : ''}`)),
      h('button', { class: 'btn', type: 'button', 'aria-label': 'Conjugaison', onclick: () => show('conj') }, h('span', { html: ICON.chev }))));
}

function homeScreen() {
  const d = D();
  const { ids, assumed } = inPlay();
  const due = State.dueIds(ids).length;
  const fresh = ids.filter((id) => !State.card(id)).length;
  const room = newLeftToday(pace());
  const met = ids.filter((id) => State.card(id)).length;
  const first = met === 0 && !State.data.placement;
  const c = course();
  const st = c.done ? null : c.stages[c.current];
  const waiting = Math.min(room, fresh);
  const run = State.runOfDays();
  const owed = due || waiting;
  const minutes = Math.max(2, Math.round((sitting().size * 11) / 60));

  const pct = c.done ? 100 : Math.round((Math.min(st.have, st.need) / st.need) * 100);
  const C = 2 * Math.PI * 34;
  const ring = h('div', { class: 'ring', role: 'img', 'aria-label': `${pct} %` },
    h('span', { html: `<svg viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="34" fill="none" stroke-width="9"/><circle class="fill" cx="42" cy="42" r="34" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * pct) / 100} ${C}"/></svg>`, style: 'display:contents' }),
    h('div', { class: 'mid' }, `${pct}%`));

  const startLabel = first ? t('findLevel') : owed ? t('start') : fresh ? t('keepGoing') : t('practise');
  const startSub = first ? t('findLevelNote') : owed ? (due && waiting ? `${due} ${t('toReview')} · ${waiting} ${t('newWords')}` : due ? `${due} ${t('toReview')}` : `${waiting} ${t('newWords')}`) : fresh ? `${sitting().size} questions de plus` : `${sitting().size} questions sur ce que tu connais`;
  const go = () => (first ? show('placement') : startRound(owed ? {} : fresh ? { beyondDaily: true } : { practice: true }));

  const word = wordOfDay();
  const qc = qcOfDay();
  return [
    h('header', { class: 'bar' }, h('div', { class: 'wordmark' }, h('span', { html: ICON.fleur }), 'jasette'), iconBtn('gear', t('settings'), () => show('settings'))),
    h('main', {},
      h('section', { class: 'hero' },
        h('div', { class: 'stripe' }, h('i'), h('i'), h('i')),
        h('p', { class: 'hi' }, t(greeting()), sub(greeting()) ? h('small', {}, sub(greeting())) : null),
        h('div', { class: 'herorow' }, ring,
          h('div', { class: 'herotext' },
            h('p', { class: 't' }, c.done ? 'Parcours terminé' : st.title),
            h('p', { class: 'note' }, c.done ? 'Toute la liste est ouverte.' : `${t('stage')} ${c.current + 1} sur ${c.stages.length} · ${st.cefr}`), c.done ? null : h('p', { class: 'note', style: 'margin:0' }, st.en))),
        h('button', { class: 'start', type: 'button', onclick: go }, h('span', {}, startLabel, h('span', { class: 'sub' }, startSub)), h('span', { html: ICON.chev })),
        !first ? h('div', { class: 'split' },
          h('button', { class: 'mini', type: 'button', onclick: () => startRound({ practice: true }), disabled: met < 12 }, h('span', { html: ICON.repeat }), t('recall'), h('small', {}, t('recallNote'))),
          h('button', { class: 'mini', type: 'button', onclick: () => show('placement') }, h('span', { html: ICON.sparkle }), t('findLevel'), h('small', {}, State.data.placement ? `≈ ${State.data.placement.size.toLocaleString('fr-CA')} mots au dernier test` : t('findLevelNote')))) : null,
        outLoudSwitch(),
        !first ? h('button', { class: 'link', type: 'button', style: 'display:block;margin:12px auto 0', onclick: guideSheet }, 'How it works · Comment ça marche') : null,
        run > 1 ? h('p', { class: 'note', style: 'margin:12px 0 0' }, h('span', { html: ICON.flame, style: 'display:inline-flex;width:16px;vertical-align:-3px;color:var(--accent2)' }), ` ${run} ${t('daysRun')}`) : null),
      first ? welcomeCard() : null,
      !first ? conjCard() : null,
      installCard(),
      !frAvailable() ? h('section', { class: 'card flat' }, h('p', { class: 'note' }, 'Ce téléphone n’a pas de voix française. Les mots et phrases enregistrés se jouent quand même ; les autres questions d’écoute sont mises de côté.')) : null,
      word ? h('section', { class: 'card' },
        h('p', { class: 'eyebrow' }, t('wordOfDay')),
        h('div', { class: 'dayword' }, h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'w' }, wordNode(word.w)), h('div', { class: 'note' }, word.w.g)),
          h('button', { class: 'btn', type: 'button', onclick: () => wordSheet(word.i) }, h('span', { html: ICON.chev })))) : null,
      qc ? h('section', { class: 'card qcday' },
        h('p', { class: 'eyebrow' }, qcIcon(), ' ', t('qcOfDay')),
        h('div', { class: 'dayword' }, h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'w' }, typo(qc.qc)), h('div', { class: 'note' }, qc.means + (qc.std ? ` — ${typo(qc.std)}` : ''))),
          h('button', { class: 'btn', type: 'button', onclick: () => canadianSheet(qc) }, h('span', { html: ICON.chev })))) : null),
  ];
}
function wordOfDay() {
  const d = D();
  const c = course();
  const stIdx = Math.min(c.current, d.stages.length - 1);
  const pool = d.stages[stIdx].words.filter((i) => d.examples[i]?.length && ['n', 'v', 'adj'].includes(d.words[i].k));
  if (!pool.length) return null;
  const i = pool[dayHash('w') % pool.length];
  return { i, w: d.words[i] };
}
function qcOfDay() {
  const d = D();
  const c = course();
  const pool = d.canadian.filter((x) => x.stage <= c.current + 1);
  return pool.length ? pool[dayHash('q') % pool.length] : null;
}
function outLoudSwitch() {
  const on = noSpeaking();
  return h('button', { class: 'quiet' + (on ? ' on' : ''), type: 'button', 'aria-pressed': on ? 'true' : 'false',
    onclick: () => { State.data.settings.quiet = !on; State.save(); repaint(); } },
    h('span', { class: 'sw' }, h('span', { class: 'knob' })),
    h('span', {}, on ? t('notOutLoud') : t('speakOn'), h('span', { class: 'note', style: 'display:block' }, on ? 'Seules les questions où tu dois parler sont mises de côté.' : t('notOutLoudNote'))));
}

// ── the round ────────────────────────────────────────────────────────────
const session = { asked: new Set() };
function startRound(opts = {}) {
  unlock();
  const { ids, assumed } = inPlay();
  const size = sitting().size;
  const round = new Round(ids, {
    ...opts, exclude: session.asked, pace: pace(), groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.stage, size,
    spot: assumed.length && !opts.practice ? { ids: assumed, n: Math.max(2, Math.round(size * 0.2)) } : null,
  });
  if (round.empty) { show('empty'); return; }
  show('round', { round, practice: !!opts.practice });
}
// The conjugation sitting: only drills (rungs opened so far, plus any already started), its own
// daily allowance (newC), the lowest rung first.
function startConjRound(opts = {}) {
  unlock();
  const ids = conjIds();
  const round = new Round(ids, {
    ...opts, exclude: session.asked, pace: conjPace(), newKey: 'newC', capNew: true, groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.rung, size: conjSize(opts),
  });
  if (round.empty) { show('empty'); return; }
  show('round', { round, practice: !!opts.practice, conj: true });
}
function emptyScreen() {
  return [header('Série'), h('main', {}, h('section', { class: 'card' },
    h('p', {}, 'Rien à poser pour le moment : tout a été demandé ces dernières heures.'),
    h('p', { class: 'note' }, 'Cette pause est voulue : une question vue il y a dix minutes teste ta mémoire à court terme, pas ton français.'),
    h('button', { class: 'btn primary wide', type: 'button', onclick: () => show('today') }, t('done'))))];
}

let inRound = false;
function roundScreen(arg) {
  // A round lives in memory. Arriving here without one (the back button, a reload) means starting fresh.
  if (!arg?.round) return emptyScreen();
  const { round, practice, conj = false } = arg;
  inRound = true;
  const box = h('main', { class: 'round' });
  const prog = h('i');
  const count = h('span', { class: 'note' });
  const total = round.queue.length;
  let done = 0, right = 0;
  const tally = {};
  const stageBefore = course().current;
  const newToday = new Set();
  const paint = () => { prog.style.width = `${(done / Math.max(1, total)) * 100}%`; count.textContent = done >= total ? '' : t('question', { a: Math.min(done + 1, total), b: total }); };
  const leave = () => { inRound = false; setLeaveGuard(null); show(conj ? 'conj' : 'today'); };
  setLeaveGuard(() => { if (!inRound) return false; inRound = false; setLeaveGuard(null); return false; });

  const finish = () => {
    inRound = false;
    State.snapshot(allIds());
    box.replaceChildren(summary());
    window.scrollTo(0, 0);
  };
  const summary = () => {
    const after = course();
    const passed = after.current > stageBefore ? after.stages[stageBefore] : null;
    const ids = conj ? conjIds() : inPlay().ids;
    const left = conj
      ? new Round(ids, { practice, exclude: session.asked, pace: conjPace(), newKey: 'newC', capNew: true, groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.rung, size: conjSize({ practice }) })
      : new Round(ids, { practice, exclude: session.asked, pace: pace(), groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.stage, size: sitting().size });
    const bySkill = Object.entries(tally).map(([s, v]) => `${t(s)} ${v.ok}/${v.n}`).join(' · ');
    return h('section', { class: 'card summary' },
      h('p', { class: 'eyebrow' }, practice ? t('recallDone') : t('roundDone')),
      h('p', { class: 'bignum' }, `${right}`, h('span', { class: 'note', style: 'font-family:var(--ui);font-size:1.1rem;margin-left:8px' }, t('outOf', { r: '', n: done }).trim())),
      newToday.size ? h('p', {}, `${newToday.size} mot${newToday.size === 1 ? '' : 's'} nouveau${newToday.size === 1 ? '' : 'x'} : `, h('b', { class: 'fr' }, [...newToday].slice(0, 12).map(typo).join(' · '))) : null,
      h('p', { class: 'note' }, bySkill),
      passed ? h('div', { class: 'gpoint' }, h('p', { class: 'eyebrow' }, t('passed')), h('p', {}, `${passed.title} : ${passed.can}`), after.stages[after.current] ? h('p', { class: 'note' }, `Ensuite : ${after.stages[after.current].title}.`) : null) : null,
      left.empty ? h('p', { class: 'note' }, nextDueLine(State.nextDue(ids))) : h('button', { class: 'btn primary wide', type: 'button', style: 'margin-top:12px', onclick: () => (conj ? startConjRound({ practice }) : startRound({ practice })) }, t('again')),
      h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:10px', onclick: leave }, t('done')));
  };

  const ask = () => {
    const id = round.next();
    if (!id) { finish(); return; }
    const it = D().byId.get(id);
    session.asked.add(id);
    const onAnswer = (ok, { selfRated = false } = {}) => {
      done++; if (ok) right++;
      const s = SKILL[it.k] || 'other';
      tally[s] = tally[s] || { n: 0, ok: 0 };
      tally[s].n++; if (ok) tally[s].ok++;
      const isNew = !State.card(id);
      State.answer(id, ok, { practice: practice || round.extra.has(id), known: round.spotSet.has(id) || likelyKnown(it) });
      if (isNew && it.i != null && ['word-read', 'word-listen', 'word-pick', 'word-say'].includes(it.k)) newToday.add(D().words[it.i].d || D().words[it.i].w);
      if (selfRated) { const cd = State.card(id); if (cd) { cd.self = (cd.self || 0) + 1; State.save(); } }
      (ok ? correct : wrong)();
      flash(ok ? 'right' : 'wrong');
      paint();
    };
    const showQuestion = () => {
      box.replaceChildren(renderQuestion(it, { onAnswer, onNext: ask, practice }));
      window.scrollTo(0, 0);
      paint();
    };
    // Teach before testing: a new word, an expression, or the first drill of a conjugation step
    // gets a short card first (teach.js). It is not a question: nothing is scored or counted.
    const intro = introFor(it, round, showQuestion);
    if (intro) { box.replaceChildren(intro); window.scrollTo(0, 0); paint(); } else showQuestion();
  };
  ask();
  return [h('div', { class: 'roundbar' }, iconBtn('close', t('close'), leave), h('div', { class: 'progress', role: 'progressbar', 'aria-label': 'Progression de la série' }, prog), count), box];
}
function nextDueLine(when) {
  if (!when) return 'Tu es à jour.';
  const ms = when - now();
  const mins = Math.ceil(ms / 60e3);
  if (mins <= 1) return 'La prochaine révision arrive dans un instant.';
  if (mins < 60) return `La prochaine révision arrive dans ${mins} minutes.`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `La prochaine révision arrive dans environ ${hrs} heure${hrs === 1 ? '' : 's'}.`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'La prochaine révision arrive demain.' : `La prochaine révision arrive dans ${days} jours.`;
}

// ── "Trouver mon niveau" ─────────────────────────────────────────────────
function placementScreen() {
  unlock();
  const pl = new Placement();
  const box = h('main', { class: 'round' });
  const prog = h('i');
  const leave = () => show('today');
  const bar = h('div', { class: 'roundbar' }, iconBtn('close', t('close'), leave), h('div', { class: 'progress' }, prog), h('span', { class: 'note' }, ''));
  const intro = () => box.replaceChildren(h('section', { class: 'card' },
    h('p', { class: 'eyebrow' }, labFull('findLevel')),
    h('h2', {}, 'Where do you stand?'),
    h('p', {}, 'You’ll see about 30 French words, from very common to quite rare. For each one, tap its English meaning.'),
    h('p', {}, h('b', {}, 'Don’t know it? Tap “Je ne sais pas” (I don’t know).'), ' That is completely fine. Nothing is marked against you: a word you miss is simply a word to learn, and it will come back in a later round — possibly in a different kind of question — until it sticks. Please don’t look anything up; a wrong or missing answer helps the app place you properly.'),
    h('p', { class: 'note' }, 'There is no timer. It takes about five minutes. At the end you’ll see an estimate of your vocabulary and where your course will start.'),
    h('button', { class: 'btn primary wide', type: 'button', onclick: ask }, labFull('start'))));
  const ask = () => {
    if (pl.finished) { conclude(); return; }
    const it = pl.pickItem();
    if (!it) { pl.finished = true; conclude(); return; }
    const w = D().words[it.i];
    prog.style.width = `${Math.min(100, (pl.total / pl.maxQuestions) * 100)}%`;
    const c = h('section', { class: 'card qcard' }, skillChip('reading'), h('p', { class: 'prompt' }, labFull('pMean')), h('p', { class: 'tip' }, 'Tap the English meaning of this French word. If you don’t know it, tap “Je ne sais pas” below — that’s fine.'), h('p', { class: 'bigword' }, wordNode(w)));
    const answer = (ok) => {
      pl.record(it, ok);
      State.answer(it.id, ok, { known: ok });
      (ok ? correct : wrong)();
      // Right: straight on. Wrong or "I don't know": show what it means and wait for a tap — the
      // check should teach as well as measure, and nothing here moves on while there is something to read.
      if (ok) { setTimeout(ask, 350); return; }
      box.replaceChildren(h('section', { class: 'card qcard' },
        h('p', { class: 'eyebrow' }, 'That one means…'),
        wordCard(it.i, { example: false }),
        h('p', { class: 'tip soft' }, 'No problem — that’s what the check is for. This word will come back in a later round, so you’ll get another go.'),
        h('div', { class: 'dock' }, h('button', { class: 'btn primary wide', type: 'button', onclick: ask }, labFull('next')))));
      window.scrollTo(0, 0);
    };
    const ch = choices(it.options, w.g, (ok) => { dk.remove(); answer(ok); });
    const dk = h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:12px', onclick: () => { ch.classList.add('locked'); dk.remove(); answer(false); } }, labFull('dontKnow'));
    c.prepend(h('div', { class: 'qhead' }, c.querySelector('.skill'), readQuestionButton(c)));
    c.append(ch, dk);
    box.replaceChildren(c);
    autoRead(c);
    window.scrollTo(0, 0);
  };
  const conclude = () => {
    const res = pl.result();
    State.data.placement = { at: now(), floor: res.floor, size: res.size, asked: res.asked, proportions: res.proportions };
    State.data.maxStage = Math.max(State.data.maxStage || 0, res.floor);
    State.save();
    const d = D();
    box.replaceChildren(h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, labFull('result')),
      h('p', { class: 'bignum' }, `≈ ${res.size.toLocaleString('en-CA')}`),
      h('p', {}, 'words, going by your answers — an estimate to within a few hundred, not a measurement.'),
      res.floor ? h('p', {}, `Your course starts at stage ${res.floor + 1}: “${d.stages[Math.min(res.floor, d.stages.length - 1)].title}” (${d.stages[Math.min(res.floor, d.stages.length - 1)].en}). The stages before it are assumed known; you’ll only get an occasional quick check from them, to keep that honest.`) : h('p', {}, 'The course starts at the beginning — and it will move quickly: anything you already know goes straight into spaced review the first time you get it right.'),
      h('p', { class: 'note' }, 'Every word you missed is now on its way back: you’ll see it again in a later round.'),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, (res.size / d.words.length) * 100)}%` })),
      h('p', { class: 'note' }, `Sur les ${d.words.length.toLocaleString('fr-CA')} mots de la liste.`),
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => show('today') }, labFull('start'))));
  };
  intro();
  return [bar, box];
}

// ── settings ─────────────────────────────────────────────────────────────
function settingsScreen() {
  const s = S();
  const row = (label, note, control) => h('div', { class: 'srow' }, h('div', {}, h('div', { class: 'slabel' }, label), note ? h('div', { class: 'note' }, note) : null), control);
  const toggle = (key, on, onchange) => {
    const b = h('button', { class: 'toggle' + (on ? ' on' : ''), type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false',
      onclick: () => { const v = !(b.getAttribute('aria-checked') === 'true'); s[key] = v; State.save(); b.setAttribute('aria-checked', v ? 'true' : 'false'); b.classList.toggle('on', v); onchange?.(v); } }, h('span', { class: 'knob' }));
    return b;
  };
  const seg = (key, options, onchange) => {
    const wrap = h('div', { class: 'seg' });
    for (const [val, label] of options) wrap.append(h('button', { type: 'button', 'aria-pressed': (s[key] || options[0][0]) === val ? 'true' : 'false', onclick: () => {
      s[key] = val; State.save(); for (const b of wrap.children) b.setAttribute('aria-pressed', 'false'); wrap.querySelector(`[data-v="${val}"]`).setAttribute('aria-pressed', 'true'); onchange?.(val);
    }, 'data-v': val }, label));
    return wrap;
  };
  const vi = frVoiceInfo();
  return [header(t('settings'), { backBtn: true }), h('main', {},
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('look')),
      h('div', { class: 'swatches' }, ...Object.entries(THEMES).map(([k, th]) => h('button', { class: 'swatch', type: 'button', 'aria-pressed': (s.theme || 'fleurdelise') === k ? 'true' : 'false',
        style: `background:${k === 'montreal' ? '#F4F1EA' : '#fff'};color:#0C1A33`,
        onclick: (e) => { s.theme = k; State.save(); applyLook(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } },
        h('i', {}, ...th.bars.map((c) => h('b', { style: `background:${c}` }))), th.name, h('div', { style: 'font-weight:400;font-size:.75rem;opacity:.7' }, th.sub)))),
      row(t('scheme'), null, seg('scheme', [['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]], applyLook)),
      row(t('language'), t('fadeNote'), seg('lang', [['fade', t('fade')], ['both', t('bilingual')], ['fr', t('french')], ['en', t('english')]], () => { applyLook(); refreshTabLabels(); repaint(); })),
      h('button', { class: 'btn ghost wide', type: 'button', style: 'margin:10px 0', onclick: () => { resetFade(); State.save(); refreshTabLabels(); toast(t('englishBack')); } }, t('showEnglish'), h('small', { class: 'sub', style: 'margin-left:8px' }, `${fadeStats().quiet} / ${fadeStats().total}`)),
      row(t('bigText'), null, toggle('big', !!s.big, applyLook)),
      row(t('spacing'), 'Plus d’air entre les lettres et les lignes.', toggle('dys', !!s.dys, applyLook)),
      row('Une seule police, sans empattements', 'Met le français dans la même police simple que le reste, au lieu de la police à empattements.', toggle('plain', !!s.plain, applyLook))),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('readAloud')),
      h('p', { class: 'note' }, 'Every question has an “À voix haute” (Aloud) button and a speaker beside each choice. Auto-read says the question for you the moment it appears; tap anything and it stops. It uses your phone’s own voices.'),
      row(lab('autoRead'), null, seg('autoRead', [['off', t('off')], ['q', t('readQ')], ['qc', t('readQC')]], () => { cancelReading(); toast(t('readAloud')); })),
      row(lab('readFeedback'), 'After you answer: whether you were right, the right answer, the sentence and its translation.', toggle('readFeedback', !!s.readFeedback)),
      row(lab('showSpeakers'), null, toggle('showSpeakers', s.showSpeakers !== false)),
      row(lab('speechRate'), null, h('div', { class: 'seg', style: 'margin:0' }, ...[[0.8, t('slow')], [0.95, t('normal')], [1.1, t('fast')]].map(([v, label]) => h('button', { type: 'button', 'aria-pressed': (s.rate || 0.95) === v ? 'true' : 'false', onclick: (e) => { s.rate = v; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); unlock(); speakQueue([{ text: 'Bonjour, voici ma voix.', lang: 'fr' }]); } }, label)))),
      h('div', { class: 'srow col', style: 'border:0' }, h('button', { class: 'btn ghost wide', type: 'button', onclick: () => { unlock(); speakQueue([{ text: 'Bonjour, voici ma voix.', lang: 'fr' }, { text: 'And this is the English voice.', lang: 'en' }]); } }, h('span', { html: ICON.speaker }), t('testVoices')))),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('soundsVoices')),
      row(t('voice'), 'Quelle voix joue d’abord pour les mots. « Les deux » alterne : on entend le français des deux côtés.', seg('voice', [['qc', t('voiceQc')], ['fr', t('voiceFr')], ['both', t('voiceBoth')]])),
      row(t('sound'), 'De petits sons quand tu réponds.', toggle('sound', s.sound !== false, (v) => setSoundOn(v))),
      row(t('speakOn'), 'Si tu coupes, les questions où tu dois parler sont mises de côté.', toggle('quietOff', !s.quiet, (v) => { s.quiet = !v; State.save(); })),
      asrSupported() ? row('Laisser le téléphone vérifier ce que je dis', 'Active la reconnaissance vocale du navigateur : ta voix est alors envoyée au fabricant du navigateur pour être transcrite — la seule chose de cette app qui quitte ton téléphone. Désactivé par défaut.', toggle('asr', s.asr === true)) : null,
      h('p', { class: 'note', style: 'margin-top:10px' }, `Voix du téléphone — Québec : ${vi.qc || 'aucune (la voix de France est utilisée)'} · France : ${vi.fr || 'aucune'}.`)),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('rhythm')),
      row(lab('teachNew'), 'A short card before a new word or expression is first asked: its meaning, sound, examples and, for a verb, its present tense and which form each example uses. (Conjugation lessons are always shown.)', toggle('teachNew', s.teachNew !== false)),
      h('div', { class: 'srow col' }, h('div', { class: 'slabel' }, t('sitting')), h('div', { class: 'seg' }, ...Object.entries(SITTINGS).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': (SITTINGS[k] === sitting()) ? 'true' : 'false', onclick: (e) => { s.sitting = k; s.sittingChosen = true; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, v.label)))),
      h('div', { class: 'srow col' }, h('div', { class: 'slabel' }, t('pace')), h('div', { class: 'note' }, 'Ce que tu choisis, c’est le nombre de nouveautés ; les révisions arrivent quand elles sont dues.'),
        h('div', { class: 'seg' }, ...Object.entries(PACES).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': (s.pace || 'steady') === k ? 'true' : 'false', onclick: (e) => { s.pace = k; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, v.label))))),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('yourProgress')),
      h('p', { class: 'note' }, 'Tout ce que tu as appris est gardé dans le navigateur de ce téléphone, et nulle part ailleurs. C’est privé, et ça veut dire qu’effacer les données du site l’effacerait. Garde une copie quelque part.'),
      h('div', { style: 'display:grid;gap:10px;margin-top:10px' },
        h('button', { class: 'btn wide', type: 'button', onclick: backupProgress }, h('span', { html: ICON.download }), t('saveCopy')),
        h('label', { class: 'btn wide', style: 'cursor:pointer' }, t('restore'), h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: (e) => { const f = e.target.files?.[0]; if (f) restoreProgress(f, (m) => toast(m, 4200)); } })))),
    storageCard(),
    standalone() || State.data.installed ? h('p', { class: 'note centre' }, '✓ ', t('installed')) : h('button', { class: 'btn wide', type: 'button', style: 'margin-bottom:10px', onclick: installApp }, h('span', { html: ICON.download }), t('install')),
    h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-bottom:10px', onclick: guideSheet }, 'How Jasette works · Comment ça marche'),
    h('button', { class: 'btn ghost wide', type: 'button', onclick: () => show('about') }, t('about')),
    h('p', { class: 'note centre', style: 'margin-top:16px' }, `Version ${VERSION.v}${VERSION.date ? ` · ${VERSION.date}` : ''}${VERSION.commit ? ` · ${VERSION.commit}` : ''}. Rien n’est envoyé nulle part, pas même ce que dit le microphone.`))];
}

// ── boot ─────────────────────────────────────────────────────────────────
async function boot() {
  State.load();
  applyLook();
  initSpeech();
  setSoundOn(S().sound !== false);
  onSpeaking((on) => document.documentElement.classList.toggle('speaking', on));
  try {
    await Promise.all([loadDeck().then(indexDeck), loadAudioIndex()]);
  } catch (err) {
    document.getElementById('app').replaceChildren(h('main', {}, h('section', { class: 'card' }, h('h2', {}, 'La liste de mots n’a pas chargé'), h('p', {}, String(err.message)))));
    return;
  }
  route('today', homeScreen);
  route('course', courseScreen);
  route('conj', () => conjScreen({ header, start: startConjRound, refresh: repaint, openLesson: (n) => sheet(lessonCard(n, () => closeSheet(), { replay: true })) }));
  route('words', wordsScreen);
  route('progress', progressScreen);
  route('settings', settingsScreen, { tabs: false });
  route('about', aboutScreen, { tabs: false });
  route('placement', placementScreen, { tabs: false });
  route('round', roundScreen, { tabs: false });
  route('empty', emptyScreen, { tabs: false });
  // For working on it: ?debug exposes the deck and a way to open any one question.
  if (new URLSearchParams(location.search).has('debug')) {
    route('q', ({ id } = {}) => [header('question'), h('main', {}, renderQuestion(D().byId.get(id), { onAnswer() {}, onNext: () => show('today'), practice: true }))], { tabs: false });
    window.J = { D, State, show, ask: (id) => show('q', { id }), kinds: () => [...new Set(D().items.map((i) => i.k))] };
    // J.sweep(): render the first question of every kind (and a handful more of each) and report
    // anything that looks wrong: a stray "null"/"undefined" in the text, no read button, no way to answer.
    // J.teach(): render every lesson, every expression card and a sample of new-word cards (verbs
    // included) and report stray text, an empty card, or a lesson table with no rows.
    // J.card('word', i) / J.card('expr', n) / J.card('lesson', n): put one teaching card on screen to look at.
    window.J.card = (kind, n) => {
      const node = kind === 'word' ? wordIntro({ i: n }, () => {}) : kind === 'expr' ? exprIntro({ x: n }, () => {}) : lessonCard(n, () => {});
      document.querySelector('main')?.replaceChildren(node);
      window.scrollTo(0, 0);
    };
    window.J.teach = () => {
      const bad = [];
      let n = 0;
      const look = (what, el, { minTables = 0 } = {}) => {
        n++;
        const text = el.textContent;
        const stray = text.match(/\b(null|undefined|NaN)\b|\[object/);
        if (stray) bad.push(`${what}: stray text "${stray[0]}"`);
        if (text.length < 60) bad.push(`${what}: nearly empty`);
        if (el.querySelectorAll('table').length < minTables) bad.push(`${what}: expected ${minTables} table(s), has ${el.querySelectorAll('table').length}`);
      };
      for (const [k, r] of D().conjLadder.entries()) look('lesson ' + r.id, lessonCard(k, () => {}), { minTables: r.teach.model != null ? 1 : 0 });
      for (const k of D().expressions.keys()) look('expression ' + D().expressions[k].id, exprIntro({ x: k }, () => {}));
      const words = D().words.map((w, i) => ({ w, i })).filter(({ w }) => w.k === 'v' || w.k === 'n');
      for (const { i } of [...words.filter(({ w }) => w.k === 'v').slice(0, 60), ...words.filter(({ w }) => w.k === 'n').slice(0, 30)]) look('word ' + D().words[i].w, wordIntro({ i }, () => {}));
      return { checked: n, problems: bad };
    };
    window.J.sweep = async (per = 3) => {
      const bad = [];
      let n = 0;
      for (const k of window.J.kinds()) {
        for (const it of D().items.filter((i) => i.k === k).slice(0, per)) {
          window.J.ask(it.id); await new Promise((r) => setTimeout(r, 120));
          const card = document.querySelector('.qcard'); n++;
          if (!card) { bad.push(`${it.id}: no card`); continue; }
          const stray = card.textContent.match(/\b(null|undefined|NaN)\b|\[object/);
          if (stray) bad.push(`${it.id}: stray text "${stray[0]}"`);
          if (!card.querySelector('.readq')) bad.push(`${it.id}: no read-aloud button`);
          if (!card.querySelector('.choice, .tile, .btn, .play')) bad.push(`${it.id}: nothing to answer with`);
        }
      }
      return { checked: n, problems: bad };
    };
  }
  buildTabs();
  onScreen((name, tabs) => { syncTabs(name, tabs); State.save(); });
  document.addEventListener('pointerdown', () => unlock(), { once: true });
  watchForUpdates();
  show('today', null, { replace: true });
}
boot();
