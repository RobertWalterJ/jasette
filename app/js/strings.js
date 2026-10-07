// Jasette — the interface speaks French, and says so in English underneath.
//
// Four modes, set in Réglages:
//   fade  (the default) French first, with the English in small type underneath — and the
//         English goes quiet, phrase by phrase, as the phrase becomes familiar: once it has
//         been seen on enough different days, or sooner for someone who placed high. A
//         quiet phrase keeps its English in the long-press tooltip, and Réglages can bring
//         every one of them back. The menus are the easy part to learn by use, so they are
//         the part to take the scaffolding off first.
//   both  French first, the English always shown
//   fr    French only
//   en    English only
//
// Every French phrase here is checked by build/verify.mjs: each word must be
// a spelling Lexique knows, so a typo in the interface fails the build the way
// a typo in a lesson would.

let mode = 'fade';
export const setMode = (m) => { mode = m; };
export const getMode = () => mode;

// How many different days a phrase has been on screen, kept in the saved state so the fade
// survives a reload. `ui.seen[key] = { n, last }`.
let ui = { seen: {} };
let fadeAfter = 6;
export const setUi = (obj, { quick = false } = {}) => { ui = obj; ui.seen = ui.seen || {}; fadeAfter = quick ? 3 : 6; };
export const resetFade = () => { ui.seen = {}; };
const today = () => new Date().toISOString().slice(0, 10);
// Has this phrase been seen enough that its English can go quiet?
function faded(key) {
  const s = ui.seen[key] || (ui.seen[key] = { n: 0, last: '' });
  const d = today();
  if (s.last !== d) { s.n++; s.last = d; }
  return s.n > fadeAfter;
}
export const fadeStats = () => { const keys = Object.keys(STR); const quiet = keys.filter((k) => (ui.seen[k]?.n || 0) > fadeAfter).length; return { quiet, total: keys.length }; };

const STR = {
  // tabs and screens
  today: ['Aujourd’hui', 'Today'], course: ['Parcours', 'Course'], words: ['Mots', 'Words'], progress: ['Progrès', 'Progress'],
  settings: ['Réglages', 'Settings'], back: ['Retour', 'Back'], close: ['Fermer', 'Close'],
  // home
  hello: ['Bonjour', 'Hello'], goodAfternoon: ['Bon après-midi', 'Good afternoon'], goodEvening: ['Bonsoir', 'Good evening'],
  start: ['Commencer', 'Start'], keepGoing: ['Continuer', 'Keep going'], again: ['Encore une série', 'One more round'], practise: ['Revoir ce que je connais', 'Review what I know'],
  firstRound: ['Ta première série', 'Your first round'], aboutMin: ['environ {n} minutes', 'about {n} minutes'],
  toReview: ['à revoir', 'to review'], newWords: ['nouveaux', 'new'], upToDate: ['Tout est à jour', 'You are up to date'],
  recall: ['Test de rappel', 'Recall test'], recallNote: ['Ce que tu risques d’oublier', 'What you are likeliest to forget'],
  findLevel: ['Trouver mon niveau', 'Find my level'], findLevelNote: ['Environ 5 minutes', 'About five minutes'],
  wordOfDay: ['Mot du jour', 'Word of the day'], qcOfDay: ['Au Québec', 'In Québec'],
  daysRun: ['jours de suite', 'days in a row'], notOutLoud: ['Pas à voix haute', 'Not out loud'], notOutLoudNote: ['Pour le bus ou la salle d’attente', 'For a bus or a waiting room'],
  speakOn: ['Parler à voix haute', 'Speak out loud'],
  // round
  right: ['Exact', 'Right'], notQuite: ['Pas tout à fait', 'Not quite'], next: ['Continuer', 'Continue'], check: ['Vérifier', 'Check'],
  listen: ['Écouter', 'Listen'], listenAgain: ['Réécouter', 'Listen again'], play: ['Écouter', 'Play'], sayIt: ['Dis-le', 'Say it'], showMe: ['Montre-moi', 'Show me'],
  iKnewIt: ['Je le savais', 'I knew it'], notYet: ['Pas encore', 'Not yet'], dontKnow: ['Je ne sais pas', 'I don’t know'],
  gotIt: ['Compris', 'Got it'], newWord: ['Un nouveau mot', 'A new word'],
  roundDone: ['Série terminée', 'Round finished'], recallDone: ['Test terminé', 'Recall test finished'], done: ['Terminé', 'Done'],
  question: ['Question {a} sur {b}', 'Question {a} of {b}'],
  outOf: ['{r} sur {n}', '{r} out of {n}'],
  // skills
  listening: ['Écouter', 'Listening'], speaking: ['Parler', 'Speaking'], reading: ['Lire', 'Reading'], writing: ['Écrire', 'Writing'], grammar: ['Grammaire', 'Grammar'], canada: ['Québec', 'Québec'],
  // prompts
  pMean: ['Que veut dire ce mot?', 'What does this mean?'], pHear: ['Que veut dire ce mot?', 'What does this mean?'], pSay: ['Dis ce mot', 'Say this word'],
  pWhich: ['Lequel veut dire ceci?', 'Which one means this?'], pGap: ['Quel mot manque?', 'Which word is missing?'], pGaps: ['Touche les mots pour remplir les blancs', 'Tap the words to fill the blanks'],
  pSentence: ['Que dit-on?', 'What is being said?'], pGender: ['Un ou une?', 'Un or une?'], pForm: ['Quelle forme?', 'Which form?'], pConj: ['Conjugue ce verbe', 'Conjugate this verb'], pRepeat: ['Écoute et répète', 'Listen and repeat'], pRow: ['Toute la conjugaison', 'The whole conjugation'], pAcross: ['À travers les temps', 'Across the tenses'], pSaySentence: ['Dis-le en français', 'Say it in French'], pIdiom: ['Que veut dire cette expression?', 'What does this expression mean?'], teachNew: ['Expliquer chaque nouveau mot d’abord', 'Explain each new word first'], conjTitle: ['Conjugaison', 'Conjugation'], pAux: ['Avoir ou être?', 'Avoir or être?'],
  pAgree: ['Comment s’écrit le participe?', 'How is the participle spelled?'], pSpell: ['Comment ça s’écrit?', 'How is it spelled?'], pHomo: ['Lequel?', 'Which one?'],
  pSound: ['Lequel as-tu entendu?', 'Which one did you hear?'], pOrder: ['Remets dans l’ordre', 'Put it in order'], pPronoun: ['Quel pronom?', 'Which pronoun?'],
  pQcMean: ['Au Québec, ça veut dire…', 'In Québec, this means…'], pQcWord: ['Au Québec, on dit…', 'In Québec, you say…'], pQcOral: ['À l’écrit, ça donne…', 'Written out, this is…'],
  pWhichDo: ['Lequel dit-on?', 'Which do you say?'],
  // words tab
  searchWords: ['Chercher un mot', 'Look up a word'], all: ['Tout', 'All'], verbs: ['Verbes', 'Verbs'], nouns: ['Noms', 'Nouns'], adjectives: ['Adjectifs', 'Adjectives'], qcOnly: ['Québec', 'Québec'], forgotten: ['À revoir', 'To review'],
  notMet: ['pas encore vu', 'not met yet'], met: ['vu', 'met'], known: ['connu', 'known'],
  conjugation: ['Conjugaison', 'Conjugation'], examples: ['Exemples', 'Examples'], inQuebec: ['Au Québec', 'In Québec'], inFrance: ['En France', 'In France'],
  // course
  stage: ['Étape', 'Stage'], youAreHere: ['Tu es ici', 'You are here'], passed: ['Étape réussie', 'Stage passed'], wordsKnown: ['{a} sur {b} mots', '{a} of {b} words'], points: ['points de grammaire', 'grammar points'],
  // settings
  sound: ['Sons', 'Sound'], voice: ['Accent des mots', 'Accent for words'], voiceQc: ['Québec', 'Québec'], voiceFr: ['France', 'France'], voiceBoth: ['Les deux', 'Both'],
  look: ['Apparence', 'Look'], language: ['Langue de l’interface', 'Interface language'], bilingual: ['Bilingue', 'Bilingual'], french: ['Français', 'French'], english: ['English', 'English'],
  scheme: ['Clair ou sombre', 'Light or dark'], auto: ['Auto', 'Auto'], light: ['Clair', 'Light'], dark: ['Sombre', 'Dark'],
  bigText: ['Texte plus grand', 'Larger text'], spacing: ['Espacement pour lire plus facilement', 'Roomier spacing for easier reading'],
  sitting: ['Durée d’une série', 'Length of a round'], pace: ['Rythme des nouveautés', 'Pace of new material'],
  saveCopy: ['Sauvegarder ma progression', 'Save a copy of my progress'], restore: ['Restaurer une copie', 'Restore from a copy'],
  offline: ['Audio hors ligne', 'Audio offline'], downloadAudio: ['Télécharger tout l’audio', 'Download all the audio'],
  about: ['Sources et licences', 'Sources and licences'],
  soundsVoices: ['Voix et sons', 'Voices and sounds'], rhythm: ['Rythme', 'Pace'], yourProgress: ['Ta progression', 'Your progress'], vocabulary: ['Vocabulaire', 'Vocabulary'], skills: ['Compétences', 'Skills'],
  whyThese: ['Pourquoi ces mots, maintenant ?', 'Why these words now?'], moreWords: ['Plus de mots', 'More words'], nothingFound: ['Aucun mot trouvé.', 'No word found.'], result: ['Résultat', 'Result'], whereAreYou: ['Où en es-tu ?', 'Where are you?'],
  install: ['Installer sur l’écran d’accueil', 'Install on your home screen'], installNote: ['Une icône, plein écran, et ça marche sans réseau.', 'An icon, full screen, and it works offline.'],
  installed: ['Installée', 'Installed'], installSteps: ['Comment l’installer', 'How to install it'], installNow: ['Installer maintenant', 'Install now'], later: ['Plus tard', 'Not now'],
  storage: ['Stockage de l’audio', 'Audio storage'], audioCap: ['Espace pour les autres enregistrements', 'Room for the other recordings'], keepCore: ['Garder l’essentiel hors ligne', 'Keep the essentials offline'], freeSpace: ['Libérer de l’espace', 'Free up space'],
  readAloud: ['Lecture à voix haute', 'Read aloud'], autoRead: ['Lecture automatique', 'Auto-read'], off: ['Non', 'Off'], readQ: ['La question', 'The question'], readQC: ['Question et choix', 'Question and choices'],
  readFeedback: ['Lire aussi la réponse', 'Read the answer too'], showSpeakers: ['Un haut-parleur à côté de chaque choix', 'A speaker beside each choice'], speechRate: ['Vitesse de la voix', 'Voice speed'],
  slow: ['Lente', 'Slow'], normal: ['Normale', 'Normal'], fast: ['Rapide', 'Fast'], testVoices: ['Essayer les voix', 'Try the voices'],
  fade: ['L’anglais s’efface', 'English fades as you learn'], fadeNote: ['Chaque phrase garde son anglais jusqu’à ce que tu l’aies vue plusieurs jours.', 'Each phrase keeps its English until you have seen it on several days.'],
  showEnglish: ['Remettre tout l’anglais', 'Bring all the English back'], englishBack: ['L’anglais est de retour.', 'The English is back.'],
};

// A phrase with {n} slots filled.
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v && v[k] != null ? v[k] : ''));
// The main text in the current mode.
export function t(key, v) {
  const e = STR[key];
  if (!e) return key;
  return fill(mode === 'en' ? e[1] : e[0], v);
}
// The English underneath: always in 'both', until the phrase is familiar in 'fade', never in 'fr' or 'en'.
export function sub(key, v) {
  const e = STR[key];
  if (!e || mode === 'fr' || mode === 'en') return '';
  if (mode === 'fade' && faded(key)) return '';
  return fill(e[1], v);
}
// The English, always, for a long-press tooltip on a phrase whose English has gone quiet.
export const gloss = (key, v) => { const e = STR[key]; return e && mode !== 'en' ? fill(e[1], v) : ''; };
export const STRINGS = STR;
