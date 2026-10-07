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
import { loadAudioIndex, onAudio, allBundledUrls, bundledCount, stopAudio } from './audio.js';
import { State, Round, cardState, dayKey, newLeftToday, now, DAY, shuffle } from './schedule.js';
import { loadDeck, indexDeck, D, SKILL, allIds } from './deck.js';
import { t, sub, setMode, setUi, resetFade, fadeStats } from './strings.js';
import { press as tick, right as correct, wrong, setSound as setSoundOn } from './sound.js';
import { asrSupported } from './asr.js';
import { S, wordNode, wordCard, playBtn, wordVoices, sentenceBlock, qcIcon, voicePref, afterCard, choices, lab } from './parts.js';
import { renderQuestion, skillChip } from './questions.js';
import { SITTINGS, PACES, sitting, pace, noSpeaking, course, floorStage, inPlay, wordStates, isMet, likelyKnown } from './core.js';
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
}
mq?.addEventListener?.('change', () => { applyLook(); });

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
        run > 1 ? h('p', { class: 'note', style: 'margin:12px 0 0' }, h('span', { html: ICON.flame, style: 'display:inline-flex;width:16px;vertical-align:-3px;color:var(--accent2)' }), ` ${run} ${t('daysRun')}`) : null),
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
  const { round, practice } = arg;
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
  const leave = () => { inRound = false; setLeaveGuard(null); show('today'); };
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
    const { ids } = inPlay();
    const left = new Round(ids, { practice, exclude: session.asked, pace: pace(), groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.stage, size: sitting().size });
    const bySkill = Object.entries(tally).map(([s, v]) => `${t(s)} ${v.ok}/${v.n}`).join(' · ');
    return h('section', { class: 'card summary' },
      h('p', { class: 'eyebrow' }, practice ? t('recallDone') : t('roundDone')),
      h('p', { class: 'bignum' }, `${right}`, h('span', { class: 'note', style: 'font-family:var(--ui);font-size:1.1rem;margin-left:8px' }, t('outOf', { r: '', n: done }).trim())),
      newToday.size ? h('p', {}, `${newToday.size} mot${newToday.size === 1 ? '' : 's'} nouveau${newToday.size === 1 ? '' : 'x'} : `, h('b', { class: 'fr' }, [...newToday].slice(0, 12).map(typo).join(' · '))) : null,
      h('p', { class: 'note' }, bySkill),
      passed ? h('div', { class: 'gpoint' }, h('p', { class: 'eyebrow' }, t('passed')), h('p', {}, `${passed.title} : ${passed.can}`), after.stages[after.current] ? h('p', { class: 'note' }, `Ensuite : ${after.stages[after.current].title}.`) : null) : null,
      left.empty ? h('p', { class: 'note' }, nextDueLine(State.nextDue(ids))) : h('button', { class: 'btn primary wide', type: 'button', style: 'margin-top:12px', onclick: () => startRound({ practice }) }, t('again')),
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
    box.replaceChildren(renderQuestion(it, { onAnswer, onNext: ask, practice }));
    window.scrollTo(0, 0);
    paint();
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
    h('p', { class: 'eyebrow' }, t('findLevel')),
    h('h2', {}, lab('whereAreYou')),
    h('p', {}, 'Une trentaine de mots, des plus courants aux plus rares. Réponds à ceux que tu connais ; touche « Je ne sais pas » pour les autres, sans te forcer. On en tire une estimation, et on ne te redemandera pas ce que tu sais déjà.'),
    h('p', { class: 'note' }, 'Aucun chrono. Environ cinq minutes.'),
    h('button', { class: 'btn primary wide', type: 'button', onclick: ask }, t('start'))));
  const ask = () => {
    if (pl.finished) { conclude(); return; }
    const it = pl.pickItem();
    if (!it) { pl.finished = true; conclude(); return; }
    const w = D().words[it.i];
    prog.style.width = `${Math.min(100, (pl.total / pl.maxQuestions) * 100)}%`;
    const c = h('section', { class: 'card qcard' }, skillChip('reading'), h('p', { class: 'prompt' }, t('pMean')), h('p', { class: 'bigword' }, wordNode(w)));
    const answer = (ok) => {
      pl.record(it, ok);
      State.answer(it.id, ok, { known: ok });
      (ok ? correct : wrong)();
      setTimeout(ask, ok ? 350 : 700);
    };
    const ch = choices(it.options, w.g, (ok) => { dk.remove(); answer(ok); });
    const dk = h('button', { class: 'btn ghost wide', type: 'button', style: 'margin-top:12px', onclick: () => { ch.classList.add('locked'); dk.remove(); answer(false); } }, t('dontKnow'));
    c.append(ch, dk);
    box.replaceChildren(c);
    window.scrollTo(0, 0);
  };
  const conclude = () => {
    const res = pl.result();
    State.data.placement = { at: now(), floor: res.floor, size: res.size, asked: res.asked, proportions: res.proportions };
    State.data.maxStage = Math.max(State.data.maxStage || 0, res.floor);
    State.save();
    const d = D();
    box.replaceChildren(h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, lab('result')),
      h('p', { class: 'bignum' }, `≈ ${res.size.toLocaleString('fr-CA')}`),
      h('p', {}, 'mots, d’après tes réponses. C’est une estimation à quelques centaines près, pas une mesure.'),
      res.floor ? h('p', {}, `On part de l’étape ${res.floor + 1} : « ${d.stages[Math.min(res.floor, d.stages.length - 1)].title} ». Ce qui est avant, on ne te le pose que de temps en temps, pour vérifier.`) : h('p', {}, 'On commence par le début, et ça ira vite : tout ce que tu sais déjà passe en révision espacée dès la première bonne réponse.'),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, (res.size / d.words.length) * 100)}%` })),
      h('p', { class: 'note' }, `Sur les ${d.words.length.toLocaleString('fr-CA')} mots de la liste.`),
      h('button', { class: 'btn primary wide', type: 'button', onclick: () => show('today') }, t('start'))));
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
  const dl = h('div', {});
  const downloadAll = async (btn) => {
    const urls = allBundledUrls();
    if (!urls.length) { toast('Aucun enregistrement n’est fourni avec cette copie.'); return; }
    btn.disabled = true;
    const bar = h('div', { class: 'dlbar' }, h('i')); const txt = h('p', { class: 'note' }, '');
    dl.append(bar, txt);
    let n = 0, fail = 0;
    const q = urls.slice();
    const worker = async () => { while (q.length) { const u = q.shift(); try { const r = await fetch(u); if (!r.ok) fail++; else await r.arrayBuffer(); } catch { fail++; } n++; bar.firstChild.style.width = `${(n / urls.length) * 100}%`; txt.textContent = `${n} / ${urls.length}`; } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    txt.textContent = fail ? `Terminé : ${urls.length - fail} gardés, ${fail} introuvables.` : `Terminé : les ${urls.length} enregistrements sont gardés sur ce téléphone.`;
    btn.disabled = false;
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
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('soundsVoices')),
      row(t('voice'), 'Quelle voix joue d’abord pour les mots. « Les deux » alterne : on entend le français des deux côtés.', seg('voice', [['qc', t('voiceQc')], ['fr', t('voiceFr')], ['both', t('voiceBoth')]])),
      row(t('sound'), 'De petits sons quand tu réponds.', toggle('sound', s.sound !== false, (v) => setSoundOn(v))),
      row(t('speakOn'), 'Si tu coupes, les questions où tu dois parler sont mises de côté.', toggle('quietOff', !s.quiet, (v) => { s.quiet = !v; State.save(); })),
      asrSupported() ? row('Laisser le téléphone vérifier ce que je dis', 'Active la reconnaissance vocale du navigateur : ta voix est alors envoyée au fabricant du navigateur pour être transcrite — la seule chose de cette app qui quitte ton téléphone. Désactivé par défaut.', toggle('asr', s.asr === true)) : null,
      h('p', { class: 'note', style: 'margin-top:10px' }, `Voix du téléphone — Québec : ${vi.qc || 'aucune (la voix de France est utilisée)'} · France : ${vi.fr || 'aucune'}.`)),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('rhythm')),
      h('div', { class: 'srow col' }, h('div', { class: 'slabel' }, t('sitting')), h('div', { class: 'seg' }, ...Object.entries(SITTINGS).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': (s.sitting || 'long') === k ? 'true' : 'false', onclick: (e) => { s.sitting = k; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, v.label)))),
      h('div', { class: 'srow col' }, h('div', { class: 'slabel' }, t('pace')), h('div', { class: 'note' }, 'Ce que tu choisis, c’est le nombre de nouveautés ; les révisions arrivent quand elles sont dues.'),
        h('div', { class: 'seg' }, ...Object.entries(PACES).map(([k, v]) => h('button', { type: 'button', 'aria-pressed': (s.pace || 'steady') === k ? 'true' : 'false', onclick: (e) => { s.pace = k; State.save(); for (const b of e.currentTarget.parentElement.children) b.setAttribute('aria-pressed', 'false'); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, v.label))))),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('yourProgress')),
      h('p', { class: 'note' }, 'Tout ce que tu as appris est gardé dans le navigateur de ce téléphone, et nulle part ailleurs. C’est privé, et ça veut dire qu’effacer les données du site l’effacerait. Garde une copie quelque part.'),
      h('div', { style: 'display:grid;gap:10px;margin-top:10px' },
        h('button', { class: 'btn wide', type: 'button', onclick: backupProgress }, h('span', { html: ICON.download }), t('saveCopy')),
        h('label', { class: 'btn wide', style: 'cursor:pointer' }, t('restore'), h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: (e) => { const f = e.target.files?.[0]; if (f) restoreProgress(f, (m) => toast(m, 4200)); } })))),
    h('section', { class: 'card' },
      h('h2', { style: 'font-size:1.2rem;margin-bottom:8px' }, lab('offline')),
      h('p', { class: 'note' }, `${bundledCount().toLocaleString('fr-CA')} enregistrements sont fournis avec l’app. Ils se gardent d’eux-mêmes quand tu les écoutes ; ce bouton les prend tous d’un coup, pour travailler sans réseau.`),
      h('button', { class: 'btn wide', type: 'button', style: 'margin-top:8px', onclick: (e) => downloadAll(e.currentTarget) }, h('span', { html: ICON.download }), t('downloadAudio')), dl),
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
  }
  buildTabs();
  onScreen((name, tabs) => { syncTabs(name, tabs); State.save(); });
  document.addEventListener('pointerdown', () => unlock(), { once: true });
  watchForUpdates();
  show('today', null, { replace: true });
}
boot();
