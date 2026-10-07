// Jasette — pieces shared by the questions and the browsing screens.

import { h, typo, ICON } from './ui.js';
import { State, shuffle } from './schedule.js';
import { D, examplesOf } from './deck.js';
import { unlock, say, available as speechAvailable } from './speech.js';
import { playWord, playSentence, playCanadian, stopAudio, wordClip, canadianClip } from './audio.js';
import { t, sub, gloss, STRINGS } from './strings.js';
import { reassurance } from './help.js';

export const S = () => State.data.settings;
// A phrase of the interface: the French, with its English beneath while it is still new to you,
// and always in the tooltip (long-press) once the English has gone quiet.
// The same, but the English is always there: for the level check, where the instructions must be understood.
export function labFull(key, v) {
  const e = STRINGS[key];
  return h('span', { class: 'lab', title: e ? e[1] : null }, t(key, v), e ? h('small', { class: 'sub' }, e[1]) : null);
}
export function lab(key, v) {
  const s = sub(key, v);
  return h('span', { class: 'lab', title: gloss(key, v) || null }, t(key, v), s ? h('small', { class: 'sub' }, s) : null);
}
export const voicePref = () => S().voice || 'qc';

// ── how a word is shown ──────────────────────────────────────────────────
// A noun is shown with its article — un chat, une maison — because a noun
// learnt bare is a noun whose gender will be wrong in the middle of a sentence.
export const artOf = (w) => (w.k === 'n' ? (w.gen || w.g2) : null);
export const articleFor = (w) => { const g = artOf(w); return g === 'm' ? 'un' : g === 'f' ? 'une' : null; };
export function wordNode(w, { big = false } = {}) {
  if (w.d) return typo(w.d);
  const a = articleFor(w);
  return a ? [h('span', { class: 'art' }, a), ' ', typo(w.w)] : typo(w.w);
}
export const plainWord = (w) => w.d || w.w;

// The Québec and France marks, small.
// Read this prose aloud, in English (the phone's voice). Robert is dyslexic: anything
// text-heavy gets a speaker. The French in a note is read by the same English
// voice, so for the sound of a French word use its own play button.
export function readBtn(text) {
  if (!speechAvailable()) return null;
  const b = h('button', { class: 'readbtn', type: 'button', 'aria-label': 'Lire à voix haute', title: 'Lire à voix haute', html: ICON.speaker,
    onclick: () => { unlock(); b.classList.add('on'); say(String(text).replace(/\s+/g, ' '), { onend: () => b.classList.remove('on') }); } });
  return b;
}
export const qcIcon = () => h('span', { class: 'qcmark', html: ICON.fleur });
export const frIcon = () => h('span', { html: ICON.flagfr, style: 'display:inline-flex;width:18px' });

// ── audio buttons ────────────────────────────────────────────────────────
// A play button that says what it is playing: a person, or a machine voice.
export function voiceNote(d) {
  if (!d) return '';
  const where = d.accent === 'qc' ? 'Québec' : 'France';
  if (d.kind === 'recording') return `${where} · ${d.by || ''}${d.place ? ' (' + d.place + ')' : ''}`;
  if (d.kind === 'machine') return `${where} · voix de synthèse du téléphone`;
  return '';
}
export function playBtn({ label = null, play, big = false, autoplay = false, accent = null, note = null }) {
  const ico = h('span', { class: 'ico', html: ICON.play });
  const txt = h('span', {}, label || t('play'), accent ? h('small', {}, accent === 'qc' ? 'Québec' : 'France') : null);
  const b = h('button', { class: 'play' + (big ? ' big' : ''), type: 'button', 'aria-label': label || t('play') }, ico, txt);
  const go = async () => {
    unlock();
    b.classList.add('on');
    let d = null;
    try { d = await play(() => b.classList.remove('on')); } catch { /* fall through */ }
    if (!d || d.kind === 'none') b.classList.remove('on');
    if (note && d) note.textContent = voiceNote(d);
  };
  b.addEventListener('click', go);
  if (autoplay) setTimeout(go, 260);
  return b;
}
// The two accents of one word, side by side.
export function wordVoices(w, i, { note = null } = {}) {
  const row = h('div', { class: 'voices' });
  const have = { qc: !!w.qcA, fr: !!w.fr };
  const mk = (accent) => playBtn({ label: accent === 'qc' ? 'Québec' : 'France', play: (end) => playWord(w, i, { only: accent, onend: end }), note });
  // A word with no recording in either accent still gets one button: the phone's voice.
  if (have.qc) row.append(mk('qc'));
  if (have.fr) row.append(mk('fr'));
  if (!have.qc && !have.fr) row.append(playBtn({ label: t('play'), play: (end) => playWord(w, i, { pref: voicePref(), onend: end }), note }));
  return row;
}
export function sentenceBtn(ex, { label = null, big = false, autoplay = false, note = null } = {}) {
  return playBtn({
    label: label || t('listenAgain'), big, autoplay, note,
    play: (end) => playSentence({ sid: ex.id ?? ex.sid, text: ex.t ?? ex.text, by: ex.by, qc: !!ex.qc, hasAudio: !!(ex.a ?? ex.audio) }, { onend: end }),
  });
}

// ── sentences ────────────────────────────────────────────────────────────
export function creditLine(sid, hasAudio) {
  const meta = D().sentAudio?.[sid];
  const bits = [`Phrase Tatoeba n° ${sid}`];
  if (hasAudio && meta) bits.push(`voix : ${meta.by} (${meta.lic})`);
  return h('p', { class: 'evidence' }, bits.join(' · '));
}
export function sentenceBlock({ text, eng, sid = null, hasAudio = false, qc = false, by = null }, { play = true, note = null } = {}) {
  const wrap = h('div', { class: 'sentence' },
    h('p', { class: 'fr-s' }, typo(text)),
    eng ? h('p', { class: 'en-s' }, eng) : null);
  if (play) {
    const n = h('p', { class: 'note' });
    wrap.append(h('div', { class: 'voices' }, sentenceBtn({ id: sid, t: text, qc, a: hasAudio, by }, { label: t('play'), note: n })), n);
  }
  if (sid) wrap.append(creditLine(sid, hasAudio));
  return wrap;
}

// ── the word card ────────────────────────────────────────────────────────
export function ipaLine(w) {
  const bits = [];
  if (w.ipa) bits.push(h('span', {}, 'France ', h('b', {}, w.ipa)));
  if (w.ipaQc) bits.push(h('span', {}, 'Québec ', h('b', {}, w.ipaQc)));
  return bits.length ? h('p', { class: 'ipa' }, bits.flatMap((b, k) => (k ? [' · ', b] : [b]))) : null;
}
export function wordCard(i, { example = true, voices = true } = {}) {
  const d = D();
  const w = d.words[i];
  const ex = examplesOf(i)[0];
  const note = h('p', { class: 'note centre' });
  const notes = d.notesForWord?.get(i) || [];
  const cue = d.cues?.[i];
  return h('div', { class: 'wcard' },
    h('p', { class: 'bigword' }, wordNode(w), w.reg === 'fam' ? h('span', { class: 'reg' }, 'familier') : null, w.reg === 'lit' ? h('span', { class: 'reg' }, 'soutenu') : null),
    ipaLine(w),
    h('p', { class: 'gloss' }, w.g),
    w.alt?.length ? h('p', { class: 'note centre' }, 'aussi : ' + w.alt.join(' ; ')) : null,
    cue ? h('p', { class: 'cue' }, cue) : null,
    w.qc?.length ? h('p', { class: 'note centre' }, h('span', { class: 'qcmark', html: ICON.fleur }), ' ', t('inQuebec'), ' : ', w.qc.join(' ; ')) : null,
    voices ? wordVoices(w, i, { note }) : null,
    voices ? note : null,
    ex && example ? sentenceBlock({ text: ex.t, eng: ex.e, sid: ex.id, hasAudio: !!ex.a, qc: !!ex.qc }) : null,
    notes.length ? h('div', { class: 'gpoint' }, h('h3', {}, notes[0].title, readBtn(notes[0].plain)), h('p', {}, notes[0].plain), notes[0].watch ? h('p', { class: 'watch' }, notes[0].watch) : null,
      h('p', { class: 'evidence' }, 'Les mots et leurs sens viennent des sources ; ce conseil d’emploi est de moi.')) : null);
}

// ── tap-to-fill: the word bank ───────────────────────────────────────────
// Segments of a sentence with a blank between each pair, and a bank of words.
// Tap a word and it drops into the next empty blank; tap a placed word and it
// goes back. A single blank checks as soon as it is filled; several wait for
// "Vérifier", so a slip can be undone first.
export function fillSentence({ segs, answers, bank, onChecked, label = null, hint = null, cap = false }) {
  const n = answers.length;
  const placed = new Array(n).fill(null);                // bank index per slot
  const slots = [], tiles = [];
  const line = h('p', { class: 'sentence-fill' });
  const bankEl = h('div', { class: 'bank' });
  const status = h('div', {});
  let locked = false;
  const show = (s, k) => (k === 0 && cap && s ? s[0].toUpperCase() + s.slice(1) : s);
  const refresh = () => {
    const next = placed.indexOf(null);
    slots.forEach((el, k) => {
      el.classList.toggle('filled', placed[k] != null);
      el.classList.toggle('next', k === next && !locked);
      el.textContent = placed[k] != null ? typo(show(bank[placed[k]], segs[k] === '' ? 0 : 1)) : '';
      el.setAttribute('aria-label', placed[k] != null ? `Blanc ${k + 1} : ${bank[placed[k]]}` : `Blanc ${k + 1}, vide`);
    });
    tiles.forEach((el, j) => el.classList.toggle('used', placed.includes(j)));
    checkBtn.disabled = placed.includes(null);
  };
  const finish = () => {
    locked = true;
    bankEl.classList.add('locked');
    let all = true;
    slots.forEach((el, k) => {
      const ok = bank[placed[k]].toLowerCase() === answers[k].toLowerCase();
      all = all && ok;
      el.classList.remove('filled', 'next');
      el.classList.add(ok ? 'right' : 'wrong');
      el.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'));
    });
    checkBtn.remove();
    onChecked(all, { answers, placed: placed.map((p) => bank[p]) });
  };
  const checkBtn = h('button', { class: 'btn primary wide', type: 'button', onclick: () => { if (!placed.includes(null)) finish(); } }, lab('check'));
  segs.forEach((s, k) => {
    line.append(typo(s));
    if (k < n) {
      const el = h('button', { class: 'slot', type: 'button', 'aria-label': `Blanc ${k + 1}`, onclick: () => {
        if (locked || placed[k] == null) return;
        placed[k] = null; refresh();
      } });
      slots.push(el); line.append(el);
    }
  });
  bank.forEach((word, j) => {
    const tile = h('button', { class: 'tile', type: 'button', onclick: () => {
      if (locked || placed.includes(j)) return;
      const at = placed.indexOf(null);
      if (at < 0) return;
      placed[at] = j; refresh();
      if (n === 1) finish();
    } }, typo(word));
    tiles.push(tile); bankEl.append(tile);
  });
  refresh();
  const out = h('div', {}, label ? h('p', { class: 'note' }, label) : null, line, bankEl, hint, n > 1 ? checkBtn : null, status);
  if (n === 1) checkBtn.remove();
  return out;
}

// Blank one word out of a sentence: returns the segments around it.
export function segmentsAround(text, blank) {
  const esc = blank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // An apostrophe before the blank is fine (j'ai, n'a): the blank is the word, not the elision.
  const re = new RegExp(`(?<![\\p{L}-])${esc}(?![\\p{L}-])`, 'iu');
  const m = re.exec(text);
  if (!m) return null;
  return [text.slice(0, m.index), text.slice(m.index + m[0].length)];
}

// Four buttons, the right one in a random place, and no colour-only feedback:
// right and wrong are marked with a tick and a cross as well.
export function choices(options, answer, onPick, { cls = '', render = null, pair = false } = {}) {
  const wrap = h('div', { class: 'choices' + (pair ? ' pair' : '') });
  for (const o of shuffle([answer, ...options])) {
    const label = render ? render(o) : typo(o);
    const b = h('button', { class: 'choice ' + cls, type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = o === answer;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'));
      if (!ok) for (const other of wrap.children) if (other.dataset.v === answer) { other.classList.add('right'); other.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, '✓')); }
      onPick(ok, o);
    } }, label);
    b.dataset.v = o;
    wrap.append(b);
  }
  return wrap;
}

// What comes after an answer, in one order every time: the verdict in words,
// then the evidence, then the one button that moves you on.
export function afterCard(kids, { onNext, ok = null, answer = null }) {
  const verdict = ok === null ? null : h('p', { class: 'verdict ' + (ok ? 'right' : 'wrong'), role: 'status' },
    h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'),
    h('span', {}, ok ? lab('right') : lab('notQuite'), !ok && answer ? h('span', { class: 'vans' }, h('b', {}, typo(answer))) : null));
  return h('div', { class: 'after' }, verdict, ok === false ? reassurance() : null, ...[].concat(kids).filter(Boolean),
    h('div', { class: 'dock' }, h('button', { class: 'btn primary wide', type: 'button', onclick: onNext }, lab('next'))));
}

export { stopAudio, wordClip, canadianClip, playCanadian };
