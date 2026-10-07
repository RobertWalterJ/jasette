// The Canadian French track.
//
// Every entry makes ONE claim about a word — "in Québec / in North America
// this word means that" — and the claim is checked, at build time, against the
// word's own Wiktionary entry (build/canadian-src.mjs pulls it; build/verify.mjs
// compares). `src` is a fragment that must appear in a Wiktionary gloss of that
// word, on a sense tagged one of `tags`. A claim Wiktionary does not make is not
// made here.
//
// What is NOT checked, and is therefore marked as mine on the card: `fr`, the
// word a speaker in France would reach for, and `note`. Those are what a
// bilingual Ontarian knows, not something a dictionary entry states, so the app
// says whose they are.
//
// kind 'word'  — a word or phrase that means something different, or exists
//                only, in Canadian French.
// kind 'oral'  — a spoken form: tsé for tu sais. `std` is the written form.
// stage        — when it enters the course. Everyday words early; slang late.
//
// Left out on purpose: the sacres (tabarnak, câlice, ostie…). They are real and
// a learner will hear them, so the app has one card that says what they are and
// why they are all church words; it does not drill them.

export default [
  // ── everyday life ─────────────────────────────────────────────────────
  { qc: 'dépanneur', kind: 'word', means: 'convenience store', src: 'convenience store', tags: ['North-America', 'Quebec', 'Canada'], fr: 'supérette ; épicerie de quartier', stage: 1, say: 'Je vais au dépanneur.' },
  { qc: 'char', kind: 'word', means: 'car', src: 'car, automobile', tags: ['North-America', 'Quebec', 'Canada'], fr: 'voiture', stage: 1, note: 'Auto is also common in Québec; char is the colloquial one.' },
  { qc: 'fin de semaine', kind: 'word', means: 'weekend', src: 'the weekend', tags: ['North-America', 'Quebec', 'Canada'], fr: 'week-end', stage: 1 },
  { qc: 'souper', kind: 'word', means: 'dinner; the evening meal', src: 'dinner (the main evening meal)', tags: ['North-America', 'Quebec', 'Canada'], fr: 'dîner', stage: 1, also: ['dîner', 'déjeuner'] },
  { qc: 'dîner', kind: 'word', means: 'lunch', src: 'lunch, midday meal', tags: ['North-America', 'Quebec', 'Canada'], fr: 'déjeuner', stage: 1, also: ['souper', 'déjeuner'] },
  { qc: 'déjeuner', kind: 'word', means: 'breakfast', src: 'breakfast', tags: [], fr: 'petit-déjeuner', stage: 1, also: ['dîner', 'souper'], contrast: { tag: 'France', src: 'lunch, luncheon' } },
  { qc: 'bienvenue', kind: 'word', means: 'you’re welcome (after thanks)', src: 'you\'re welcome', tags: ['North-America', 'Quebec', 'Canada'], fr: 'de rien ; je vous en prie', stage: 1, note: 'After merci, a Québécois says bienvenue.' },
  { qc: 'poutine', kind: 'word', means: 'poutine', src: 'poutine', tags: ['Quebec'], stage: 2 },
  { qc: 'magasiner', kind: 'word', means: 'to go shopping', src: 'to shop', tags: ['Quebec', 'Canada'], fr: 'faire les magasins ; faire du shopping', stage: 2 },
  { qc: 'stationnement', kind: 'word', means: 'parking lot', src: 'car park, parking lot', tags: ['Canada'], fr: 'parking', stage: 2 },
  { qc: 'tuque', kind: 'word', means: 'knit winter hat', src: 'toque (knit cap)', tags: ['North-America', 'Quebec', 'Canada'], fr: 'bonnet', stage: 2 },
  { qc: 'mitaine', kind: 'word', means: 'mitten', src: 'mitten', tags: ['Canada'], fr: 'moufle', stage: 2 },
  { qc: 'chandail', kind: 'word', means: 'T-shirt', src: 'T-shirt', tags: ['Quebec'], fr: 'T-shirt', stage: 2 },
  { qc: 'cellulaire', kind: 'word', means: 'cell phone', src: 'cellular phone', tags: ['North-America', 'Quebec', 'Canada'], fr: 'portable', stage: 2 },
  { qc: 'patate', kind: 'word', means: 'potato', src: 'potato', tags: ['North-America', 'Quebec', 'Canada'], fr: 'pomme de terre', stage: 2 },
  { qc: 'espadrille', kind: 'word', means: 'running shoe', src: 'sneaker, running shoe', tags: ['North-America', 'Quebec', 'Canada'], fr: 'basket', stage: 3 },
  { qc: 'gougoune', kind: 'word', means: 'flip-flop', src: 'flip-flop', tags: ['Quebec'], fr: 'tong', stage: 3 },
  { qc: 'lumière', kind: 'word', means: 'traffic light', src: 'traffic light', tags: ['Quebec'], fr: 'feu', stage: 3 },
  { qc: 'écouter', kind: 'word', means: 'to watch (TV or a film)', src: 'to watch (a film or television)', tags: ['Canada'], fr: 'regarder', stage: 3 },
  { qc: 'cour', kind: 'word', means: 'backyard', src: 'backyard', tags: ['Quebec'], fr: 'jardin', stage: 3 },
  { qc: 'liqueur', kind: 'word', means: 'soft drink; pop', src: 'fizzy drink, pop', tags: ['Canada'], fr: 'soda', stage: 3 },
  { qc: 'crème glacée', kind: 'word', means: 'ice cream', src: 'ice cream', tags: ['Quebec'], fr: 'glace', stage: 3 },
  { qc: 'clavarder', kind: 'word', means: 'to chat online', src: 'to chat by typing', tags: ['North-America', 'Quebec', 'Canada'], fr: 'tchatter', stage: 3 },
  { qc: 'blonde', kind: 'word', means: 'girlfriend', src: 'girlfriend', tags: ['North-America', 'Quebec', 'Canada'], fr: 'copine', stage: 3 },
  { qc: 'chum', kind: 'word', means: 'boyfriend', src: 'boyfriend', tags: ['Canada', 'Quebec'], fr: 'copain', stage: 3 },
  { qc: 'gang', kind: 'word', means: 'group of friends', src: 'a group of friends', tags: ['Quebec'], fr: 'bande', stage: 3 },
  { qc: 'fin', kind: 'word', means: 'kind; nice', src: 'kind, nice', tags: ['Quebec'], fr: 'gentil', stage: 3 },
  { qc: 'correct', kind: 'word', means: 'OK; fine', src: 'OK, fine, alright', tags: ['Quebec'], fr: 'd’accord ; ça va', stage: 2 },
  { qc: 'plate', kind: 'word', means: 'boring', src: 'boring', tags: ['Canada'], fr: 'ennuyeux', stage: 4 },
  { qc: 'tannant', kind: 'word', means: 'annoying (a handful)', src: 'troublesome; overexcited', tags: ['Quebec'], fr: 'pénible', stage: 4 },
  { qc: 'tanné', kind: 'word', means: 'fed up', src: 'fed up, sick of something', tags: ['Quebec'], fr: 'en avoir marre', stage: 4 },
  { qc: "blé d'Inde", kind: 'word', means: 'corn', src: 'synonym of maïs', tags: ['Quebec'], fr: 'maïs', stage: 4 },
  { qc: 'tourtière', kind: 'word', means: 'meat pie (Québec)', src: 'meat pie', tags: ['Quebec'], stage: 4 },
  { qc: 'traversier', kind: 'word', means: 'ferry', src: 'ferry', tags: ['Canada'], fr: 'ferry', stage: 4 },
  { qc: 'balado', kind: 'word', means: 'podcast', src: 'podcast', tags: ['Canada'], fr: 'podcast', stage: 4 },
  { qc: 'efface', kind: 'word', means: 'eraser', src: 'eraser', tags: ['North-America'], fr: 'gomme', stage: 4 },
  { qc: 'écœurant', kind: 'word', means: 'awesome (informal)', src: 'very good, excellent', tags: ['Quebec'], fr: 'génial', stage: 5, note: 'It also means “sickening”, which is the sense in France — tone decides.' },
  { qc: 'chaudière', kind: 'word', means: 'bucket', src: 'bucket', tags: ['Quebec'], fr: 'seau', stage: 5 },
  { qc: 'débarbouillette', kind: 'word', means: 'facecloth', src: 'facecloth', tags: ['Quebec'], fr: 'gant de toilette', stage: 5 },
  { qc: 'tabagie', kind: 'word', means: 'tobacco shop', src: 'tobacconist, tobacco shop', tags: ['Quebec'], stage: 5 },
  { qc: 'cédule', kind: 'word', means: 'schedule', src: 'schedule', tags: ['Canada'], fr: 'horaire', stage: 5 },
  { qc: 'cinq à sept', kind: 'word', means: 'after-work drinks (5 to 7)', src: 'early evening get-together', tags: ['Quebec'], stage: 5 },
  { qc: 'attacher sa tuque', kind: 'word', means: 'to brace yourself', src: 'to brace oneself', tags: ['Quebec'], stage: 6 },
  // ── the way it is said ────────────────────────────────────────────────
  { qc: 'tsé', kind: 'oral', means: 'you know', std: 'tu sais', src: 'Contracted form of tu sais', tags: ['Quebec'], stage: 2 },
  { qc: 'chu', kind: 'oral', means: 'I am', std: 'je suis', src: 'I am', tags: ['Quebec'], stage: 2 },
  { qc: 'yé', kind: 'oral', means: 'he is; it is', std: 'il est', src: 'contraction of il + est', tags: ['Quebec'], stage: 3 },
  { qc: 'è', kind: 'oral', means: 'she is; it is', std: 'elle est', src: 'contraction of elle + est', tags: ['Quebec'], stage: 3 },
  { qc: 'moé', kind: 'oral', means: 'me', std: 'moi', src: 'alternative form of moi', tags: ['Quebec'], stage: 3 },
  { qc: 'pis', kind: 'oral', means: 'and; and then', std: 'et puis', src: 'and, besides', tags: ['North-America'], stage: 2 },
  { qc: 'pu', kind: 'oral', means: 'no more', std: 'plus', src: 'alternative form of plus', tags: ['Quebec'], stage: 3 },
  { qc: 'ac', kind: 'oral', means: 'with', std: 'avec', src: 'pronunciation spelling of avec', tags: ['Quebec'], stage: 4 },
  { qc: 'fak', kind: 'oral', means: 'so; therefore', std: 'fait que', src: 'eye dialect spelling of fait que', tags: ['Quebec'], stage: 3 },
  { qc: 'y', kind: 'oral', means: 'he; they (oral)', std: 'il', src: 'alternative form of il', tags: ['Quebec'], stage: 3, srcWord: 'y' },
  { qc: 'a', kind: 'oral', means: 'she (oral)', std: 'elle', src: 'alternative form of elle', tags: ['Quebec'], stage: 4, srcWord: 'a' },
  { qc: 'kess', kind: 'oral', means: 'what (is it that)', std: 'qu’est-ce que', src: 'contraction of qu\'est-ce que', tags: ['Quebec'], stage: 5 },
  { qc: 'pantoute', kind: 'oral', means: 'not at all', std: 'pas du tout', src: 'at all', tags: ['Quebec'], stage: 3 },
  { qc: 'icitte', kind: 'oral', means: 'here', std: 'ici', src: 'here', tags: ['North-America'], stage: 3 },
  { qc: 'coudonc', kind: 'oral', means: 'so, anyway (surprise or impatience)', std: null, src: 'expressing surprise, impatience', tags: ['Quebec'], stage: 5 },
];
