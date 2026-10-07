// Jasette — dialogues: hear a line, answer it, see why.
//
// A short exchange in one everyday Québec situation; the learner plays “Vous”. Three steps:
//   Écoute    hear the whole exchange once (English on request);
//   Réponds   the other person speaks, you choose what to say, by tapping or by SAYING it (the phone
//             works out which of the three replies you said); then the reason, every time;
//   Pourquoi  at the end, what the exchange showed: the pattern spotlight and the Québec words.
// A first play is scheduled like any other card (right if at most one reply was wrong); replays are
// practice. Nothing is timed. The speaker is the phone's French voice, which the app labels as a machine.

import { h, typo, ICON } from './ui.js';
import { State, shuffle } from './schedule.js';
import { D } from './deck.js';
import { speakQueue, cancelReading } from './read.js';
import { asrSupported, listenFor, similar } from './asr.js';
import { frAvailable, unlock } from './speech.js';
import { voicePref, S } from './parts.js';

const LEVEL_ORDER = { A2: 0, 'A2+': 1, B1: 2, B2: 3 };
const idOf = (d) => `dlg/${d.id}`;
const lineFr = (l) => (l.who === 'you' ? l.best.fr : l.fr);
const lineEn = (l) => (l.who === 'you' ? l.best.en : l.en);

// ── the list of dialogues ────────────────────────────────────────────────
export function dialoguesScreen({ header, play }) {
  const d = D();
  const ladder = d.conjLadder || [];
  const due = new Set(State.dueIds(d.dialogues.map(idOf).filter((id) => State.card(id))));
  const rows = d.dialogues.map((dl, n) => ({ dl, n })).sort((a, b) => (LEVEL_ORDER[a.dl.level] ?? 9) - (LEVEL_ORDER[b.dl.level] ?? 9));
  return [header('Conversations', { backBtn: true }), h('main', {},
    h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Conversations'),
      h('p', {}, 'Short exchanges in everyday Québec situations. You play “Vous”: hear the other person, choose what to say (tap it, or say it out loud), then see why. Every reply, right or wrong, comes with its reason.'),
      h('p', { class: 'note' }, 'The voice is your phone’s own French voice. A wrong choice is fine: it shows you what the other reply would have meant.')),
    ...rows.map(({ dl, n }) => {
      const card = State.card(idOf(dl));
      const status = !card ? 'New' : due.has(idOf(dl)) ? 'Due for another go' : 'Played';
      const uses = (dl.needs || []).map((id) => ladder.find((r) => r.id === id)?.title).filter(Boolean);
      return h('section', { class: 'card' },
        h('h3', {}, dl.title, h('span', { class: 'cefr' }, dl.level)),
        h('p', { class: 'note' }, dl.en + ' · ' + status),
        uses.length ? h('p', { class: 'note' }, h('b', {}, 'Leans on: '), uses.join(' · ')) : null,
        h('button', { class: 'btn primary wide', type: 'button', onclick: () => play(n) }, card ? 'Play again' : 'Play'));
    }))];
}

// ── the player ───────────────────────────────────────────────────────────
export function dialogueScreen({ header, back, list, n }) {
  const dl = D().dialogues[n];
  const id = idOf(dl);
  const main = h('main', {});
  let showEn = false;
  let practice = !!State.card(id);               // the first play is the scheduled one
  const frVoice = frAvailable();

  const say = (items) => { if (frVoice) { unlock(); return speakQueue(items); } return Promise.resolve(); };
  const bubble = (who, fr, en, extra = null) => h('div', { class: 'bubble ' + (who === 'you' ? 'you' : 'other') },
    h('span', { class: 'who' }, who === 'you' ? 'Vous' : 'Eux'),
    h('p', { class: 'fr' }, typo(fr)),
    showEn && en ? h('p', { class: 'note' }, en) : null, extra);

  // ── Écoute ──
  const intro = () => {
    cancelReading();
    const qcs = (dl.qc || []).map((w) => D().canadian[D().canIndex.get(w)]).filter(Boolean);
    main.replaceChildren(h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, dl.level + ' · Conversation'),
      h('h2', { style: 'margin:0 0 4px' }, dl.title),
      h('p', { class: 'note' }, dl.en),
      qcs.length ? h('div', {}, h('h3', { style: 'margin:14px 0 4px' }, 'Québec words you will hear'),
        h('div', { class: 'chips' }, ...qcs.map((c) => h('span', { class: 'chip' }, `${c.qc} · ${c.means}`)))) : null,
      !frVoice ? h('p', { class: 'warn' }, 'This phone has no French voice, so the lines are written but not spoken.') : null,
      h('div', { class: 'dock' },
        h('button', { class: 'btn primary wide', type: 'button', onclick: listen }, 'Listen to it first'),
        h('button', { class: 'btn ghost wide', type: 'button', onclick: () => respond() }, 'Go straight to the conversation'))));
  };
  const listen = () => {
    const lines = dl.lines;
    const body = h('div', { class: 'chat' });
    const paint = () => body.replaceChildren(...lines.map((l) => bubble(l.who, lineFr(l), lineEn(l))));
    paint();
    main.replaceChildren(h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Écoute'),
      h('div', { class: 'row' },
        h('button', { class: 'btn', type: 'button', disabled: !frVoice, onclick: () => say(lines.map((l) => ({ text: lineFr(l), lang: 'fr', pause: 500 }))) }, h('span', { html: ICON.speaker, style: 'display:inline-flex;width:18px' }), ' Play it'),
        h('button', { class: 'btn ghost', type: 'button', onclick: (e) => { showEn = !showEn; e.currentTarget.textContent = showEn ? 'Hide English' : 'Show English'; paint(); } }, 'Show English')),
      body,
      h('div', { class: 'dock' }, h('button', { class: 'btn primary wide', type: 'button', onclick: () => respond() }, 'Start the conversation'))));
  };

  // ── Réponds ──
  const respond = () => {
    cancelReading();
    const chat = h('div', { class: 'chat' });
    const panel = h('div', {});
    const recap = [];
    let wrong = 0;
    main.replaceChildren(h('section', { class: 'card' }, h('p', { class: 'eyebrow' }, practice ? 'Réponds · practice' : 'Réponds'), chat, panel));

    const step = (k) => {
      if (k >= dl.lines.length) { summary(recap, wrong); return; }
      const l = dl.lines[k];
      panel.replaceChildren();
      if (l.who === 'other') {
        chat.append(bubble('other', l.fr, l.en));
        say([{ text: l.fr, lang: 'fr' }]);
        panel.append(h('div', { class: 'dock' },
          frVoice ? h('button', { class: 'btn ghost', type: 'button', onclick: () => say([{ text: l.fr, lang: 'fr' }]) }, h('span', { html: ICON.speaker, style: 'display:inline-flex;width:18px' }), ' Again') : null,
          h('button', { class: 'btn primary wide', type: 'button', onclick: () => step(k + 1) }, 'Continue')));
        window.scrollTo(0, document.body.scrollHeight);
        return;
      }
      // your turn: three replies in a random order, by tap or by voice
      const options = shuffle([{ ...l.best, kind: 'best' }, ...l.others]);
      const choose = (opt) => {
        for (const b of panel.querySelectorAll('button')) b.disabled = true;
        const ok = opt.kind === 'best';
        if (!ok) wrong++;
        recap.push({ fr: l.best.fr, ok });
        cancelReading();
        chat.append(bubble('you', opt.fr, opt.fr === l.best.fr ? l.best.en : null));
        panel.replaceChildren(
          h('p', { class: 'verdict ' + (ok ? 'right' : 'wrong'), role: 'status' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, ok ? '✓' : '✗'),
            h('span', {}, ok ? 'The natural reply' : opt.kind === 'register' ? 'Correct French, wrong for this person' : opt.kind === 'other' ? 'Correct French, wrong for this moment' : 'Not quite: a common slip')),
          h('p', {}, opt.why),
          ok ? null : h('div', { class: 'gpoint' }, h('p', { class: 'eyebrow' }, 'What people would say'), h('p', { class: 'fr' }, typo(l.best.fr)), h('p', { class: 'note' }, l.best.en), h('p', {}, l.best.why)),
          h('div', { class: 'dock' },
            frVoice ? h('button', { class: 'btn ghost', type: 'button', onclick: () => say([{ text: l.best.fr, lang: 'fr' }]) }, h('span', { html: ICON.speaker, style: 'display:inline-flex;width:18px' }), ' Hear the natural reply') : null,
            h('button', { class: 'btn primary wide', type: 'button', onclick: () => step(k + 1) }, k === dl.lines.length - 1 ? 'Finish' : 'Continue')));
        window.scrollTo(0, document.body.scrollHeight);
      };
      const choices = h('div', { class: 'choices' }, ...options.map((o) => h('button', { class: 'choice fr-c', type: 'button', onclick: () => choose(o) }, typo(o.fr))));
      panel.append(h('p', { class: 'eyebrow' }, 'What do you say?'), choices);
      // by voice: the phone works out which of the three you said
      if (asrSupported() && S().asr === true) {
        const live = h('p', { class: 'live', 'aria-live': 'polite' });
        const mic = h('button', { class: 'btn ghost wide', type: 'button' }, h('span', { html: ICON.mic, style: 'display:inline-flex;width:20px' }), ' Say it instead');
        mic.onclick = async () => {
          unlock(); cancelReading();
          mic.disabled = true; live.textContent = 'Listening… say your reply.';
          const stop = h('button', { class: 'btn ghost wide', type: 'button' }, 'Done');
          mic.replaceWith(stop);
          const job = listenFor({ lang: voicePref() === 'fr' ? 'fr-FR' : 'fr-CA', onInterim: (t) => { if (t) live.textContent = '« ' + t + ' »'; } });
          stop.onclick = () => { stop.disabled = true; job.stop(); };
          const res = await job;
          stop.replaceWith(mic); mic.disabled = false;
          if (!res.ok) { live.textContent = res.why + ' You can tap a reply instead.'; return; }
          const scored = options.map((o) => ({ o, r: similar(o.fr, res.heard) })).sort((a, b) => b.r.score - a.r.score);
          const [top, next] = scored;
          if (top.r.score >= 0.8 && top.r.score - (next?.r.score ?? 0) >= 0.1) { live.textContent = 'I heard: « ' + top.r.on + ' »'; choose(top.o); }
          else live.textContent = 'I heard « ' + (res.heard[0] || '') + ' » and I am not sure which reply that is. Tap one, or try again.';
        };
        panel.append(mic, live);
      } else if (asrSupported()) panel.append(h('p', { class: 'note' }, 'To answer by voice, let the phone listen (Réglages, or answer any speaking question once).'));
      window.scrollTo(0, document.body.scrollHeight);
    };
    step(0);
  };

  // ── Pourquoi ──
  const summary = (recap, wrong) => {
    const ok = wrong <= 1;
    State.answer(id, ok, { practice });                 // the first play is scheduled; replays are practice
    practice = true;
    const qcs = (dl.qc || []).map((w) => D().canadian[D().canIndex.get(w)]).filter(Boolean);
    main.replaceChildren(h('section', { class: 'card' },
      h('p', { class: 'eyebrow' }, 'Pourquoi'),
      h('p', { class: 'bignum' }, `${recap.length - wrong}`, h('span', { class: 'note', style: 'font-family:var(--ui);font-size:1.1rem;margin-left:8px' }, `of ${recap.length} natural first time`)),
      h('div', {}, ...recap.map((r) => h('p', { class: 'recap' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, r.ok ? '✓' : '✗'), ' ', h('span', { class: 'fr' }, typo(r.fr)), h('span', { class: 'sr-only' }, r.ok ? ' (right)' : ' (not natural)')))),
      h('div', { class: 'gpoint' }, h('h3', {}, dl.spotlight.title), h('p', {}, dl.spotlight.text)),
      qcs.length ? h('div', {}, h('h3', { style: 'margin:12px 0 4px' }, 'Québec words'), h('div', { class: 'chips' }, ...qcs.map((c) => h('span', { class: 'chip accent' }, `${c.qc} · ${c.means}`)))) : null,
      h('div', { class: 'dock' },
        h('button', { class: 'btn primary wide', type: 'button', onclick: () => respond() }, 'Play it again (practice)'),
        h('button', { class: 'btn ghost wide', type: 'button', onclick: list }, 'Back to conversations'))));
    window.scrollTo(0, 0);
  };

  intro();
  return [header(dl.title, { backBtn: true }), main];
}
