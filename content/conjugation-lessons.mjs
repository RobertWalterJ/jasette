// The lessons for the conjugation ladder (content/conjugation.mjs): one per step.
//
// Shown once, before the first drill of a step, and any time from the Conjugaison screen. Plain
// English: this is where a tense is TAUGHT, not tested. The model verb's table is read from the
// deck, so every form a lesson shows is one Wiktionary lists; the prose is mine, and the rules in
// it are the ones build/verify.mjs re-derives for the drills.
//
//   model   the verb whose table is shown (null: none)
//   show    the tenses to show for it
//   words   verbs listed with their participle (or stem), read from the deck
//   what / build / watch   what the tense is for · how it is made · what to look out for

export default {
  'present-essentiel': { model: 'être', show: ['pr'], words: ['avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'venir', 'voir', 'prendre', 'dire'],
    what: 'The present tense says what is true now, what is happening, and what happens regularly: je suis, tu as, nous allons. These twelve verbs are in almost every sentence.',
    build: 'There is no rule for these: all twelve are irregular, so each of the six forms has to be known. Start with être (to be) and avoir (to have). They are also the two helpers that build the past tense.',
    watch: 'Many have two stems, one for je / tu / il / ils and another for nous / vous: je veux, nous voulons; je peux, nous pouvons; je viens, nous venons. The nous and vous forms usually look more like the infinitive.' },
  'present-er': { model: 'parler', show: ['pr'],
    what: 'Most French verbs end in -er, and they all follow one pattern in the present tense: parler, aimer, chercher, trouver, regarder and hundreds more.',
    build: 'Drop the -er and add -e, -es, -e, -ons, -ez, -ent.',
    watch: 'Four of the six forms sound identical (je parle, tu parles, il parle, ils parlent). Only nous and vous sound different, so the spelling is where the work is. A few have spelling changes: manger → nous mangeons, acheter → j’achète, appeler → j’appelle.' },
  'present-irreguliers': { model: 'prendre', show: ['pr'],
    what: 'The other common verbs end in -ir or -re, or are irregular outright. It is the same present tense, but there is no single pattern to lean on.',
    build: 'The regular -ir verbs (finir, choisir) add -iss- in the plural: je finis, nous finissons. Regular -re verbs (vendre, attendre) lose the ending: je vends, nous vendons. Many common ones change stem: je prends, nous prenons, ils prennent.',
    watch: 'Look at the stem in the nous form and in the ils form. The change usually happens between them: je veux / nous voulons / ils veulent.' },
  'passe-compose': { model: 'parler', show: ['pc'], words: ['être', 'avoir', 'faire', 'prendre', 'voir', 'dire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'mettre'],
    what: 'The everyday past tense. It means both “I spoke” and “I have spoken”: j’ai parlé.',
    build: 'A helper in the present (avoir, for most verbs) plus the past participle. The participle of an -er verb ends in -é (parlé), of an -ir verb in -i (fini), of a regular -re verb in -u (vendu). Many common verbs have irregular participles, listed below.',
    watch: 'A small group of verbs of movement and change use être as the helper instead: aller, venir, arriver, partir, rester, tomber, naître, mourir, devenir, revenir, entrer. With être the participle agrees with the subject: il est allé, elle est allée, ils sont allés, elles sont allées.' },
  'imparfait': { model: 'parler', show: ['im'],
    what: 'The imperfect describes how things were, what used to happen, and the background to a story: il pleuvait (it was raining), nous habitions à Montréal (we used to live in Montréal).',
    build: 'Take the nous form of the present, drop -ons, and add -ais, -ais, -ait, -ions, -iez, -aient. Nous parlons → je parlais. The only verb that does not work this way is être (j’étais).',
    watch: 'The je and tu forms sound the same, and so do il and ils (parlait, parlaient). It is the tense for “was doing” and “used to”; the passé composé is for what happened once.' },
  'present-etendu': { model: 'acheter', show: ['pr'],
    what: 'The same present tense across the next several hundred verbs, including the ones that change their spelling to keep their sound.',
    build: 'The patterns you already know still apply. What is new is the spelling change in the stem: acheter → j’achète, appeler → j’appelle, payer → je paie, manger → nous mangeons, commencer → nous commençons.',
    watch: 'The change follows the sound: the stem is adjusted in je / tu / il / ils, while nous and vous keep the infinitive’s stem.' },
  'futur-proche': { model: 'aller', show: ['pr'],
    what: 'The near future: what is about to happen or what you plan to do. Je vais parler, tu vas manger.',
    build: 'The present tense of aller (shown below) plus the infinitive. Nothing else changes: the infinitive stays as it is.',
    watch: 'It is how people usually talk about the future out loud, and more so in Québec. The simple future (next step) is used more in writing.' },
  'futur-simple': { model: 'parler', show: ['fu'], words: ['être', 'avoir', 'aller', 'faire', 'voir', 'pouvoir', 'venir', 'vouloir', 'devoir', 'savoir'],
    what: 'The simple future: je parlerai (I will speak).',
    build: 'The infinitive plus -ai, -as, -a, -ons, -ez, -ont. A -re verb drops its final e first: vendre → je vendrai.',
    watch: 'About a dozen common verbs have an irregular stem (their future forms are listed below), but the endings are always the same. The stem is what you have to learn.' },
  'conditionnel': { model: 'parler', show: ['co'],
    what: 'The conditional: what would happen, and the polite way to ask. Je parlerais (I would speak); je voudrais un café (I would like a coffee).',
    build: 'The same stem as the future (parler-, ser-, aur-, ir-…) plus the imperfect’s endings: -ais, -ais, -ait, -ions, -iez, -aient.',
    watch: 'If you know the future stem you know the conditional stem. The only difference between je parlerai and je parlerais is the ending.' },
  'imperatif': { model: 'parler', show: ['pr'],
    what: 'The imperative gives orders, advice and invitations: parle ! parlons ! parlez !',
    build: 'Take the tu, nous and vous forms of the present and drop the pronoun. Tu parles → parle ! Nous parlons → parlons ! Vous parlez → parlez !',
    watch: 'An -er verb (and aller, ouvrir, offrir…) loses the final s of tu: tu parles → parle, but tu finis → finis. Three verbs are irregular: être → sois, soyons, soyez; avoir → aie, ayons, ayez; savoir → sache, sachons, sachez.' },
  'passe-compose-etendu': { model: 'prendre', show: ['pc'], words: ['être', 'avoir', 'faire', 'prendre', 'voir', 'dire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'mettre', 'venir'],
    what: 'More verbs in the past tense. The build is the one you know; what is new is learning the participles that do not end in -é, -i or -u.',
    build: 'Helper + participle, as before. The irregular participles are the part that has to be learnt one by one. The ones listed below cover a large share of everything you will say in the past.',
    watch: 'Look for families: mettre / permettre / promettre all give -mis; prendre / comprendre / apprendre all give -pris.' },
  'plus-que-parfait': { model: 'parler', show: ['pqp'],
    what: 'The pluperfect: the past before another past. J’avais parlé (I had spoken).',
    build: 'The imperfect of the helper (avais, avais, avait, avions, aviez, avaient, or étais… for the être verbs) plus the past participle.',
    watch: 'It shows which of two past events came first: the one in the pluperfect happened earlier. The participle is the same one you used in the passé composé.' },
  'subjonctif': { model: 'parler', show: ['su'], words: ['être', 'avoir', 'aller', 'faire', 'pouvoir', 'savoir', 'vouloir'],
    what: 'The subjunctive follows expressions of need, wish, doubt and feeling: il faut que tu parles, je veux qu’il vienne, bien qu’elle soit partie.',
    build: 'For most verbs, take the ils form of the present, drop -ent, and add -e, -es, -e, -ions, -iez, -ent. Ils parlent → que je parle. Nous and vous use the imperfect’s forms (que nous parlions).',
    watch: 'For regular -er verbs it looks just like the present, so you cannot see it. It shows in the irregular ones, listed below. It always comes after que.' },
  'conditionnel-passe': { model: 'parler', show: ['cop', 'fa'],
    what: 'Two more compound tenses. The conditional perfect: j’aurais parlé (I would have spoken). The future perfect: j’aurai parlé (I will have spoken).',
    build: 'The same two-part build as the passé composé, with the helper in a different tense: the conditional or the future of avoir or être.',
    watch: 'The participle never changes. Only the helper does, so these are mostly a matter of knowing the helper’s conditional and future forms.' },
  'subjonctif-passe': { model: 'parler', show: ['sup'],
    what: 'The past subjunctive: the subjunctive for something that has already happened. Bien qu’il ait parlé (although he has spoken).',
    build: 'The subjunctive of the helper (aie, aies, ait, ayons, ayez, aient, or sois, sois, soit… for être verbs) plus the past participle.',
    watch: 'It is used where the present subjunctive would be, but the action is finished. It is mostly met in writing and careful speech.' },
  'tout-le-reste': { model: null, show: [],
    what: 'The long tail: every verb up to the 3,500th most frequent word, in two tenses each.',
    build: 'Nothing new here: the patterns, stems and participles of the earlier steps apply. When a verb is irregular, the answer the app shows you afterwards is the lesson.',
    watch: 'These are rarer verbs, so treat wrong answers as the point: each one comes back on a later day with the full pattern shown.' },
};

// What each step is built from. A lesson shows these as the "building blocks", with how the
// learner is doing on each, and the next step opens only once the one before is going reasonably
// well. Each id must be an EARLIER step (build/verify.mjs checks), so the ladder only ever builds
// on what has already been taught. `uses` says, in a line, what is carried over.
export const BUILDS = {
  'present-essentiel': { from: [], uses: 'Nothing yet: this is the first block. Everything else stands on être and avoir.' },
  'present-er': { from: ['present-essentiel'], uses: 'The six-person frame (je, tu, il, nous, vous, ils) that you met with the twelve essentials.' },
  'present-irreguliers': { from: ['present-er'], uses: 'The regular pattern, so you can see exactly where these verbs break it.' },
  'passe-compose': { from: ['present-essentiel', 'present-er'], uses: 'The present of avoir and être (the helper), and the -er pattern, whose participle ends in -é.' },
  'imparfait': { from: ['present-er', 'present-irreguliers'], uses: 'The nous form of the present: the imperfect is built from it.' },
  'present-etendu': { from: ['present-er', 'present-irreguliers'], uses: 'Both present-tense patterns, now with spelling changes.' },
  'futur-proche': { from: ['present-essentiel'], uses: 'The present of aller, which you already know.' },
  'futur-simple': { from: ['present-er', 'present-irreguliers'], uses: 'The infinitive and the present-tense patterns: the future is built on the infinitive.' },
  'conditionnel': { from: ['futur-simple', 'imparfait'], uses: 'The future’s stem and the imperfect’s endings, both taught earlier.' },
  'imperatif': { from: ['present-er', 'present-irreguliers'], uses: 'The tu, nous and vous forms of the present.' },
  'passe-compose-etendu': { from: ['passe-compose'], uses: 'The same build, with more participles.' },
  'plus-que-parfait': { from: ['imparfait', 'passe-compose'], uses: 'The imperfect (for the helper) and the participle you learnt for the passé composé.' },
  'subjonctif': { from: ['present-er', 'present-irreguliers', 'imparfait'], uses: 'The ils form of the present, and the imperfect’s nous and vous forms.' },
  'conditionnel-passe': { from: ['passe-compose', 'conditionnel', 'futur-simple'], uses: 'The passé composé build, with the helper in the conditional or the future.' },
  'subjonctif-passe': { from: ['subjonctif', 'passe-compose'], uses: 'The subjunctive of the helper and the participle.' },
  'tout-le-reste': { from: ['passe-compose-etendu', 'subjonctif'], uses: 'Everything: this step is the whole ladder, applied to rarer verbs.' },
};
