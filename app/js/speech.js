// Jasette — the phone's own voices.
//
// A recording of a person is always better, and the app uses one wherever it
// has one (audio.js). This is the fallback: the phone's French voice, when
// there is no recording, and its English voice for reading the interface
// aloud (Robert is dyslexic; read-aloud is built in, not an afterthought).
//
// Two French voices are kept apart: fr-CA, for the Québec side, and fr-FR. If
// the phone has only one of them the app says which one it used, and never
// presents a fr-FR voice as Québec.
//
// One hard gotcha: mobile browsers refuse speechSynthesis until it has been
// called once inside a real user gesture. Without unlock() on the first
// pointerdown, speech silently does nothing and looks broken.

const voices = { en: null, frCA: null, frFR: null };
let unlocked = false;
let onState = null;
export function onSpeaking(fn) { onState = fn; }

const pick = (all, score) => all.slice().sort((a, b) => score(b) - score(a))[0] || null;
const quality = (v) => (v.localService ? 2 : 0) + (/natural|neural|enhanced|premium|google/i.test(v.name) ? 2 : 0);
function choose() {
  const all = speechSynthesis.getVoices?.() || [];
  if (!all.length) return;
  voices.en = pick(all.filter((v) => /^en/i.test(v.lang)), (v) => (/^en[-_]CA/i.test(v.lang) ? 6 : /^en[-_]GB/i.test(v.lang) ? 5 : 3) + quality(v));
  voices.frCA = pick(all.filter((v) => /^fr[-_]CA/i.test(v.lang) || /canad|qu[eé]b/i.test(v.name)), quality);
  voices.frFR = pick(all.filter((v) => /^fr[-_]FR/i.test(v.lang) || (/^fr/i.test(v.lang) && !/^fr[-_]CA/i.test(v.lang))), quality);
}
export function initSpeech() {
  if (!('speechSynthesis' in window)) return;
  choose();
  speechSynthesis.addEventListener?.('voiceschanged', choose);
}
export const available = () => 'speechSynthesis' in window && !!voices.en;
export const frAvailable = () => 'speechSynthesis' in window && !!(voices.frCA || voices.frFR);
export const frVoiceInfo = () => ({ qc: voices.frCA?.name || null, fr: voices.frFR?.name || null });

export function unlock() {
  if (unlocked || !('speechSynthesis' in window)) return;
  unlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch { /* nothing to do */ }
}
export function stop() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  onState?.(false);
}
function speak(text, voice, { rate = 1, lang = null, onend = null } = {}) {
  if (!('speechSynthesis' in window) || !text) { onend?.(); return false; }
  stop();
  const u = new SpeechSynthesisUtterance(String(text));
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  if (lang) u.lang = lang;
  u.rate = rate;
  u.onstart = () => onState?.(true);
  u.onend = u.onerror = () => { onState?.(false); onend?.(); };
  try { speechSynthesis.speak(u); return true; } catch { onState?.(false); onend?.(); return false; }
}
export const say = (text, opts = {}) => speak(text, voices.en, opts);
// accent: 'qc' prefers fr-CA, 'fr' prefers fr-FR. Returns which voice was used,
// or null if the phone has no French voice at all.
export function sayFr(text, { accent = 'qc', rate = 0.92, onend = null } = {}) {
  const v = accent === 'qc' ? (voices.frCA || voices.frFR) : (voices.frFR || voices.frCA);
  if (!v) { onend?.(); return null; }
  speak(text, v, { rate, onend });
  return v === voices.frCA ? 'qc' : 'fr';
}
