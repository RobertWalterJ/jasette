// Culture and variation: how Québec French, Canadian French and the French of France differ, and how
// colloquial French works in Montréal and across Québec. One short note each, in the app's own words.
//
// Nothing here is asserted without a source. Each note rests on Wikipedia articles (CC BY-SA 4.0), and
// each `facts` entry names a page and a phrase that MUST appear in that article's text
// (corpus/culture-wikipedia.json, fetched by build/culture-src.mjs, with its revision id); build/verify.mjs
// fails if a phrase is missing. The notes paraphrase the articles; they do not copy them, and they say
// nothing the articles do not.
//
//   qc   Québec words from content/canadian.mjs that the note mentions (they show as chips)

export default [
  { id: 'trois-noms', title: 'Québécois, Canadian, Acadian: what the names cover', qc: [],
    body: 'Québec French is the main variety of French in Canada, and it is the everyday language of Québec: home, school, media and government. “Canadian French” is the umbrella term for every kind of French spoken in the country, Québec’s included. Acadian French (in the Atlantic provinces and parts of eastern Québec) and Métis French (across the Prairies) are separate varieties under that umbrella. Joual, the working-class speech of Montréal, is a further label, and it is not a synonym for Québec French as a whole.',
    facts: [{ page: 'Quebec French', has: 'Canadian French is a common umbrella term' }, { page: 'Quebec French', has: 'Acadian French' }, { page: 'Quebec French', has: 'Métis French' }] },

  { id: 'si-loin', title: 'How far apart are Québec French and French from France?', qc: [],
    body: 'Not far in writing and quite far in speech. Formal Québec French uses essentially the same spelling and grammar as the French of France, with only a few exceptions and moderate differences in vocabulary. The gap widens as language gets more informal, in grammar and vocabulary alike. The accents are easy to tell apart in every register, formal ones included. Understanding runs along a scale: the standard forms are the easiest to share, and strongly local speech is the hardest.',
    facts: [{ page: 'Quebec French', has: 'continuum of intelligibility' }, { page: 'Quebec French', has: 'essentially the same orthography and grammar' }, { page: 'Quebec French', has: 'readily distinguishable in all registers' }] },

  { id: 'histoire-courte', title: 'Why it sounds different: a short history', qc: [],
    body: 'Québec French grew from regional varieties of French (and of other languages of northern France) that colonists brought to New France in the 17th and 18th centuries. After 1760, under British rule, French in Canada was cut off from the French of Europe. That isolation is why some older pronunciations survived, such as moé for moi, and why some expressions lasted here after they disappeared in France. The river and the sea shaped it too: in informal Québec French people embarquer and débarquer from a vehicle, where France uses monter and descendre.',
    facts: [{ page: 'Quebec French', has: 'isolated from that of Europe' }, { page: 'Quebec French', has: 'moé for moi' }, { page: 'Quebec French', has: 'embarquer and débarquer' }, { page: 'Quebec French', has: 'Poitevin' }] },

  { id: 'joual-le-mot', title: 'Joual: a name that comes from a word for horse', qc: [],
    body: 'Joual is the name for the features of Québec French tied to Montréal’s French-speaking working class. The word is a respelling of how that speech pronounces cheval, “horse”. For a long time many people looked down on joual and others celebrated it. In 1968 Michel Tremblay’s play Les Belles-sœurs put it on a national stage, written in the speech of Montréal working-class women, and many consider it to have had a profound impact on Canadian culture. Today its features are heard across the whole social spectrum, so the “working class” label is increasingly outdated.',
    facts: [{ page: 'Joual', has: 'working class in Montreal' }, { page: 'Joual', has: 'how the word cheval' }, { page: 'Joual', has: 'Les Belles-sœurs' }, { page: 'Joual', has: 'stigmatized by some, and celebrated by others' }] },

  { id: 'pas-seulement-montreal', title: 'Not only Montréal: names for the local speech', qc: [],
    body: 'Speakers outside Montréal usually have their own names for their way of talking: Magoua in Trois-Rivières, for example, and Chaouin south of Trois-Rivières. Linguists tend to avoid the word joual, though some have reserved it for Montréal. Joual features are not confined to one class any more: after the Quiet Revolution and a cultural revival centred on Montréal’s east end, people across the educational and economic range can speak at least some of it. It is also heard in some French-speaking communities in Ontario.',
    facts: [{ page: 'Joual', has: 'Magoua in Trois-Rivières' }, { page: 'Joual', has: 'Chaouin' }, { page: 'Joual', has: 'across the educational and economic spectrum' }] },

  { id: 'particule-tu', title: 'The little “-tu” that turns a statement into a question', qc: [],
    body: 'In informal Québec French a tu can be tacked onto a verb to make it a question, whoever the subject is: Tu viens-tu ? is “are you coming?”, and it works the same for il or elle. This is a mark of Québec and Canadian French (or of non-standard French elsewhere), not of every informal French. It also fits a wider pattern: in speech, informal French everywhere often drops the negative ne, so how informal French differs from formal French is not only a Québec matter.',
    facts: [{ page: 'Quebec French', has: 'interrogative particle -tu' }, { page: 'Joual', has: 'deliberate use of the pronoun tu to indicate a question' }, { page: 'Quebec French', has: 'omission of the negative particle ne' }] },

  { id: 'anglicismes', title: 'English words: fewer than you might think, and different ones', qc: ['magasiner', 'stationnement', 'fin de semaine'],
    body: 'People often think Québec French is full of English. The sources say that is exaggerated. In informal speech in France you hear shopping, parking, escalator, ticket, email and week-end; Québec tends to prefer magasinage, stationnement, escalier roulant, billet, courriel and fin de semaine. Part of the impression of “too much English” is simply that the English words are different, so they stand out. One study of criticised borrowings found that about 93% have extremely low frequency, and that Québécois show a stronger dislike of anglicisms in formal settings than people in France do.',
    facts: [{ page: 'Quebec French', has: 'magasinage, stationnement, escalier roulant, billet, courriel and fin de semaine' }, { page: 'Quebec French', has: '93%' }, { page: 'Quebec French', has: 'prevalence of anglicisms in Quebec French has often been exaggerated' }] },

  { id: 'inventions', title: 'Words Québec invented (and some France borrowed)', qc: [],
    body: 'Terminology work in Québec, much of it through the Office québécois de la langue française, produced a large stock of French coinages. A few have spread beyond Québec: clavardage (“chat”, from clavier and bavardage), courriel (“email”, from courrier électronique), pourriel (“spam”, a blend of poubelle and courriel), and baladodiffusion, shortened to balado (“podcasting”). Québec French also makes common use of feminine job titles and gender-inclusive wording.',
    facts: [{ page: 'Quebec French', has: 'clavardage' }, { page: 'Quebec French', has: 'pourriel' }, { page: 'Quebec French', has: 'baladodiffusion' }, { page: 'Quebec French', has: 'feminized job titles' }] },

  { id: 'cinq-genres', title: 'Five kinds of Québec difference', qc: [],
    body: 'Linguists sort the particularities of Québec vocabulary into five kinds. Some words exist only in Québec (québécismes lexématiques). Some words exist everywhere but mean something different here (québécismes sémantiques). Some behave differently in grammar. Some are fixed expressions found only in Québec (québécismes phraséologiques). And some are the same word with the same meaning, used in a different context. The stop sign is an example of the last kind: most Québec stop signs say arrêt, while in France they say stop.',
    facts: [{ page: 'Quebec French', has: 'québécismes lexématiques' }, { page: 'Quebec French', has: 'québécismes sémantiques' }, { page: 'Quebec French', has: 'québécismes phraséologiques' }, { page: 'Quebec French', has: 'most stop signs say arrêt' }] },

  { id: 'sacres', title: 'Sacres: swearing in church words', qc: [],
    body: 'Québec has its own kind of strong swearing, the sacres, built from the vocabulary of the Catholic Church. They are felt to be stronger in Québec than the sexual and scatological swearing common in the rest of the French-speaking world, such as merde. They go back to the early 19th century, when the Church’s control over daily life was a growing source of frustration. The Church’s influence has since fallen sharply, but the sacres have not gone away. Milder, disguised versions exist for people who would rather not use the real ones. They are strong language, so treat them as something to recognise, not something to try out. There is no official spelling for them: the Office québécois de la langue française does not regulate them.',
    facts: [{ page: 'Quebec French profanity', has: 'stronger in Québec than the sexual and scatological' }, { page: 'Quebec French profanity', has: 'early 19th century' }, { page: 'Quebec French profanity', has: 'does not regulate them' }, { page: 'Quebec French profanity', has: 'Quiet Revolution' }] },

  { id: 'sons', title: 'The sounds you notice first', qc: [],
    body: 'Two features give Québec French away at once. Before the vowels i and u, the sounds t and d are pronounced with a little hiss (so t and d come out something like “ts” and “dz”), except in a few regions such as Gaspésie and the Côte-Nord. And long vowels in a final closed syllable are stretched into two parts: tête sounds like a short glide, not a plain vowel. Informally, oi can be pronounced like “wè” or “wé”, as in moé for moi.',
    facts: [{ page: 'Quebec French', has: 'are affricated' }, { page: 'Quebec French', has: 'Long vowels are diphthongized in final closed syllables' }, { page: 'Quebec French', has: 'is pronounced [wɛ]' }, { page: 'Joual', has: 'moé and toé' }] },

  { id: 'revolution-tranquille', title: 'How Québécois came to feel about their own French', qc: [],
    body: 'In studies from the 1960s and 70s, Québécois listeners tended to rate speakers of French from Europe higher than speakers of Québec French on many positive qualities, even friendliness. The Office québécois de la langue française was then trying to impose a standard as close to the French of France as possible, which is one explanation given. Since the 1970s the official position has changed greatly. A frequently cited turning point is a 1977 declaration by Québec’s French teachers that the French to teach is the “standard Québec French”, the socially favoured French of formal situations here. Some researchers argue that disapproval has since focused on certain informal features, not on Québec French as a whole.',
    facts: [{ page: 'Quebec French', has: 'rated speakers of European French' }, { page: 'Quebec French', has: 'standard as French as possible' }, { page: 'Quebec French', has: 'standard d\'ici' }, { page: 'Quebec French', has: 'Quiet Revolution' }] },

  { id: 'metiers-feminins', title: 'Une chercheuse, une ingénieure: feminine job titles', qc: [],
    body: 'One of the most visible differences in formal French is how jobs are named for women. In Québec the feminine form is used almost universally: une chercheuse or une chercheure, une ingénieure. In France the question drew considerable attention in the 1990s, and forms like ingénieure are still strongly criticised by institutions such as the Académie française, although they are commonly used in Canada and in Switzerland. It is a difference in writing and official usage, not just in speech.',
    facts: [{ page: 'Quebec French', has: 'une chercheuse' }, { page: 'Quebec French', has: 'Académie française' }, { page: 'Quebec French', has: 'Canada and Switzerland' }] },

  { id: 'mots-autochtones', title: 'Words from Indigenous languages', qc: [],
    body: 'New France took words from First Nations languages, especially place names (Québec and Canada themselves) and names for local plants and animals. Atoca is the cranberry and ouaouaron the bullfrog, both from Iroquoian languages. Maringouin, for mosquito, is attributed to Tupi-Guarani, a language of Brazil’s northern coast, and is thought to have reached French colonists in the late 1600s through explorers returning from South America.',
    facts: [{ page: 'Quebec French', has: 'atoca' }, { page: 'Quebec French', has: 'ouaouaron' }, { page: 'Quebec French', has: 'maringouin' }] },
];
