// The conjugation ladder: which verbs, in which tenses, in what order.
//
// A rung is a (set of tenses) × (set of verbs). It opens when the one before it is about half
// met, or when the learner chooses to skip ahead (they may know the early rungs already).
// Verbs are picked by frequency rank, so "the commonest verbs and tenses first, then onwards
// and upwards" is literally the order of this file. The generator in build/items.mjs turns each
// rung into questions; build/verify.mjs checks every answer against the verb's own table.
//
//   tenses  pr present · im imparfait · fu futur simple · co conditionnel · su subjonctif présent
//           pc passé composé · pqp plus-que-parfait · fa futur antérieur
//           cop conditionnel passé · sup subjonctif passé · fp futur proche · ip impératif
//   verbs   { only: [lemmas] }  or  { maxRank, kind: 'er' | 'irregular' | 'any' }
//   persons how many persons of each verb are asked (the verbs in `only` get all six)
//   stage   which stage of the course the rung sits beside (0 = Les bases … 7 = Aisance)
//
// "why" is plain English for the screen that lists the ladder.

export const ESSENTIAL = ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'venir', 'voir', 'prendre', 'dire'];

export default [
  { id: 'present-essentiel', title: 'Le présent : les douze essentiels', en: 'Present tense: the twelve essentials', tenses: ['pr'], verbs: { only: ESSENTIAL }, persons: 6, stage: 0,
    why: 'être, avoir, aller, faire and eight more. Nearly every sentence you say uses one of them, and all twelve are irregular, so they have to be known by heart.' },
  { id: 'present-er', title: 'Le présent : les verbes en -er', en: 'Present tense: regular -er verbs', tenses: ['pr'], verbs: { maxRank: 500, kind: 'er' }, persons: 2, stage: 0,
    why: 'Nine out of ten French verbs follow this one pattern. Learn it once and it covers parler, aimer, chercher, trouver and hundreds more.' },
  { id: 'present-irreguliers', title: 'Le présent : les autres verbes courants', en: 'Present tense: the other common verbs', tenses: ['pr'], verbs: { maxRank: 500, kind: 'irregular' }, persons: 3, stage: 1,
    why: 'The -ir and -re verbs and the irregulars. Each has a stem that changes (prends / prenons / prennent), which is why they are asked in several persons.' },
  { id: 'passe-compose', title: 'Le passé composé', en: 'The past tense (“I have spoken”, “I spoke”)', tenses: ['pc'], verbs: { maxRank: 400, kind: 'any' }, persons: 2, stage: 1,
    why: 'The everyday past: a helper (avoir, or être for a few verbs of movement) plus the participle. Most of the work is knowing which helper, and the participle.' },
  { id: 'imparfait', title: 'L’imparfait', en: 'The imperfect (“I was speaking”, “I used to speak”)', tenses: ['im'], verbs: { maxRank: 500, kind: 'any' }, persons: 2, stage: 2,
    why: 'How things were. It is built from the “nous” form of the present, so once you know that, it is nearly regular.' },
  { id: 'present-etendu', title: 'Le présent : plus de verbes', en: 'Present tense: more verbs', tenses: ['pr'], verbs: { maxRank: 1200, kind: 'any' }, persons: 2, stage: 2,
    why: 'The same tense, now across the next several hundred verbs, including the ones with spelling changes (appeler → j’appelle, acheter → j’achète).' },
  { id: 'futur-proche', title: 'Le futur proche', en: 'The near future (“I’m going to speak”)', tenses: ['fp'], verbs: { maxRank: 400, kind: 'any' }, persons: 1, stage: 2,
    why: 'aller + the infinitive. It is how people actually talk about what is next, in Québec most of all.' },
  { id: 'futur-simple', title: 'Le futur simple', en: 'The future (“I will speak”)', tenses: ['fu'], verbs: { maxRank: 600, kind: 'any' }, persons: 2, stage: 3,
    why: 'The infinitive plus endings, with a handful of irregular stems (ir-, ser-, aur-, fer-, ver-).' },
  { id: 'conditionnel', title: 'Le conditionnel', en: 'The conditional (“I would speak”)', tenses: ['co'], verbs: { maxRank: 600, kind: 'any' }, persons: 2, stage: 3,
    why: 'The future’s stem with the imperfect’s endings. It is also the polite form: je voudrais, pourriez-vous.' },
  { id: 'imperatif', title: 'L’impératif', en: 'The imperative (“Speak!”)', tenses: ['ip'], verbs: { maxRank: 500, kind: 'any' }, persons: 1, stage: 3,
    why: 'Orders and invitations: parle, parlons, parlez. Mostly the present with the subject dropped; the -er verbs lose the s of “tu”.' },
  { id: 'passe-compose-etendu', title: 'Le passé composé : plus de verbes', en: 'The past tense: more verbs', tenses: ['pc'], verbs: { maxRank: 1500, kind: 'any' }, persons: 1, stage: 3,
    why: 'Irregular participles (pris, fait, vu, dit, mis, venu) are the part that has to be learnt one by one.' },
  { id: 'plus-que-parfait', title: 'Le plus-que-parfait', en: 'The past before the past (“I had spoken”)', tenses: ['pqp'], verbs: { maxRank: 800, kind: 'any' }, persons: 1, stage: 4,
    why: 'The imperfect of avoir or être plus the participle: what had already happened when something else did.' },
  { id: 'subjonctif', title: 'Le subjonctif présent', en: 'The subjunctive (“that I speak”)', tenses: ['su'], verbs: { maxRank: 800, kind: 'any' }, persons: 2, stage: 4,
    why: 'After il faut que, je veux que, bien que. Regular verbs look like the present, so the work is in the irregular ones (que je sois, que j’aie, que je fasse).' },
  { id: 'conditionnel-passe', title: 'Le conditionnel passé et le futur antérieur', en: 'The conditional perfect and the future perfect', tenses: ['cop', 'fa'], verbs: { maxRank: 600, kind: 'any' }, persons: 1, stage: 5,
    why: '“I would have spoken” and “I will have spoken”: the same two-part build as the passé composé, with the helper in a different tense.' },
  { id: 'subjonctif-passe', title: 'Le subjonctif passé', en: 'The past subjunctive (“that I have spoken”)', tenses: ['sup'], verbs: { maxRank: 600, kind: 'any' }, persons: 1, stage: 5,
    why: 'The subjunctive of avoir or être plus the participle, for what has already happened: bien qu’il soit parti.' },
  { id: 'tout-le-reste', title: 'Les verbes moins courants, tous les temps', en: 'The less common verbs, in every tense', tenses: ['pr', 'im', 'fu', 'co', 'su', 'pc'], verbs: { maxRank: 3500, kind: 'any' }, persons: 1, perVerb: 2, stage: 6,
    why: 'The long tail: every verb up to the 3,500th most frequent word, in two of the six main tenses each (a different two for each verb), one person at a time.' },
];
