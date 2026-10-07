// Jasette — one question, in every kind the deck asks.
//
// Each renderer returns a card. It calls ctx.onAnswer(ok) once, when the answer
// is known, and then shows what came of it with afterCard(): the verdict in
// words, the evidence, and the one button that moves on.

import { h, typo, ICON } from './ui.js';
import { State, shuffle } from './schedule.js';
import { D, wordOf, examplesOf, SELF_RATED } from './deck.js';
import { t, sub } from './strings.js';
import { unlock } from './speech.js';
import { playWord, playSentence, playCanadian, stopAudio, wordClip } from './audio.js';
import { asrSupported, listenFor, matches } from './asr.js';
import { hintFor, tipNode } from './help.js';
import { S, voicePref, wordNode, plainWord, articleFor, playBtn, wordVoices, sentenceBtn, sentenceBlock, wordCard, voiceNote, readBtn, lab, fillSentence, segmentsAround, choices, afterCard, ipaLine, creditLine, qcIcon } from './parts.js';

const prompt = (key, extra = null) => h('p', { class: 'prompt' }, lab(key), extra);
const SKILL_ICON = { listening: 'ear', speaking: 'mic', reading: 'eye', writing: 'pen', grammar: 'puzzle', canada: 'fleur' };
export const skillChip = (skill) => h('span', { class: 'skill' }, h('span', { html: ICON[SKILL_ICON[skill]] || '' }), t(skill));

export function renderQuestion(it, ctx) {
  const el = renderKind(it, ctx);
  const tip = hintFor(it.k);
  const p = el.querySelector?.('.prompt');
  if (tip && p) p.after(tipNode(tip));
  return el;
}
function renderKind(it, ctx) {
  switch (it.k) {
    case 'word-read': return wordRead(it, ctx);
    case 'word-listen': return wordListen(it, ctx);
    case 'word-pick': return wordPick(it, ctx);
    case 'word-say': return wordSay(it, ctx);
    case 'word-cloze': return gapSingle(it, ctx, { key: 'pGap' });
    case 'conj-pick': return gapSingle(it, ctx, { key: 'pForm', cue: conjCue });
    case 'aux-pick': return gapSingle(it, ctx, { key: 'pAux', cue: (q) => `${t('pAux')} ${q.participle}` });
    case 'agree-pick': return gapSingle(it, ctx, { key: 'pAgree' });
    case 'pronoun-pick': return gapSingle(it, ctx, { key: 'pPronoun' });
    case 'homophone-pick': return gapSingle(it, ctx, { key: 'pHomo' });
    case 'fill-multi': return fillMulti(it, ctx);
    case 'sentence-listen': return sentenceListen(it, ctx);
    case 'gender-pick': return genderPick(it, ctx);
    case 'spell-pick': return spellPick(it, ctx);
    case 'sound-pair': return soundPair(it, ctx);
    case 'grammar-build': return grammarBuild(it, ctx);
    case 'note-pick': return notePick(it, ctx);
    case 'qc-mean': return qcMean(it, ctx);
    case 'qc-pick': return qcPick(it, ctx);
    case 'qc-listen': return qcListen(it, ctx);
    case 'qc-oral': return qcOral(it, ctx);
    default: return h('section', { class: 'card' }, h('p', {}, 'Question inconnue.'));
  }
}

const card = (skill, ...kids) => h('section', { class: 'card qcard' }, skillChip(skill), ...kids);
const done = (ctx, ok, { selfRated = false } = {}) => ctx.onAnswer(ok, { selfRated });
const noSound = () => h('p', { class: 'warn' }, 'Ce téléphone n’a pas de voix française : le mot est affiché à la place.');
const cueOf = (i) => D().cues?.[i];

const TENSE_FR = { pr: 'présent', im: 'imparfait', fu: 'futur', co: 'conditionnel', su: 'subjonctif' };
function conjCue(it) {
  const w = D().words[it.i];
  const lemma = w.lem || w.w;
  return `${typo(lemma)} · ${TENSE_FR[it.tense] || ''}`;
}

// ── 1. read a word, know what it means ───────────────────────────────────
function wordRead(it, ctx) {
  const w = wordOf(it);
  const c = card('reading', prompt('pMean'),
    h('p', { class: 'bigword' }, wordNode(w), w.reg === 'fam' ? h('span', { class: 'reg' }, 'familier') : null),
    cueOf(it.i) ? h('p', { class: 'cue' }, cueOf(it.i)) : null);
  c.append(choices(it.options, w.g, (ok) => {
    done(ctx, ok);
    c.append(afterCard([wordCard(it.i)], { ...ctx, ok, answer: w.g }));
  }));
  return c;
}

// ── 2. hear a word, know what it means ───────────────────────────────────
function wordListen(it, ctx) {
  const w = wordOf(it);
  const note = h('p', { class: 'note centre' });
  const c = card('listening', prompt('pHear'),
    h('div', { class: 'voices' }, playBtn({ label: t('listen'), big: true, autoplay: true, note, play: (end) => playWord(w, it.i, { pref: voicePref(), onend: end }) })), note);
  c.append(choices(it.options, w.g, (ok) => {
    done(ctx, ok);
    c.append(afterCard([wordCard(it.i)], { ...ctx, ok, answer: w.g }));
  }));
  return c;
}

// ── 3. meaning in, word out ──────────────────────────────────────────────
function wordPick(it, ctx) {
  const w = wordOf(it);
  const c = card('speaking', prompt('pWhich'), h('p', { class: 'gloss big' }, w.g), cueOf(it.i) ? h('p', { class: 'cue' }, cueOf(it.i)) : null);
  const d = D();
  const render = (o) => { const at = d.wordIndex.get(o); const ww = at != null ? d.words[at] : null; return ww ? [ww.d ? typo(ww.d) : typo(o)] : typo(o); };
  c.append(choices(it.options, w.w, (ok) => {
    done(ctx, ok);
    c.append(afterCard([wordCard(it.i)], { ...ctx, ok, answer: w.d || w.w }));
  }, { cls: 'fr-c', render }));
  return c;
}

// ── 4. see the meaning, say the word ─────────────────────────────────────
// With speech recognition on, the phone hears you and the answer is marked like
// any other. Without it, this is a flashcard you mark yourself — useful, but
// not the same kind of evidence, and the app says so and records it separately.
function wordSay(it, ctx) {
  const w = wordOf(it);
  const checked = asrSupported() && S().asr === true;
  const c = card('speaking', prompt('pSay'), h('p', { class: 'gloss big' }, w.g), cueOf(it.i) ? h('p', { class: 'cue' }, cueOf(it.i)) : null);
  const out = h('div', {});
  const selfRate = (lead) => h('div', {},
    lead ? h('p', { class: 'note' }, lead) : null,
    h('div', { class: 'choices two' },
      h('button', { class: 'choice big-c', type: 'button', onclick: () => { done(ctx, true, { selfRated: true }); out.append(afterCard([], ctx)); } }, t('iKnewIt')),
      h('button', { class: 'choice big-c', type: 'button', onclick: () => { done(ctx, false, { selfRated: true }); out.append(afterCard([], ctx)); } }, t('notYet'))));
  const reveal = (extra) => { out.append(wordCard(it.i)); if (extra) out.append(extra); };
  if (!checked) {
    const btn = h('button', { class: 'btn primary wide', type: 'button', onclick: () => {
      btn.remove(); reveal();
      out.append(selfRate('Toi seul peux entendre si ça y était : c’est donc toi qui notes. La vérification par le téléphone est dans les réglages.'));
    } }, t('showMe'));
    c.append(btn, out);
    return c;
  }
  const listen = h('button', { class: 'btn primary wide', type: 'button', onclick: async () => {
    listen.disabled = true; listen.textContent = '…';
    const res = await listenFor({ lang: voicePref() === 'fr' ? 'fr-FR' : 'fr-CA' });
    listen.remove(); skip.remove();
    if (!res.ok) { reveal(h('p', { class: 'warn' }, res.why)); out.append(selfRate('À toi de noter, cette fois.')); return; }
    const m = matches(w.w, res.heard);
    reveal(h('div', {}, h('p', { class: m.hit ? 'good' : 'warn' }, m.hit ? `J’ai entendu « ${m.on} » — ça y est.` : `J’ai entendu « ${res.heard[0]} » — je n’ai pas trouvé ${w.w}.`),
      h('p', { class: 'note' }, 'Le logiciel est fait pour des phrases de locuteurs natifs : un échec ne prouve pas que tu l’as mal dit, alors c’est toi qui décides.')));
    if (m.hit) { done(ctx, true); out.append(afterCard([], ctx)); } else out.append(selfRate(null));
  } }, [h('span', { html: ICON.mic, style: 'display:inline-flex;width:20px' }), t('sayIt')]);
  const skip = h('button', { class: 'link', type: 'button', onclick: () => { listen.remove(); skip.remove(); reveal(); out.append(selfRate(null)); } }, t('showMe'));
  c.append(listen, skip, out);
  return c;
}

// ── 5. the gap, filled by tapping words in ───────────────────────────────
// One blank, a bank of four. The word drops into place and the answer is
// marked at once. (Several blanks: see fillMulti.)
function gapSingle(it, ctx, { key, cue = null }) {
  const segs = segmentsAround(it.text, it.blank);
  const skill = it.k === 'homophone-pick' ? 'writing' : 'grammar';
  const c = card(skill, prompt(key));
  if (!segs) { c.append(h('p', {}, 'Cette question n’a pas pu s’afficher.')); return c; }
  const cueText = cue ? cue(it) : null;
  if (cueText) c.append(h('p', { class: 'cue' }, cueText));
  c.append(
    fillSentence({
      segs, answers: [it.answer], bank: shuffle([it.answer, ...it.options]), cap: segs[0] === '',
      hint: h('p', { class: 'note' }, it.eng),
      onChecked: (ok) => {
        done(ctx, ok);
        const g = it.gid ? D().grammarById.get(it.gid) : null;
        const set = it.set ? D().homophones?.[it.set] : null;
        c.append(afterCard([
          sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: !!it.audio }),
          set ? h('div', { class: 'gpoint' }, h('p', {}, set.tip)) : null,
          g && !set ? h('div', { class: 'gpoint' }, h('h3', {}, g.title, readBtn(g.plain)), h('p', {}, g.plain), g.watch ? h('p', { class: 'watch' }, g.watch) : null, h('p', { class: 'evidence' }, 'L’explication est de moi ; l’exemple vient de Tatoeba.')) : null,
        ], { ...ctx, ok, answer: it.answer }));
      },
    }));
  return c;
}

// ── 6. several blanks: tap the words into place ──────────────────────────
function fillMulti(it, ctx) {
  const c = card('grammar', prompt('pGaps'), h('p', { class: 'note' }, it.eng));
  c.append(fillSentence({
    segs: it.segs, answers: it.answers, bank: it.bank, cap: it.segs[0] === '',
    onChecked: (ok, r) => {
      done(ctx, ok);
      c.append(afterCard([
        sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: !!it.audio }),
        ok ? null : h('p', { class: 'note' }, 'Les bons mots : ' + it.answers.join(' · ')),
      ], { ...ctx, ok }));
    },
  }));
  return c;
}

// ── 7. a recorded sentence ───────────────────────────────────────────────
function sentenceListen(it, ctx) {
  const note = h('p', { class: 'note centre' });
  const c = card('listening', prompt('pSentence'),
    h('div', { class: 'voices' }, sentenceBtn({ id: it.sid, t: it.text, a: 1, by: it.by }, { label: t('listen'), big: true, autoplay: true, note })), note);
  c.append(choices(it.options, it.eng, (ok) => {
    done(ctx, ok);
    c.append(afterCard([sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: true, by: it.by }, { play: false })], { ...ctx, ok, answer: it.eng }));
  }));
  return c;
}

// ── 8. un or une ─────────────────────────────────────────────────────────
function genderPick(it, ctx) {
  const w = wordOf(it);
  const c = card('grammar', prompt('pGender'), h('p', { class: 'bigword' }, typo(w.w)), h('p', { class: 'gloss' }, w.g));
  const wrap = h('div', { class: 'choices pair' });
  for (const a of it.options) {
    const b = h('button', { class: 'choice big-c', type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = a === it.answer;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'));
      if (!ok) for (const o of wrap.children) if (o.dataset.v === it.answer) { o.classList.add('right'); o.append(h('span', { class: 'mark' }, '✓')); }
      done(ctx, ok);
      const st = it.suffix ? D().endings?.[it.suffix] : null;
      c.append(afterCard([
        h('p', { class: 'bigword' }, h('span', { class: 'art' }, it.answer), typo(w.w)),
        wordVoices(w, it.i),
        st ? h('div', { class: 'gpoint' }, h('p', {}, `Les noms en -${it.suffix} sont ${st.g === 'f' ? 'féminins' : 'masculins'} dans ${st.pct} % des cas ici (${st.n} mots).`)) : null,
      ], { ...ctx, ok, answer: `${it.answer} ${w.w}` }));
    } }, a);
    b.dataset.v = a;
    wrap.append(b);
  }
  c.append(wrap);
  return c;
}

// ── 9. which spelling? ───────────────────────────────────────────────────
function spellPick(it, ctx) {
  const w = wordOf(it);
  const note = h('p', { class: 'note centre' });
  const c = card('writing', prompt('pSpell'),
    h('div', { class: 'voices' }, playBtn({ label: t('listen'), big: true, autoplay: true, note, play: (end) => playWord(w, it.i, { pref: voicePref(), onend: end }) })), note,
    h('p', { class: 'cue' }, w.g));
  c.append(choices(it.options, it.answer, (ok) => {
    done(ctx, ok);
    c.append(afterCard([wordCard(it.i, { example: true })], { ...ctx, ok, answer: it.answer }));
  }, { cls: 'fr-c' }));
  return c;
}

// ── 10. which did you hear? ──────────────────────────────────────────────
function soundPair(it, ctx) {
  const d = D();
  const picks = it.choices.map((i) => ({ i, w: d.words[i] }));
  const target = picks[Math.floor(Math.random() * 2)];
  const note = h('p', { class: 'note centre' });
  const c = card('listening', prompt('pSound'),
    h('div', { class: 'voices' }, playBtn({ label: t('listen'), big: true, autoplay: true, note, play: (end) => playWord(target.w, target.i, { only: target.w.fr ? 'fr' : (target.w.qcA ? 'qc' : null), pref: 'fr', onend: end }) })), note,
    h('p', { class: 'note centre' }, it.contrast));
  const wrap = h('div', { class: 'choices pair' });
  for (const p of shuffle(picks)) {
    const b = h('button', { class: 'choice fr-c', type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = p.i === target.i;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'));
      done(ctx, ok);
      c.append(afterCard([
        h('p', { class: 'gloss' }, `C’était ${target.w.w} — ${target.w.g}.`),
        h('div', { class: 'gpoint' }, h('p', {}, it.tip)),
        h('div', { class: 'voices' }, ...picks.map((x) => playBtn({ label: x.w.w, play: (end) => playWord(x.w, x.i, { only: x.w.fr ? 'fr' : null, pref: 'fr', onend: end }) }))),
      ], { ...ctx, ok }));
    } }, h('span', {}, typo(p.w.w), h('small', {}, p.w.g)));
    wrap.append(b);
  }
  c.append(wrap);
  return c;
}

// ── 11. put it in order ──────────────────────────────────────────────────
function grammarBuild(it, ctx) {
  const c = card('grammar', prompt('pOrder'), h('p', { class: 'gloss big' }, it.eng));
  const line = h('div', { class: 'built', 'data-hint': 'Touche les mots dans l’ordre' });
  const bank = h('div', { class: 'bank' });
  const chosen = [];
  const finish = () => {
    if (chosen.length !== it.pieces.length) return;
    const ok = chosen.join(' ') === it.pieces.join(' ');
    line.classList.add(ok ? 'right' : 'wrong');
    bank.classList.add('locked');
    done(ctx, ok);
    const g = it.gid ? D().grammarById.get(it.gid) : null;
    c.append(afterCard([
      sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: !!it.audio }),
      g ? h('div', { class: 'gpoint' }, h('h3', {}, g.title, readBtn(g.plain)), h('p', {}, g.plain)) : null,
    ], { ...ctx, ok, answer: ok ? null : it.text }));
  };
  const pieces = shuffle(it.pieces.map((p, k) => ({ p, k })));
  for (const { p, k } of pieces) {
    const tile = h('button', { class: 'tile', type: 'button', onclick: () => {
      if (line.classList.contains('right') || line.classList.contains('wrong') || tile.classList.contains('used')) return;
      tile.classList.add('used');
      const placed = h('button', { class: 'tile', type: 'button', onclick: () => {
        if (line.classList.contains('right') || line.classList.contains('wrong')) return;
        chosen.splice(chosen.lastIndexOf(p), 1); placed.remove(); tile.classList.remove('used');
      } }, typo(p));
      chosen.push(p); line.append(placed); finish();
    } }, typo(p));
    bank.append(tile);
  }
  c.append(line, bank);
  return c;
}

// ── 12. two words, one translation ───────────────────────────────────────
function notePick(it, ctx) {
  const w = wordOf(it);
  const note = D().noteById.get(it.nid);
  const c = card('reading', h('p', { class: 'prompt' }, it.prompt));
  c.append(choices(it.options, w.w, (ok) => {
    done(ctx, ok);
    c.append(afterCard([
      h('p', { class: 'bigword' }, wordNode(w)),
      note ? h('div', { class: 'gpoint' }, h('h3', {}, note.title, readBtn(note.plain)), h('p', {}, note.plain), note.watch ? h('p', { class: 'watch' }, note.watch) : null,
        h('p', { class: 'evidence' }, 'Les mots et leurs sens viennent des sources ; ce conseil d’emploi est de moi.')) : null,
    ], { ...ctx, ok, answer: w.w }));
  }, { cls: 'fr-c' }));
  return c;
}

// ── the Canadian track ───────────────────────────────────────────────────
const can = (it) => D().canadian[it.q];
const canNote = (c) => h('div', { class: 'gpoint' },
  h('h3', {}, qcIcon(), ' ', typo(c.qc), ' ', c.std ? `= ${typo(c.std)}` : ''),
  h('p', {}, c.means + (c.gloss && c.gloss.toLowerCase() !== c.means.toLowerCase() ? ` — Wiktionary : ${c.gloss}` : ''), readBtn(c.means)),
  c.fr ? h('p', {}, `En France : ${c.fr}. `, h('span', { class: 'note' }, '(de moi, pas du dictionnaire)')) : null,
  c.contrast ? h('p', {}, 'En France, selon Wiktionary : ' + c.contrast) : null,
  c.note ? h('p', { class: 'watch' }, c.note) : null,
  c.ex ? sentenceBlock({ text: c.ex.t, eng: c.ex.e, sid: c.ex.id, hasAudio: !!c.ex.a, qc: true }) : null,
  c.audio ? h('div', { class: 'voices' }, playBtn({ label: 'Québec', play: (end) => playCanadian(c, { onend: end }) })) : null,
  h('p', { class: 'evidence' }, 'Source du sens : Wiktionary (CC BY-SA).' + (c.fr2 ? ' Confirmé aussi par le Wiktionnaire en français.' : '')));

function qcMean(it, ctx) {
  const c0 = can(it);
  const c = card('canada', prompt('pQcMean'), h('p', { class: 'bigword' }, typo(c0.qc)));
  if (c0.audio) c.append(h('div', { class: 'voices' }, playBtn({ label: 'Québec', play: (end) => playCanadian(c0, { onend: end }) })));
  c.append(choices(it.options, c0.means, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.means })); }));
  return c;
}
function qcPick(it, ctx) {
  const c0 = can(it);
  const c = card('canada', prompt('pQcWord'), h('p', { class: 'gloss big' }, c0.means));
  c.append(choices(it.options, c0.qc, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.qc })); }, { cls: 'fr-c' }));
  return c;
}
function qcListen(it, ctx) {
  const c0 = can(it);
  const note = h('p', { class: 'note centre' });
  const c = card('canada', prompt('pHear'),
    h('div', { class: 'voices' }, playBtn({ label: t('listen'), big: true, autoplay: true, note, play: (end) => playCanadian(c0, { onend: end }) })), note);
  c.append(choices(it.options, c0.means, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.means })); }));
  return c;
}
function qcOral(it, ctx) {
  const c0 = can(it);
  const c = card('canada', prompt('pQcOral'), h('p', { class: 'bigword' }, typo(c0.qc)), h('p', { class: 'gloss' }, c0.means));
  c.append(choices(it.options, c0.std, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.std })); }, { cls: 'fr-c' }));
  return c;
}

// ── meeting a word ───────────────────────────────────────────────────────
// The only screen in the app that asks nothing. Taught before tested: a word
// from beyond where you placed is shown first, with its sound and a sentence.
export function meetCard(i, onDone) {
  return h('section', { class: 'card qcard meet' },
    h('p', { class: 'eyebrow' }, t('newWord')),
    wordCard(i),
    h('div', { class: 'dock' }, h('button', { class: 'btn primary wide', type: 'button', onclick: onDone }, t('gotIt'))));
}
