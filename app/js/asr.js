// Jasette — letting the phone check what you said.
//
// Saying a word and then marking yourself is a flashcard, not a test. Where the phone can recognise
// French, the app listens, shows what it heard as you speak, and marks the answer.
//
// THE PRIVACY COST, STATED PLAINLY. The browser's speech recognition (the Web Speech API) sends your
// recorded speech to the browser-maker's servers to be transcribed (Google, in Chrome). That is how the
// API works and it cannot be done locally in a web page. So the app asks ONCE, in plain words, before
// it first listens, and the setting can be turned off at any time; everything else works without it.
//
// WHAT IT IS WORTH. The recogniser is built for native speakers, so a learner is misheard more often
// than a native. A good match counts as right; anything less hands the decision back to the learner,
// showing which words it did and did not hear, rather than marking them wrong.
//
// The scoring (`similar`, `matches`) is pure and tested in Node (build/test-asr.mjs).

const SRC = () => (typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null);
export const asrSupported = () => !!SRC();

// Listen once. Returns a promise of { ok, heard: [alternatives] } or { ok:false, why }, with a `.stop()`
// to end it early (the learner taps Done) and `onInterim(text)` called with what it hears so far.
// It ends by itself when the speaker stops; `seconds` is only a safety cap, and it never advances
// anything: the learner is always the one who moves on.
export function listenFor({ lang = 'fr-CA', seconds = 14, onInterim = null } = {}) {
  let stop = () => {};
  const promise = new Promise((resolve) => {
    const SR = SRC();
    if (!SR) { resolve({ ok: false, why: 'This browser has no speech recognition.' }); return; }
    let finished = false;
    const finish = (r) => { if (!finished) { finished = true; resolve(r); } };
    const rec = new SR();
    rec.lang = lang;
    rec.maxAlternatives = 5;
    rec.interimResults = true;
    rec.continuous = false;
    let last = [];
    rec.onresult = (e) => {
      const finals = [];
      let interim = '';
      for (const result of e.results) {
        if (result.isFinal) for (let i = 0; i < result.length; i++) finals.push(String(result[i].transcript || '').trim());
        else interim += String(result[0]?.transcript || '') + ' ';
      }
      if (onInterim) onInterim((interim || finals[0] || '').trim());
      if (finals.length) { last = finals.filter(Boolean); }
    };
    rec.onerror = (e) => finish({ ok: false, why: ({
      'not-allowed': 'The microphone is blocked for this site. Allow it in the browser’s site settings.',
      'service-not-allowed': 'The browser would not start its speech service.',
      'no-speech': 'I did not hear anything.',
      network: 'Speech recognition needs a connection, and there is none.',
      'language-not-supported': 'This browser will not do French recognition.',
      aborted: 'Listening was stopped.',
    }[e.error] || ('Speech recognition failed: ' + e.error)) });
    rec.onend = () => finish(last.length ? { ok: true, heard: last } : { ok: false, why: 'I did not hear anything.' });
    stop = () => { try { rec.stop(); } catch { /* already stopped */ } };
    try { rec.start(); } catch (err) { finish({ ok: false, why: String(err.message || err) }); }
    setTimeout(stop, seconds * 1000);
  });
  promise.stop = () => stop();
  return promise;
}

// Accents, case, punctuation and the elision mark do not make a different word.
export const clean = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Did any of what it heard contain the word? Forgiving in one direction: the word may sit inside a
// longer utterance ("le chat"), never the reverse.
export function matches(word, heard) {
  const target = clean(word);
  for (const hh of heard) {
    const got = clean(hh);
    if (!got) continue;
    if (got === target || (' ' + got + ' ').includes(' ' + target + ' ')) return { hit: true, on: hh };
    if (target.length >= 5 && got.replace(/ /g, '').includes(target.replace(/ /g, ''))) return { hit: true, on: hh };
  }
  return { hit: false };
}

// ── a whole sentence ─────────────────────────────────────────────────────
const edit1 = (a, b) => {                       // are two words one edit apart (or equal)?
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};
// How much of the sentence did the phone hear, word by word? The best of its alternatives, by the
// longest run of the sentence's words found IN ORDER (so a missed word does not wreck the rest).
// Returns { score 0..1, words: [{ w, hit }], on: the transcript used }.
// The words of a sentence as the matcher sees them: cleaned, and with a lone elided letter joined to
// the word after it ("s il" and "c est", which is how a recogniser often writes s’il and c’est).
const wordsOf = (s) => {
  const raw = clean(s).split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    if (/^[sjldnmtc]$|^qu$/.test(raw[i]) && raw[i + 1]) { out.push(raw[i] + raw[i + 1]); i++; } else out.push(raw[i]);
  }
  return out;
};
export function similar(target, heard) {
  const want = wordsOf(target);
  let best = { score: 0, words: want.map((w) => ({ w, hit: false })), on: heard?.[0] || '' };
  for (const hh of heard || []) {
    const got = wordsOf(hh);
    if (!got.length || !want.length) continue;
    // longest common subsequence of target words against heard words (fuzzy by one letter)
    const L = Array.from({ length: want.length + 1 }, () => new Array(got.length + 1).fill(0));
    for (let i = want.length - 1; i >= 0; i--) for (let j = got.length - 1; j >= 0; j--) {
      L[i][j] = edit1(want[i], got[j]) ? 1 + L[i + 1][j + 1] : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    const words = want.map((w) => ({ w, hit: false }));
    for (let i = 0, j = 0; i < want.length && j < got.length;) {
      if (edit1(want[i], got[j]) && L[i][j] === 1 + L[i + 1][j + 1]) { words[i].hit = true; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    const score = L[0][0] / want.length;
    if (score > best.score) best = { score, words, on: hh };
  }
  // the sentence as WRITTEN, piece by piece (accents, capitals and punctuation kept), each piece marked
  // heard only if every word inside it was; this is what the learner sees
  const pieces = [];
  let k = 0;
  for (const piece of String(target).split(/\s+/).filter(Boolean)) {
    const n = wordsOf(piece).length;
    if (!n) { pieces.push({ show: piece, hit: true }); continue; }
    pieces.push({ show: piece, hit: best.words.slice(k, k + n).every((x) => x.hit) });
    k += n;
  }
  best.pieces = pieces;
  return best;
}
// What to do with a score: only a near-complete match is marked right on the phone's say-so. Anything
// less is the learner's call (one tap), so being strict costs a tap, while being lax would pass a
// sentence with a word missing.
export const verdict = (score) => (score >= 0.9 ? 'hit' : score >= 0.5 ? 'close' : 'miss');
