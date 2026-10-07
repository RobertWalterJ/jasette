// Expressions and odd usages: phrases whose words do not add up to their meaning.
//
//   "avoir du bol" is "to have some bowl", and it means to be lucky.
//
// A learner meets these as puzzles, so each is explained. Nothing here is invented:
//
//   - `wik` lists the English-Wiktionary entries that must confirm the meaning: `word` is the entry
//     (the whole phrase, or its head word) and `has` a pattern one of its glosses must match.
//     build/expressions-src.mjs reads the dump and build/items.mjs drops any expression Wiktionary
//     does not back; build/verify.mjs checks the same thing again.
//   - `etym` says what the head word's Wiktionary etymology must mention for the `note` to say it.
//   - `note` is my explanation. It says what the sources say and, where they do not say WHY a phrase
//     means what it means, it says that too — many idioms have no settled origin.
//
//   word      the deck word the expression hangs on (so it shows on that word's card)
//   reg       fam (informal) · pop (very informal) · '' (ordinary)

export default [
  { id: 'avoir-du-bol', fr: 'avoir du bol', en: 'to be lucky', literal: 'to have some bowl', word: 'bol', reg: 'fam',
    wik: [{ word: 'bol', has: '^luck$' }], etym: { word: 'bol', says: ['bowl', 'pot'] },
    note: 'Bol was borrowed from English “bowl” in the 18th century, so its first meaning is the dish: un bol de lait. Its second, informal meaning is luck. Wiktionary points to pot as the model: pot is a jar and also, informally, luck (avoir du pot). So bol most likely followed pot. Neither source says why a container came to mean luck, so there is no tidy story to tell: learn avoir du bol as one unit.' },
  { id: 'avoir-du-pot', fr: 'avoir du pot', en: 'to be lucky', literal: 'to have some pot (jar)', word: 'pot', reg: 'fam',
    wik: [{ word: 'pot', has: 'luck' }],
    note: 'The same idea as avoir du bol, and the older of the two. Pot is a jar; informally it is also luck. You will also hear avoir de la chance, which is the ordinary, neutral way to say it.' },
  { id: 'avoir-le-cafard', fr: 'avoir le cafard', en: 'to feel down, to have the blues', literal: 'to have the cockroach', word: 'cafard', reg: 'fam',
    wik: [{ word: 'cafard', has: 'blues|depress|melanchol|gloom|dejection' }],
    note: 'A cafard is a cockroach, and informally it is also a low, gloomy mood. The image is of something creeping and dark getting hold of you. Wiktionary gives the mood as a meaning of the word; it does not give a settled reason for the cockroach.' },
  { id: 'avoir-la-flemme', fr: 'avoir la flemme', en: 'to not feel like doing something, to feel lazy', literal: 'to have the laziness', word: 'flemme', reg: 'fam',
    wik: [{ word: 'flemme', has: 'lazi|laze|idle|sluggish' }],
    note: 'Flemme is informal laziness. J’ai la flemme de cuisiner means “I can’t be bothered to cook”: the word is followed by de + a verb.' },
  { id: 'avoir-la-peche', fr: 'avoir la pêche', en: 'to be full of energy, to be in great form', literal: 'to have the peach', word: 'pêche', reg: 'fam',
    wik: [{ word: 'avoir la pêche', has: 'energ|good form|great shape|upbeat|feel great|in form' }],
    note: 'A fixed phrase: the peach stands for health and a rosy, lively look. As with most idioms, the sources give the meaning rather than a documented origin, so treat the explanation as the picture it paints, not as history.' },
  { id: 'poser-un-lapin', fr: 'poser un lapin', en: 'to stand someone up', literal: 'to put down a rabbit', word: 'lapin', reg: 'fam',
    wik: [{ word: 'poser un lapin', has: 'stand.*up' }],
    note: 'You say it of someone who does not turn up to a meeting, a date or an appointment: Il m’a posé un lapin. The rabbit does not help you guess the meaning, and the sources do not settle where the phrase comes from, so learn it whole.' },
  { id: 'raconter-des-salades', fr: 'raconter des salades', en: 'to tell tall tales, to talk nonsense', literal: 'to tell salads', word: 'salade', reg: 'fam',
    wik: [{ word: 'salade', has: 'nonsense' }],
    note: 'Besides the vegetable, salade is informal for nonsense, and is used in the plural: des salades. Wiktionary gives the meaning but not a settled reason; the usual picture is a jumble of ingredients tossed together, which is only a guess at why.' },
  { id: 'un-navet', fr: 'un navet', en: 'a bad film, a flop', literal: 'a turnip', word: 'navet', reg: 'fam',
    wik: [{ word: 'navet', has: 'turnip' }, { word: 'navet', has: 'bad movie|turkey' }],
    note: 'Navet is a turnip, a plain, unglamorous vegetable, and informally a film or other work that is poor. C’est un navet: “it’s a dud”.' },
  { id: 'tomber-dans-les-pommes', fr: 'tomber dans les pommes', en: 'to faint, to pass out', literal: 'to fall into the apples', word: 'pomme', reg: 'fam',
    wik: [{ word: 'tomber dans les pommes', has: 'faint|pass out|swoon' }],
    note: 'A fixed phrase with no obvious link between apples and fainting; the sources give the meaning, not a settled origin. Just use it as one block: Elle est tombée dans les pommes.' },
  { id: 'poireauter', fr: 'poireauter', en: 'to be kept waiting, to hang around', literal: 'to “leek” (from poireau, a leek)', word: 'poireau', reg: 'fam',
    wik: [{ word: 'poireauter', has: 'wait|hang around|kick one’s heels|kick one\'s heels' }],
    note: 'It is a verb made from poireau (leek), informal for waiting around, as if you were standing rooted in the ground like a leek. Wiktionary gives the meaning; the picture is the usual explanation, not a documented history.' },
  { id: 'ca-marche', fr: 'ça marche', en: 'OK, deal, that works', literal: 'it walks', word: 'marcher', reg: 'fam',
    wik: [{ word: 'ça marche', has: 'okay|ok|deal|works|agree|sounds good|fine' }],
    note: 'Marcher is “to walk”, but also “to work” (a machine, a plan). Ça marche is the everyday way to agree: “works for me”, “deal”. It is also a question: Ça marche ? = “is that OK?”.' },
  { id: 'etre-fauche', fr: 'être fauché', en: 'to be broke', literal: 'to be mown / cut down', word: 'faucher', reg: 'fam',
    wik: [{ word: 'fauché', has: 'broke|penniless|poor|skint' }],
    note: 'Faucher is to mow or cut down with a scythe, so fauché is literally “cut down”: someone whose money has been taken away. The informal “broke” meaning is listed as its own sense of the word.' },
  { id: 'mettre-les-voiles', fr: 'mettre les voiles', en: 'to leave, to clear off', literal: 'to put up the sails', word: 'voile', reg: 'fam',
    wik: [{ word: 'mettre les voiles', has: 'leave|clear off|scram|make off|go away|depart|split' }],
    note: 'Setting sail is how a ship departs, so the phrase is “to be off”. Here the picture and the meaning line up, which makes it one of the easier ones to remember.' },
  { id: 'casser-les-pieds', fr: 'casser les pieds à quelqu’un', en: 'to annoy someone, to be a pain', literal: 'to break someone’s feet', word: 'pied', reg: 'fam',
    wik: [{ word: 'casser les pieds', has: 'annoy|pester|bother|irritate|pain|drive.*crazy|bore' }],
    note: 'Informal and a little strong. Tu me casses les pieds ! = “you’re getting on my nerves”. Someone annoying is un casse-pieds.' },
  { id: 'donner-sa-langue-au-chat', fr: 'donner sa langue au chat', en: 'to give up guessing', literal: 'to give one’s tongue to the cat', word: 'chat', reg: '',
    wik: [{ word: 'donner sa langue au chat', has: 'give up|guess' }],
    note: 'Said when you give up trying to guess a riddle or a surprise: Je donne ma langue au chat. The cat has no connection to the meaning that the sources record, so learn it as one unit.' },
  { id: 'couter-les-yeux-de-la-tete', fr: 'coûter les yeux de la tête', en: 'to cost a fortune', literal: 'to cost the eyes of the head', word: 'œil', reg: 'fam',
    wik: [{ word: 'coûter les yeux de la tête', has: 'expensive|fortune|arm and a leg|cost' }],
    note: 'The English phrase is “to cost an arm and a leg”: both name body parts you could not do without. Ça coûte les yeux de la tête.' },
  { id: 'avoir-le-coeur-sur-la-main', fr: 'avoir le cœur sur la main', en: 'to be generous, to be open-hearted', literal: 'to have the heart on the hand', word: 'cœur', reg: '',
    wik: [{ word: 'avoir le cœur sur la main', has: 'generous|open.hearted|kind|heart on' }],
    note: 'The heart is held out in the open hand, ready to be given. It is a compliment, not a criticism.' },
  { id: 'mettre-son-grain-de-sel', fr: 'mettre son grain de sel', en: 'to butt in, to put in one’s two cents', literal: 'to put in one’s grain of salt', word: 'sel', reg: 'fam',
    wik: [{ word: 'mettre son grain de sel', has: 'butt in|interfere|meddle|two cents|put in|unasked|nose' }],
    note: 'Said of someone who adds an opinion nobody asked for. A grain of salt is tiny, but it flavours the whole dish, even when it was not wanted.' },
  { id: 'tourner-autour-du-pot', fr: 'tourner autour du pot', en: 'to beat around the bush', literal: 'to turn around the pot', word: 'pot', reg: 'fam',
    wik: [{ word: 'tourner autour du pot', has: 'beat about|beat around|avoid|bush|evade' }],
    note: 'Same meaning as the English: avoiding the point instead of getting to it. Ne tourne pas autour du pot ! = “just say it”.' },
  { id: 'faire-la-grasse-matinee', fr: 'faire la grasse matinée', en: 'to sleep in, to have a lie-in', literal: 'to do the fat morning', word: 'matinée', reg: '',
    wik: [{ word: 'faire la grasse matinée', has: 'sleep in|lie.in|late|lie in' }],
    note: 'Gras (feminine grasse) is “fat” and here means rich or generous: a “fat” morning is a long one in bed. Not at all impolite; it is the ordinary expression for sleeping in.' },
  { id: 'etre-dans-la-lune', fr: 'être dans la lune', en: 'to have one’s head in the clouds', literal: 'to be in the moon', word: 'lune', reg: '',
    wik: [{ word: 'être dans la lune', has: 'daydream|head in the clouds|absent|distracted|dream|clouds' }],
    note: 'Said of someone distracted or daydreaming. French puts the head in the moon where English puts it in the clouds.' },
  { id: 'avoir-un-coup-de-foudre', fr: 'avoir un coup de foudre', en: 'to fall in love at first sight', literal: 'to have a lightning strike', word: 'foudre', reg: '',
    wik: [{ word: 'coup de foudre', has: 'love at first sight' }],
    note: 'A coup de foudre is a bolt of lightning: sudden, total and impossible to ignore. It is used of love at first sight, and also of a sudden strong liking for a place or an object.' },
  { id: 'peter-les-plombs', fr: 'péter les plombs', en: 'to lose it, to snap', literal: 'to blow the lead (fuses)', word: 'plomb', reg: 'fam',
    wik: [{ word: 'péter les plombs', has: 'lose it|snap|crack|go crazy|flip|lose one|lose.*mind|blow|lose control|lose.*temper' }],
    note: 'Plombs are the lead fuses that used to cut the power when a circuit overloaded. Blowing a fuse is how English says it too: the person overloaded and shut down or exploded. Il a pété les plombs.' },
];
