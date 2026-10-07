// Jasette — plain English, where it matters.
//
// The interface is French with its English underneath, and the English fades as you get used
// to it (strings.js). That is right for a menu. It is NOT right for the things a learner must
// understand to use the app at all: what the level check is, how to answer a kind of question
// they have not met, and that a wrong answer is fine. Those are English, in full, and they
// do not fade on a schedule. Robert, on the first run: "on an initial assessment, I think
// that the instructions need to actually be understood clearly".

import { h } from './ui.js';
import { State } from './schedule.js';

// A short English tip for each kind of question, shown the first few times that kind turns up.
export const HINTS = {
  'word-read': 'Read the French word, then tap the English meaning. Not sure? Just guess — a wrong answer is how you learn it, and it will come back.',
  'word-listen': 'Press play and listen, then tap the English meaning. You can play it again.',
  'word-pick': 'Here is an English meaning. Tap the French word that matches it.',
  'word-say': 'Say the word out loud, then tap “Montre-moi” (Show me) to see it, and tell the app whether you had it.',
  'word-cloze': 'One word is missing. Tap the word that fits — it drops into the gap.',
  'conj-pick': 'Tap the correct form of the verb for the gap. The verb and the tense are shown above the sentence.',
  'conj-drill': 'You are given a verb, a tense and a pronoun. Tap the form of the verb that goes with that pronoun in that tense. After you answer you will see the whole pattern.',
  'aux-pick': 'Past tense: does this verb use “avoir” or “être”? Tap the form that fits the gap.',
  'agree-pick': 'Tap the spelling of the past participle that agrees with the subject.',
  'pronoun-pick': 'Tap the little pronoun that fits the gap. The English translation tells you what it stands for.',
  'homophone-pick': 'These words sound the same but are spelled differently. Tap the right one for the gap.',
  'fill-multi': 'Tap the words, in order, to fill the blanks, then tap “Vérifier” (Check). Tap a word already placed to take it back out.',
  'sentence-listen': 'Press play and listen, then tap the English translation of what you heard.',
  'gender-pick': 'Is this noun masculine (“un”) or feminine (“une”)? Tap one.',
  'spell-pick': 'Press play, listen, then tap the correct spelling.',
  'sound-pair': 'Listen, then tap which of the two words you heard.',
  'grammar-build': 'Tap the words in the right order to build the sentence. Tap a placed word to take it back.',
  'note-pick': 'Tap the French word that fits the English description.',
  'qc-mean': 'This is a Québec French word. Tap what it means.',
  'qc-pick': 'Tap the French word people say in Québec for this.',
  'qc-listen': 'Press play to hear a Québec voice, then tap what the word means.',
  'qc-oral': 'This is how it is said aloud. Tap the written-out form.',
};
const SHOW_TIMES = 4;

// The tip for a kind, or null once it has been shown enough times.
export function hintFor(kind) {
  const ui = (State.data.ui ||= { seen: {} });
  const n = (ui.hints ||= {})[kind] || 0;
  if (!HINTS[kind] || n >= SHOW_TIMES) return null;
  ui.hints[kind] = n + 1;
  return HINTS[kind];
}
export const tipNode = (text) => h('p', { class: 'tip' }, h('b', {}, 'How to answer: '), text);

// After a wrong answer, for the first few: it is fine.
export function reassurance() {
  const ui = (State.data.ui ||= { seen: {} });
  const n = ui.wrongNotes || 0;
  if (n >= 6) return null;
  ui.wrongNotes = n + 1;
  return h('p', { class: 'tip soft' }, 'That’s fine — getting it wrong is part of learning. This one will come back on a later day, so you’ll get another go.');
}

// The long version: what the app is and how a day with it goes.
export const GUIDE = [
  ['What Jasette is', 'You already know some French. Jasette finds out how much, then helps you keep it and add to it — Québec French and France French, by ear, by eye and by hand.'],
  ['Start with the level check', 'About 30 words, from the commonest to the rarest. For each, tap its English meaning, or tap “Je ne sais pas” (I don’t know). It takes about five minutes and has no timer. It estimates your vocabulary and decides where the course starts, so you are not asked what “chat” means before you are asked something new.'],
  ['A round', 'Tap Commencer (Start) on the home screen. A round is about 40 short questions — a mix of words you are learning and words coming back for review. Each question tells you, in English at first, how to answer it.'],
  ['Getting it wrong is the point', 'A wrong answer is not a mark against you. It shows you the answer, and the question comes back on a later day, usually in a different form, until it sticks. Questions are never repeated within the same session, so you will not see the same one twice in a row.'],
  ['What “spot checks” are', 'Words from the stages before the one you placed at are assumed known. Now and then one turns up as a quick check. Get it right and it stays out of your way for two weeks; get it wrong and it becomes new material.'],
  ['Tapping words into gaps', 'In sentence questions, tap a word from the bank and it drops into the next blank. Tap a placed word to take it back out. With several blanks, tap Vérifier (Check) when they are all filled.'],
  ['Listening', 'Press the play button. Words come in two accents where we have both: Québec and France. The label says whose voice it is, and whether it is a person or the phone’s own voice.'],
  ['Conjugation', 'On the home screen, the Conjugaison card opens a section just for verbs. You are given a pronoun, a verb and a tense, and you tap the right form. It starts with the twelve verbs you use in almost every sentence, then moves on to more verbs and more tenses, step by step. It has its own number of new questions a day, which you can change there, and you can open the next step early if you already know the one before.'],
  ['Having questions read to you', 'Every question has an À voix haute (Aloud) button, and every choice has a small speaker beside it. In Réglages (Settings), Lecture à voix haute (Read aloud) can say each question for you as soon as it appears, with or without the choices, and can read the answer afterwards. Touching anything stops it. It uses your phone’s own voices.'],
  ['The English in the menus', 'Menus are in French with English underneath. Each phrase’s English quietly disappears once you have seen it on several different days. You can bring it all back, or turn it off, in Réglages (Settings). Long-press any French phrase to see its English.'],
  ['Your progress is yours', 'It is stored on this phone only. Réglages has a button to save a copy and another to restore one, in case you change phones.'],
];
