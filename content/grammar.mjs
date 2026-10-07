// Grammar points.
//
// Each has a plain account (`plain`), the thing an English speaker gets wrong
// (`watch`), and a drill built from real material (`drill`, resolved by
// build/items.mjs). The prose is mine, and the app says so; every example
// sentence it shows is a Tatoeba sentence with its author and licence.
//
// `drill` names what builds the questions:
//   gender         — un or une, for nouns Lexique and Wiktionary agree on
//   conj:<tense>   — the form of a verb, from Wiktionary's conjugation table
//   aux            — avoir or être, for the passé composé
//   agree          — the participle agreeing with an être subject
//   homophones     — which of two or three words that sound alike
//   pronoun        — which object pronoun goes in the gap
//   build          — put a real sentence in order; `match` finds them
//
// `match` finds example sentences. It is a regular expression over the French
// text; build/items.mjs prefers the shortest sentences that carry a recording.
//
// A point is "met" when one of its questions has been answered right, so every
// point listed in a stage MUST have at least one askable question —
// build/verify.mjs fails the build if one has none.

export default [
  { id: 'gender', title: 'Un or une', fr: 'Un ou une', drill: 'gender',
    plain: 'Every French noun is masculine or feminine, and nothing about the thing itself tells you which. Masculine nouns take un or le; feminine nouns take une or la. Endings help — and the app measures how well on its own word list, so you can see how far to trust them.',
    watch: 'English gives you no warning, so the only safe habit is to learn the noun with its article: une maison, un chat, never just maison.',
    endings: { f: ['tion', 'té', 'ure', 'ette', 'ance', 'ence', 'ie', 'ée'], m: ['age', 'ment', 'eau', 'isme', 'ier', 'eur', 'oir'] } },
  { id: 'etre-avoir', title: 'Être, avoir, aller, faire', fr: 'Être, avoir, aller, faire', drill: 'conj:pr', lemmas: ['être', 'avoir', 'aller', 'faire'],
    plain: 'Être (to be) and avoir (to have) are the two verbs everything else leans on. They are irregular, they are the commonest words in the language, and they are the helpers that build the past. Aller (to go) and faire (to do, to make) are nearly as irregular and nearly as common.',
    watch: 'In speech, tu es shrinks to t’es, and in Québec je suis is often heard as chu — chu fatigué. Both are normal, and neither is written in a letter.' },
  { id: 'present-er', title: 'The -er verbs', fr: 'Les verbes en -er', drill: 'conj:pr', regular: 'er',
    plain: 'Most French verbs end in -er and follow one pattern: drop the -er and add -e, -es, -e, -ons, -ez, -ent. Parler: je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent.',
    watch: 'Four of those six forms sound identical. Only nous and vous are audibly different, so the spelling — the part that is silent — is what fades first.' },
  { id: 'passe-compose', title: 'The everyday past', fr: 'Le passé composé', drill: 'aux',
    plain: 'The passé composé is a helper plus a past participle. Most verbs take avoir: j’ai mangé. About a dozen verbs of movement or change take être — aller, venir, arriver, partir, rester, tomber, mourir and their compounds — and so does every reflexive verb: elle est allée.',
    watch: 'English “I have eaten” and “I ate” both become j’ai mangé. And when the helper is être the participle agrees with the subject, which English never makes you do.' },
  { id: 'present-irreg', title: 'The irregular verbs', fr: 'Les verbes irréguliers', drill: 'conj:pr', irregular: ['venir', 'prendre', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'dire', 'voir', 'mettre', 'partir', 'sortir', 'connaître'],
    plain: 'Prendre, venir, pouvoir, vouloir, devoir, savoir, dire, voir and mettre each break the pattern in their own way, and each is worth knowing as a set of six. They are the verbs that carry a conversation.',
    watch: 'Pouvoir and vouloir share a shape (je peux, je veux), and prendre gives you comprendre and apprendre for free: learn one and you have several.' },
  { id: 'negation', title: 'Ne … pas', fr: 'Ne … pas', drill: 'build', match: '\\b(ne|n\')\\s?(\\S+\\s){0,2}(pas|jamais|rien|plus|personne)\\b',
    plain: 'French negation wraps the verb: the ne goes before it and the pas after. Je ne sais pas. The other negatives take the same two slots: ne … jamais (never), ne … rien (nothing), ne … plus (no longer), ne … personne (nobody).',
    watch: 'In speech the ne is almost always dropped — je sais pas, and often j’sais pas — in Québec as in France. In writing, dropping it makes you look careless.' },
  { id: 'homophones-1', title: 'Words that sound the same (1)', fr: 'Des mots qui se ressemblent (1)', drill: 'homophones', sets: ['a-à', 'ou-où', 'et-est', 'son-sont', 'on-ont'],
    plain: 'Many French words sound identical and differ only in spelling. The pairs that catch everyone: a (has) and à (to, at); ou (or) and où (where); et (and) and est (is); son (his, her) and sont (are); on (one, we) and ont (have).',
    watch: 'Swap-test: if you can replace it with avait it is a; with était it is est; with étaient it is sont; with avaient it is ont; with ou bien it is ou.' },
  { id: 'imparfait', title: 'How things were', fr: 'L’imparfait', drill: 'conj:im',
    plain: 'The imperfect describes how things were, what used to happen, or what was going on when something else interrupted. Take the nous form of the present, drop -ons, and add -ais, -ais, -ait, -ions, -iez, -aient: nous parlons gives je parlais. Être is the one exception: j’étais.',
    watch: 'English needs “used to” or “was …-ing”; French has no separate forms for either. Je mangeais means both. Three of the endings sound identical, so it is the written ending that decides.' },
  { id: 'futur-proche', title: 'The near future', fr: 'Le futur proche', drill: 'build', match: '\\b(vais|vas|va|allons|allez|vont) [a-zàâçéèêëîïôûùüÿœ]+(er|ir|re|oir)\\b',
    plain: 'The near future is aller in the present plus an infinitive: je vais manger, nous allons partir. It is how French speakers actually talk about what is coming, from a minute away to next year.',
    watch: 'It is the spoken default. The simple future — je mangerai — is rarer in conversation and more formal.' },
  { id: 'pronouns-object', title: 'Little pronouns', fr: 'Les petits pronoms', drill: 'pronoun',
    plain: 'Object pronouns come before the verb, not after: je le vois (I see him), il lui parle (he is talking to her), nous y allons (we are going there), j’en veux (I want some). Le, la and les stand in for a person or thing; lui and leur for “to someone”; y for “to or at a place”; en for “some of it” or “of it”.',
    watch: 'The pronoun jumps in front of the verb, which feels backwards to an English speaker. With a negative it sits inside the ne … pas: je ne le vois pas.' },
  { id: 'homophones-2', title: 'Words that sound the same (2)', fr: 'Des mots qui se ressemblent (2)', drill: 'homophones', sets: ['ces-ses-c’est-s’est', 'ce-se', 'mais-mes-met', 'peu-peut-peux', 'sur-sûr'],
    plain: 'More pairs that sound alike. Ces (these) and ses (his, her); c’est (it is) and s’est (himself/herself, with a past verb); ce (this) and se (himself, herself); mais (but) and mes (my); peu (little), peut and peux (can); sur (on) and sûr (sure).',
    watch: 'Ask what the word is doing. A pronoun before a verb is se; a pointing word before a noun is ce; a possessive is ses or mes.' },
  { id: 'futur-simple', title: 'The simple future', fr: 'Le futur simple', drill: 'conj:fu',
    plain: 'The simple future is the infinitive plus -ai, -as, -a, -ons, -ez, -ont: je parlerai, nous finirons. A short list of verbs have irregular stems — aller (ir-), être (ser-), avoir (aur-), faire (fer-), pouvoir (pourr-), voir (verr-) — but the endings never change.',
    watch: 'The endings are avoir in the present, which is no accident: parler + ai became parlerai.' },
  { id: 'conditionnel', title: 'What would happen', fr: 'Le conditionnel', drill: 'conj:co',
    plain: 'The conditional takes the future stem and the imperfect endings: je parlerais, nous finirions. It softens requests — je voudrais — and says what would happen if something were true.',
    watch: '“Je veux un café” is blunt; “je voudrais un café” is how you ask. After si in the same sentence, the si-clause takes the imperfect, never the conditional: si j’avais le temps, je viendrais.' },
  { id: 'accord-etre', title: 'When the participle agrees', fr: 'L’accord avec être', drill: 'agree',
    plain: 'With être as the helper, the past participle agrees with the subject like an adjective: add -e for feminine, -s for plural. Il est allé, elle est allée, ils sont allés, elles sont allées. With avoir, the participle normally stays put.',
    watch: 'None of it is audible: allé, allée, allés and allées sound the same. It is a purely written skill, which is exactly why it fades.' },
  { id: 'relatives', title: 'Qui, que, dont, où', fr: 'Qui, que, dont, où', drill: 'build', match: '\\b(qui|que|dont|où)\\b.*\\b(je|tu|il|elle|nous|vous|ils|elles|on)\\b|\\b(la|le|les) \\S+ (qui|que|dont|où)\\b',
    plain: 'Relative pronouns join clauses. Qui replaces a subject (la femme qui parle), que a direct object (le livre que je lis), dont something introduced by de (le livre dont je parle), and où a place or a time (la ville où j’habite).',
    watch: 'English often drops the pronoun — “the book I read” — and French never does: le livre que j’ai lu.' },
  { id: 'subjonctif', title: 'The subjunctive', fr: 'Le subjonctif', drill: 'conj:su',
    plain: 'The subjunctive follows expressions of wish, necessity, doubt and feeling, joined by que: il faut que tu viennes, je veux qu’il parte, bien qu’elle soit fatiguée. For most -er verbs it looks like the present indicative, so it only shows in the irregular ones: que je sois, que j’aie, que je fasse, que je puisse, que j’aille.',
    watch: 'It is the form English speakers avoid most and notice least. “Il faut que je vais” is the classic slip: after il faut que, the verb is subjunctive.' },
];
