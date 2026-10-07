// Jasette — letting the phone check what you said.
//
// Saying a word and then marking yourself is a flashcard, not a test. Where the
// phone can recognise French, the app lets it listen and mark the answer.
//
// THE PRIVACY COST, STATED PLAINLY. The browser's speech recognition (the Web
// Speech API) sends your recorded speech to the browser-maker's servers to be
// transcribed. That is how the API works and it cannot be done locally in a
// web page. So it is OFF by default, turned on by an explicit setting that
// says exactly this, and everything else keeps working without it.
//
// WHAT IT IS WORTH. The recogniser is built for sentences spoken by native
// speakers, so a learner is misheard more often than a native. A match counts
// as right; a non-match hands the decision back to the learner rather than
// marking them wrong.

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const asrSupported = () => !!SR;

export function listenFor({ lang = 'fr-CA', seconds = 5 } = {}) {
  return new Promise((resolve) => {
    if (!SR) { resolve({ ok: false, why: 'This browser has no speech recognition.' }); return; }
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const rec = new SR();
    rec.lang = lang;
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const heard = [];
      for (const result of e.results) for (let i = 0; i < result.length; i++) heard.push(String(result[i].transcript || '').trim());
      finish({ ok: true, heard: heard.filter(Boolean) });
    };
    rec.onerror = (e) => finish({ ok: false, why: ({
      'not-allowed': 'The microphone is blocked for this site.',
      'service-not-allowed': 'The browser would not start its speech service.',
      'no-speech': 'I did not hear anything.',
      network: 'Speech recognition needs a connection, and there is none.',
      'language-not-supported': 'This browser will not do French recognition.',
    }[e.error] || ('Speech recognition failed: ' + e.error)) });
    rec.onend = () => finish({ ok: false, why: 'I did not hear anything.' });
    try { rec.start(); } catch (err) { finish({ ok: false, why: String(err.message || err) }); }
    setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, seconds * 1000);
  });
}

// Accents, case, punctuation and the elision mark do not make a different word.
const clean = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// Did any of what it heard contain the word? Forgiving in one direction: the
// word may sit inside a longer utterance ("le chat"), never the reverse.
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
