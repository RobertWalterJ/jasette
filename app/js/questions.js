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
import { asrSupported, listenFor, matches, similar, verdict } from './asr.js';
import { hintFor, tipNode } from './help.js';
import { autoRead, readQuestionButton, cancelReading, onAutoplayEnd } from './read.js';
import { conjFacts, conjAfter, paradigmAfter, paradigmText, PERSON } from './conj.js';
import { S, voicePref, wordNode, plainWord, articleFor, playBtn, wordVoices, sentenceBtn, sentenceBlock, wordCard, voiceNote, readBtn, lab, fillSentence, segmentsAround, choices, afterCard, ipaLine, creditLine, qcIcon, exprCard } from './parts.js';

const prompt = (key, extra = null) => h('p', { class: 'prompt' }, lab(key), extra);
const SKILL_ICON = { listening: 'ear', speaking: 'mic', reading: 'eye', writing: 'pen', grammar: 'puzzle', canada: 'fleur' };
export const skillChip = (skill) => h('span', { class: 'skill' }, h('span', { html: ICON[SKILL_ICON[skill]] || '' }), t(skill));

export function renderQuestion(it, ctx) {
  const el = renderKind(it, ctx);
  const tip = hintFor(it.k);
  const p = el.querySelector?.('.prompt');
  if (tip && p) p.after(tipNode(tip));
  // auto-read mode: say the question as it appears (a listening question's recording waits for it)
  autoRead(el, { listening: LISTENING.has(it.k) });
  return el;
}
function renderKind(it, ctx) {
  switch (it.k) {
    case 'word-read': return wordRead(it, ctx);
    case 'word-listen': return wordListen(it, ctx);
    case 'word-pick': return wordPick(it, ctx);
    case 'word-say': return wordSay(it, ctx);
    case 'sentence-repeat': return sentenceRepeat(it, ctx);
    case 'sentence-say': return sentenceSay(it, ctx);
    case 'word-cloze': return gapSingle(it, ctx, { key: 'pGap' });
    case 'conj-pick': return gapSingle(it, ctx, { key: 'pForm', cue: conjCue });
    case 'conj-drill': return conjDrill(it, ctx);
    case 'conj-row': case 'conj-across': return conjParadigm(it, ctx);
    case 'idiom-mean': return idiomMean(it, ctx);
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

// The head row holds the skill and, at the right, the "read this question" button.
const card = (skill, ...kids) => {
  const sec = h('section', { class: 'card qcard' });
  sec.append(h('div', { class: 'qhead' }, skillChip(skill), readQuestionButton(sec)), ...kids.filter(Boolean));   // (append(null) would print "null")
  return sec;
};
const LISTENING = new Set(['word-listen', 'sentence-listen', 'spell-pick', 'sound-pair', 'qc-listen']);
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
    c.append(afterCard([wordCard(it.i)], { ...ctx, ok, answer: w.g, say: w.d || w.w }));
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
    c.append(afterCard([wordCard(it.i)], { ...ctx, ok, answer: w.g, say: w.d || w.w }));
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
  const c = card('speaking', prompt('pSay'), h('p', { class: 'gloss big' }, w.g), cueOf(it.i) ? h('p', { class: 'cue' }, cueOf(it.i)) : null);
  c.append(speakFlow(ctx, { target: w.w, word: true, reveal: (extra) => [wordCard(it.i), extra] }));
  return c;
}

// ── every "say it" question: one flow ────────────────────────────────────
// The phone listens if the learner has let it (asked once, in plain words, the first time), shows
// what it hears as it hears it, and marks the answer. A clear match is right; anything less is shown
// word by word and handed back to the learner, because a recogniser built for native speakers
// misses learners often. Without recognition it is a flashcard the learner marks, said plainly.
function speakFlow(ctx, { target, word = false, reveal, rateLabels = null }) {
  const wrap = h('div', {});
  const out = h('div', {});
  const lang = () => (voicePref() === 'fr' ? 'fr-FR' : 'fr-CA');
  const labels = rateLabels || [t('iKnewIt'), t('notYet')];
  const selfRate = (lead) => h('div', {},
    lead ? h('p', { class: 'note' }, lead) : null,
    h('div', { class: 'choices two' },
      h('button', { class: 'choice big-c', type: 'button', onclick: () => { done(ctx, true, { selfRated: true }); out.append(afterCard([], ctx)); } }, labels[0]),
      h('button', { class: 'choice big-c', type: 'button', onclick: () => { done(ctx, false, { selfRated: true }); out.append(afterCard([], { ...ctx, wrong: true, say: target })); } }, labels[1])));
  const showAnswer = (extra) => out.append(...[].concat(reveal(extra)).filter(Boolean));
  // the sentence, with the words the phone did not hear marked (underline, and said to a screen reader)
  const marked = (pieces) => h('p', { class: 'said' }, ...pieces.flatMap((x, k) => [k ? ' ' : '',
    x.hit ? h('span', { class: 'heard' }, typo(x.show)) : h('span', { class: 'miss' }, typo(x.show), h('span', { class: 'sr-only' }, ' (not heard)'))]));

  const build = () => {
    wrap.replaceChildren();
    const noAsr = asrSupported() ? null : 'This browser cannot listen, so you will mark yourself.';
    const asked = S().asr !== undefined;
    // the first time: say what listening costs, and ask
    if (asrSupported() && !asked) {
      wrap.append(h('div', { class: 'gpoint' },
        h('h3', {}, 'Let the phone listen?'),
        h('p', {}, 'To check what you say, your phone sends a short recording of your voice to the browser’s maker (Google, if you use Chrome) to turn it into text. Jasette does not keep it. You can turn this off any time in Réglages.'),
        h('p', { class: 'note' }, 'It is built for native speakers, so it will sometimes mishear you. When it is not sure, you decide.'),
        h('div', { class: 'choices two' },
          h('button', { class: 'choice big-c', type: 'button', onclick: () => { S().asr = true; State.save(); build(); } }, 'Yes, listen to me'),
          h('button', { class: 'choice big-c', type: 'button', onclick: () => { S().asr = false; State.save(); build(); } }, 'No, I’ll mark myself'))));
      return;
    }
    if (asrSupported() && S().asr === true) {
      const live = h('p', { class: 'live', 'aria-live': 'polite' });
      const say = h('button', { class: 'btn primary wide', type: 'button' }, h('span', { html: ICON.mic, style: 'display:inline-flex;width:20px' }), t('sayIt'));
      const skip = h('button', { class: 'link', type: 'button', onclick: () => { say.remove(); skip.remove(); live.remove(); showAnswer(); out.append(selfRate(null)); } }, t('showMe'));
      say.onclick = async () => {
        unlock(); cancelReading(); stopAudio();
        say.disabled = true; skip.remove();
        live.textContent = 'Listening… say it, then tap Done (or just stop talking).';
        const stop = h('button', { class: 'btn ghost wide', type: 'button' }, 'Done');
        say.replaceWith(stop);
        const job = listenFor({ lang: lang(), onInterim: (txt) => { if (txt) live.textContent = '« ' + txt + ' »'; } });
        stop.onclick = () => { stop.disabled = true; job.stop(); };
        const res = await job;
        stop.remove(); live.remove();
        if (!res.ok) { showAnswer(h('p', { class: 'warn' }, res.why)); out.append(selfRate('À toi de noter, cette fois.')); return; }
        if (word) {
          const m = matches(target, res.heard);
          showAnswer(h('div', {}, h('p', { class: m.hit ? 'good' : 'warn' }, m.hit ? `J’ai entendu « ${m.on} » : ça y est.` : `J’ai entendu « ${res.heard[0]} » : je n’ai pas trouvé ${target}.`),
            m.hit ? null : h('p', { class: 'note' }, 'The phone is built for native speakers, so a miss does not prove you said it wrongly. You decide.')));
          if (m.hit) { done(ctx, true); out.append(afterCard([], ctx)); } else out.append(selfRate(null));
          return;
        }
        const r = similar(target, res.heard);
        const v = verdict(r.score);
        const pct = Math.round(r.score * 100);
        showAnswer(h('div', {},
          h('p', { class: 'note' }, 'I heard: « ', h('b', {}, r.on), ' »'),
          marked(r.pieces),
          h('p', { class: v === 'hit' ? 'good' : 'warn' }, v === 'hit' ? `${pct}% of the words: that’s it.` : v === 'close' ? `${pct}%: nearly. The underlined words are the ones I did not catch.` : `${pct}%: I only caught part of it.`),
          v === 'hit' ? null : h('p', { class: 'note' }, 'A recogniser built for native speakers misses learners often, so you decide: did you say it?')));
        if (v === 'hit') { done(ctx, true); out.append(afterCard([], ctx)); } else out.append(selfRate(null));
      };
      wrap.append(say, live, skip);
    } else {
      const btn = h('button', { class: 'btn primary wide', type: 'button', onclick: () => {
        btn.remove(); showAnswer();
        out.append(selfRate(noAsr || 'Only you can hear whether it was right, so you mark it. Letting the phone listen is in Réglages.'));
      } }, t('showMe'));
      wrap.append(btn);
    }
  };
  build();
  wrap.append(out);
  // speaking mode: open the microphone for the learner (only if they have let the phone listen)
  wrap.autoStart = () => { if (asrSupported() && S().asr === true) wrap.querySelector('.btn.primary')?.click(); };
  return wrap;
}

// ── listen and repeat: a real recording, then you say it ─────────────────
function sentenceRepeat(it, ctx) {
  const note = h('p', { class: 'note centre' });
  const words = h('div', { hidden: true }, h('p', { class: 'fr-s' }, typo(it.text)), h('p', { class: 'en-s' }, it.eng));
  const toggle = h('button', { class: 'link', type: 'button', onclick: () => { words.hidden = !words.hidden; toggle.textContent = words.hidden ? 'Show the words' : 'Hide the words'; } }, 'Show the words');
  const c = card('speaking', prompt('pRepeat'),
    h('div', { class: 'voices' }, sentenceBtn({ id: it.sid, t: it.text, a: 1, by: it.by }, { label: t('listen'), big: true, autoplay: true, note })), note,
    toggle, words);
  const flow = speakFlow(ctx, { target: it.text, rateLabels: ['Je l’ai dit', t('notYet')], reveal: (extra) => [sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: true, by: it.by }), extra] });
  c.append(flow);
  // speaking mode: another voice says it, and as soon as the recording ends the phone starts listening
  if (ctx.speak) onAutoplayEnd(() => flow.autoStart());
  return c;
}

// ── say it in French: the English, and you produce the sentence ──────────
function sentenceSay(it, ctx) {
  const c = card('speaking', prompt('pSaySentence'), h('p', { class: 'gloss big' }, it.eng));
  const flow = speakFlow(ctx, { target: it.text, rateLabels: ['Je l’ai dit', t('notYet')], reveal: (extra) => [sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: !!it.audio }), extra] });
  c.append(flow);
  if (ctx.speak) setTimeout(() => flow.autoStart(), 800);        // the English is on screen: listen after a moment
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
      hint: h('p', { class: 'note translation' }, it.eng),
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

// ── 5a. an expression: what does the whole phrase mean? ──────────────────
function idiomMean(it, ctx) {
  const x = D().expressions[it.x];
  const c = card('reading', prompt('pIdiom'),
    h('p', { class: 'bigword' }, typo(x.fr)),
    x.reg === 'fam' ? h('p', { class: 'cue' }, 'familier') : null);
  c.append(choices(it.options, x.en, (ok) => {
    done(ctx, ok);
    c.append(afterCard([exprCard(x, { head: false })], { ...ctx, ok, answer: x.en, say: x.fr }));
  }));
  return c;
}

// ── 5a-2. a whole tense across the persons, or one person across the tenses ──
// Conjugation as a shape. Tap each form into its line (the fill-multi mechanism, one blank per line).
function conjParadigm(it, ctx) {
  const d = D();
  const w = d.words[it.v];
  const row = it.k === 'conj-row';
  const tn = row ? d.conjTenses[it.tense] : null;
  const c = card('grammar', prompt(row ? 'pRow' : 'pAcross'),
    h('p', { class: 'bigword' }, typo(w.d || w.w)),
    h('p', { class: 'gloss' }, w.g),
    h('p', { class: 'cue' }, row ? tn.fr : PERSON[it.slot] + ' · ' + it.tenses.map((x) => d.conjTenses[x].fr).join(' · ')));
  c.append(fillSentence({
    segs: it.segs, answers: it.answers, bank: it.bank, lines: true,
    hint: h('p', { class: 'note translation' }, row ? tn.en + ': every person' : 'one person, ' + it.tenses.length + ' tenses'),
    onChecked: (ok) => {
      done(ctx, ok);
      c.append(afterCard([paradigmAfter(it)], { ...ctx, ok, say: paradigmText(it) }));
    },
  }));
  return c;
}

// ── 5b. the conjugation drill: a pronoun, a verb and a tense; tap the form ──
function conjDrill(it, ctx) {
  const f = conjFacts(it);
  const segs = segmentsAround(it.text, it.answer);
  const c = card('grammar', prompt('pConj'),
    h('p', { class: 'bigword' }, typo(f.inf)),
    h('p', { class: 'gloss' }, f.gloss),
    h('p', { class: 'cue' }, f.tenseFr + (f.person ? ` · ${f.person}` : '')));
  if (!segs) { c.append(h('p', {}, 'Cette question n’a pas pu s’afficher.')); return c; }
  c.append(fillSentence({
    segs, answers: [it.answer], bank: shuffle([it.answer, ...it.options]), cap: segs[0] === '',
    hint: h('p', { class: 'note translation' }, f.tenseEn),
    onChecked: (ok) => {
      done(ctx, ok);
      c.append(afterCard([conjAfter(it)], { ...ctx, ok, answer: it.text.replace(/\s*!$/, '') }));
    },
  }));
  return c;
}

// ── 6. several blanks: tap the words into place ──────────────────────────
function fillMulti(it, ctx) {
  const c = card('grammar', prompt('pGaps'), h('p', { class: 'note translation' }, it.eng));
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
    c.append(afterCard([sentenceBlock({ text: it.text, eng: it.eng, sid: it.sid, hasAudio: true, by: it.by }, { play: false })], { ...ctx, ok, answer: it.eng, say: it.text }));
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
  c.append(choices(it.options, c0.means, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.means, say: c0.qc })); }));
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
  c.append(choices(it.options, c0.means, (ok) => { done(ctx, ok); c.append(afterCard([canNote(c0)], { ...ctx, ok, answer: c0.means, say: c0.qc })); }));
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
