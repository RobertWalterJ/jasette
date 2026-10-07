// The course: eight stages, from "les bases" to "aisance".
//
// A stage is a band of the frequency list (`from`–`to` are ranks in the deck,
// which is Lexique's films-and-books ranking) plus the grammar points that
// become useful at that size of vocabulary. It is passed when `gate` of its
// words can be answered AND each of its grammar points has been met.
//
// The gate is lower than Hok Gong's. Hok Gong teaches from nothing; this
// app is for someone who already has French and wants to keep and extend it.
// What a stage is for here is ORDER (the shape of what comes next), not
// permission — and a placement round at the start sets where you stand, so
// nobody is asked what chat means before being asked what lutte means.
//
// The CEFR labels are orientation only: the bands are frequency ranks, and no
// frequency band is a CEFR level. They are given because people want to know.

export default [
  { id: 'les-bases', title: 'Les bases', en: 'The basics', cefr: 'A1', from: 1, to: 350, gate: 0.6,
    can: 'Greet people, ask for what you need, and follow slow, simple speech about everyday things.',
    why: 'The 350 commonest words cover about two thirds of everything said in French. They are mostly short, mostly irregular, and mostly the same in Québec and in France.',
    grammar: ['gender', 'etre-avoir', 'present-er'] },
  { id: 'le-quotidien', title: 'Le quotidien', en: 'Everyday life', cefr: 'A2', from: 351, to: 900, gate: 0.6,
    can: 'Shop, travel, order a meal and make small talk; say what you did yesterday.',
    why: 'Past time arrives here, because small talk is mostly about what just happened. This is also where Québec starts to sound different: the meals change names, and a dépanneur appears.',
    grammar: ['passe-compose', 'present-irreg', 'negation', 'homophones-1'] },
  { id: 'se-debrouiller', title: 'Se débrouiller', en: 'Getting by', cefr: 'A2+', from: 901, to: 1600, gate: 0.6,
    can: 'Get through an unplanned conversation about home, work, family and plans.',
    why: 'The imperfect lets you describe how things were, and the little pronouns y and en stop your sentences sounding like a phrasebook.',
    grammar: ['imparfait', 'futur-proche', 'pronouns-object', 'homophones-2'] },
  { id: 'raconter', title: 'Raconter', en: 'Telling a story', cefr: 'B1', from: 1601, to: 2500, gate: 0.6,
    can: 'Tell a story with a beginning, a middle and a reason; say what you used to do and what you would do.',
    why: 'Telling a story means holding two past tenses against each other, and the future and conditional let you step out of the past again.',
    grammar: ['futur-simple', 'conditionnel', 'accord-etre', 'relatives'] },
  { id: 'donner-son-avis', title: 'Donner son avis', en: 'Giving an opinion', cefr: 'B1+', from: 2501, to: 3600, gate: 0.6,
    can: 'Agree, disagree and say why; follow a radio programme and most of a film.',
    why: 'Opinion is where the subjunctive begins: "il faut que", "je veux que". It is the thing English speakers most often avoid, and most often get away with avoiding, until a conversation turns serious.',
    grammar: ['subjonctif'] },
  { id: 'nuancer', title: 'Nuancer', en: 'Adding nuance', cefr: 'B2', from: 3601, to: 4800, gate: 0.6,
    can: 'Hedge, qualify and concede; read a news article with only an occasional lookup.',
    why: 'Words at this size are rarer, longer and more often abstract. Most are cognates with English — which helps, and is also where the false friends live.',
    grammar: [] },
  { id: 'lire-la-presse', title: 'Lire la presse', en: 'Reading the press', cefr: 'B2+', from: 4801, to: 6000, gate: 0.6,
    can: 'Read an editorial or a long report and follow the argument.',
    why: 'Written French diverges from spoken French here: the vocabulary is the vocabulary of print.',
    grammar: [] },
  { id: 'aisance', title: 'Aisance', en: 'Fluency', cefr: 'C1', from: 6001, to: 7000, gate: 0.6,
    can: 'Understand nearly everything, including the literary and the formal, and notice register.',
    why: 'The last thousand words in this list are the ones a well-read adult would recognise and a learner often will not.',
    grammar: [] },
];
