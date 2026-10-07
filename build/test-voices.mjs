// Does the app pick the right voice to read French?
//
//   node build/test-voices.mjs
//
// A name containing "Canada" is not a French voice: "English (Canada)" is a Canadian voice that
// reads French words in an English accent, and the first version of speech.js chose it as the
// Québec voice. This runs speech.js against voice lists shaped like the real ones (Android, Windows,
// Mac, a phone with no French at all) and requires that French is only ever read by a French voice
// and English only by an English one.

const lists = {
  'Android, Google TTS with French installed': [
    { name: 'English (United States)', lang: 'en-US', localService: true },
    { name: 'English (Canada)', lang: 'en-CA', localService: true },
    { name: 'français (Canada)', lang: 'fr-CA', localService: true },
    { name: 'français (France)', lang: 'fr-FR', localService: true },
  ],
  'Windows, English voices only (one of them "Canada")': [
    { name: 'Microsoft Richard - English (Canada)', lang: 'en-CA', localService: true },
    { name: 'Microsoft Linda - English (Canada)', lang: 'en-CA', localService: true },
    { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true },
  ],
  'Windows, French (Canada) and French (France)': [
    { name: 'Microsoft Richard - English (Canada)', lang: 'en-CA', localService: true },
    { name: 'Microsoft Caroline - French (Canada)', lang: 'fr-CA', localService: true },
    { name: 'Microsoft Hortense - French (France)', lang: 'fr-FR', localService: true },
  ],
  'Mac, language tag with an underscore': [
    { name: 'Amélie', lang: 'fr_CA', localService: true },
    { name: 'Thomas', lang: 'fr_FR', localService: true },
    { name: 'Samantha', lang: 'en_US', localService: true },
  ],
  'a French voice whose name says Québec, tagged only "fr"': [
    { name: 'Google français du Québec', lang: 'fr', localService: false },
    { name: 'Google US English', lang: 'en-US', localService: false },
  ],
  'no French voice and an English one named for Québec': [
    { name: 'English voice (Québec accent)', lang: 'en-CA', localService: true },
  ],
};
const expectFrench = {
  'Android, Google TTS with French installed': { qc: 'fr-CA', fr: 'fr-FR' },
  'Windows, English voices only (one of them "Canada")': { qc: null, fr: null },
  'Windows, French (Canada) and French (France)': { qc: 'fr-CA', fr: 'fr-FR' },
  'Mac, language tag with an underscore': { qc: 'fr_CA', fr: 'fr_FR' },
  'a French voice whose name says Québec, tagged only "fr"': { qc: 'fr', fr: 'fr' },
  'no French voice and an English one named for Québec': { qc: null, fr: null },
};

const fails = [];
let checks = 0;
for (const [name, voices] of Object.entries(lists)) {
  globalThis.window = { speechSynthesis: {} };
  globalThis.speechSynthesis = { getVoices: () => voices, addEventListener() {} };
  const mod = await import('../app/js/speech.js?' + encodeURIComponent(name));
  mod.initSpeech();
  const info = mod.frVoiceInfo();
  const byName = (n) => voices.find((v) => v.name === n)?.lang ?? null;
  const got = { qc: info.qc ? byName(info.qc) : null, fr: info.fr ? byName(info.fr) : null };
  const want = expectFrench[name];
  checks += 3;
  if (got.qc !== want.qc) fails.push(`${name}: the Québec voice is ${got.qc}, expected ${want.qc}`);
  if (got.fr !== want.fr) fails.push(`${name}: the France voice is ${got.fr}, expected ${want.fr}`);
  if (mod.frAvailable() !== !!(want.qc || want.fr)) fails.push(`${name}: frAvailable() is wrong`);
}
if (fails.length) { console.error('test-voices FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log(`test-voices: ${checks} checks — French is only ever read by a French voice, and "English (Canada)" is never mistaken for one.`);
