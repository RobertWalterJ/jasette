// Dialogues: short exchanges in one everyday Québec situation; the learner plays “Vous”.
// (Design and the format: DIALOGUES-DRAFT.md.)
//
//   other line   { who: 'other', fr, en }
//   your line    { who: 'you', best: { fr, en, why }, others: [{ fr, kind, why }, { fr, kind, why }] }
//                kind: 'register' (right French, wrong for this person)
//                      'other'    (right French, wrong for this moment or meaning)
//                      'error'    (a real learner error; excluded from the spelling check)
//
// build/verify.mjs checks every line: each of your lines has one best and two others; every word in
// every line but an 'error' is a spelling Lexique knows; every Québec word named in `qc` is one of the
// entries in content/canadian.mjs (so it is backed by Wiktionary); `needs` are real steps of the
// conjugation ladder. `needs` is advice, not a lock: a dialogue says which steps it leans on.

export default [
  { id: 'au-depanneur', title: 'Au dépanneur', en: 'At the corner store', level: 'A2', needs: ['present-essentiel'], qc: ['dépanneur', 'bienvenue'],
    spotlight: { title: 'Du, de la: “some”', text: 'Je cherche du lait: du (de la before a feminine noun) means “some”. Le lait would mean one particular milk you both already know. You will hear du, de la and des all the time in shops and restaurants.' },
    lines: [
      { who: 'other', fr: 'Bonjour ! Je peux vous aider ?', en: 'Hello! Can I help you?' },
      { who: 'you', best: { fr: 'Oui, je cherche du lait.', en: 'Yes, I’m looking for some milk.', why: 'Du means “some”: you want milk, not one particular milk.' },
        others: [
          { fr: 'Oui, je cherche le lait.', kind: 'other', why: 'Correct French, but le lait points to one particular milk you both know about.' },
          { fr: 'Oui, je chercher du lait.', kind: 'error', why: 'After je, use the present: cherche. The infinitive (chercher) does not change for the subject.' },
        ] },
      { who: 'other', fr: 'Là-bas, dans le frigo, au fond.', en: 'Over there, in the fridge, at the back.' },
      { who: 'you', best: { fr: 'Merci ! Ça coûte combien ?', en: 'Thanks! How much is it?', why: 'Ça coûte combien ? is the everyday way to ask a price.' },
        others: [
          { fr: 'Merci ! Où est le lait ?', kind: 'other', why: 'Correct French, but he has just told you where it is.' },
          { fr: 'Merci ! Combien coûtes-tu ?', kind: 'error', why: 'Coûtes is the tu form: you would be asking the clerk what he costs. Ça coûte means “it costs”.' },
        ] },
      { who: 'other', fr: 'Quatre dollars cinquante. Vous voulez autre chose ?', en: 'Four fifty. Would you like anything else?' },
      { who: 'you', best: { fr: 'Non, c’est tout, merci.', en: 'No, that’s all, thanks.', why: 'C’est tout means “that’s all”: the usual way to finish an order.' },
        others: [
          { fr: 'Non, c’est fini, merci.', kind: 'other', why: 'Understood, but c’est fini sounds as if something has ended; for an order you say c’est tout.' },
          { fr: 'Non, c’est tous, merci.', kind: 'error', why: 'Here tout is the singular “all”, so it is tout, not tous.' },
        ] },
      { who: 'other', fr: 'Bienvenue ! Bonne journée !', en: 'You’re welcome! Have a good day.' },
    ] },

  { id: 'au-restaurant', title: 'Au restaurant, pour le souper', en: 'At a restaurant, for supper', level: 'A2', needs: ['present-essentiel', 'futur-proche'], qc: ['souper', 'poutine', 'liqueur'],
    spotlight: { title: 'Je vais + infinitive: the near future', text: 'Je vais prendre la poutine is how people actually order. It is aller (present) plus the infinitive, and nothing else changes. Je prendrai is correct, but sounds stiff in speech.' },
    lines: [
      { who: 'other', fr: 'Bonsoir ! Une table pour combien de personnes ?', en: 'Good evening! A table for how many people?' },
      { who: 'you', best: { fr: 'Pour deux, s’il vous plaît.', en: 'For two, please.', why: 'S’il vous plaît: polite, and vous is right for someone you do not know.' },
        others: [
          { fr: 'Pour deux, s’il te plaît.', kind: 'register', why: 'S’il te plaît is for someone you call tu. A server you don’t know gets s’il vous plaît.' },
          { fr: 'Pour deux personne, s’il vous plaît.', kind: 'error', why: 'After deux the noun is plural: deux personnes (the s is silent, so it only shows in writing).' },
        ] },
      { who: 'other', fr: 'Suivez-moi. Vous voulez voir le menu du souper ?', en: 'Follow me. Would you like to see the supper menu?' },
      { who: 'you', best: { fr: 'Oui, merci. Qu’est-ce que vous me conseillez ?', en: 'Yes, thanks. What do you recommend?', why: 'Qu’est-ce que… is the everyday “what”; vous, as before.' },
        others: [
          { fr: 'Oui, merci. Qu’est-ce que tu me conseilles ?', kind: 'register', why: 'Correct, but tu is for a friend. A server is vous.' },
          { fr: 'Oui, merci. Que vous me conseillez ?', kind: 'error', why: 'A spoken question like this needs qu’est-ce que (or que with inversion: Que me conseillez-vous ?).' },
        ] },
      { who: 'other', fr: 'La poutine est très bonne. Vous voulez boire quelque chose ?', en: 'The poutine is very good. Would you like something to drink?' },
      { who: 'you', best: { fr: 'Je vais prendre la poutine et une liqueur, s’il vous plaît.', en: 'I’ll have the poutine and a soft drink, please.', why: 'Je vais prendre is the everyday way to order, and une liqueur is a soft drink in Québec.' },
        others: [
          { fr: 'Je prendrai la poutine et une liqueur, s’il vous plaît.', kind: 'register', why: 'Correct (simple future) but stiff; in speech the near future is what people say.' },
          { fr: 'Je vais prendre la poutine et un liqueur, s’il vous plaît.', kind: 'error', why: 'Liqueur is feminine: une liqueur.' },
        ] },
      { who: 'other', fr: 'Parfait !', en: 'Perfect!' },
    ] },

  { id: 'jaser-avec-un-voisin', title: 'Jaser avec un voisin', en: 'Chatting with a neighbour', level: 'A2+', needs: ['present-er', 'imperatif'], qc: ['fin de semaine', 'magasiner', 'cinq à sept'],
    spotlight: { title: 'Tu or vous?', text: 'With a neighbour of your own age, tu is the normal choice in Québec; vous would sound distant. With a server, a clerk or a stranger it is vous. The imperative viens! is the tu form of venir with the pronoun dropped.' },
    lines: [
      { who: 'other', fr: 'Salut ! Ça va ?', en: 'Hi! How are you?' },
      { who: 'you', best: { fr: 'Ça va bien, et toi ?', en: 'Good, and you?', why: 'A neighbour who says salut expects tu, so et toi.' },
        others: [
          { fr: 'Ça va bien, et vous ?', kind: 'register', why: 'Correct, but with a neighbour your age vous sounds distant.' },
          { fr: 'Ça va bien, et ton ?', kind: 'error', why: 'Ton is “your” before a noun. “And you” is et toi.' },
        ] },
      { who: 'other', fr: 'Qu’est-ce que tu fais en fin de semaine ?', en: 'What are you doing on the weekend?' },
      { who: 'you', best: { fr: 'Je vais magasiner un peu. Et toi ?', en: 'I’m going to do some shopping. And you?', why: 'Magasiner is the Québec verb for going shopping, and je vais + infinitive for the plan.' },
        others: [
          { fr: 'Je vais faire les courses un peu. Et toi ?', kind: 'other', why: 'Correct French, but faire les courses is grocery shopping; magasiner is shopping around for things.' },
          { fr: 'Je vais magasine un peu. Et toi ?', kind: 'error', why: 'After je vais use the infinitive: magasiner.' },
        ] },
      { who: 'other', fr: 'Moi, je vais au chalet. Viens au cinq à sept vendredi !', en: 'Me, I’m going to the cottage. Come to the 5 to 7 on Friday!' },
      { who: 'you', best: { fr: 'Avec plaisir, j’apporte quelque chose ?', en: 'With pleasure, shall I bring something?', why: 'Avec plaisir accepts warmly; j’apporte (present) offers to bring something.' },
        others: [
          { fr: 'Non merci, je suis occupé.', kind: 'other', why: 'Correct French, but it turns down a friendly invitation; the moment calls for a yes.' },
          { fr: 'Avec plaisir, j’apportera quelque chose ?', kind: 'error', why: 'With je the present is j’apporte. The ending -a belongs to il / elle.' },
        ] },
    ] },

  { id: 'a-larret-dautobus', title: 'À l’arrêt d’autobus', en: 'At the bus stop', level: 'A2', needs: ['passe-compose'], qc: ['lumière', 'bienvenue'],
    spotlight: { title: 'Être in the passé composé', text: 'Partir is one of the verbs of movement that use être, not avoir: le bus est parti. The participle agrees with the subject (elle est partie). Most verbs use avoir: il a mangé.' },
    lines: [
      { who: 'you', best: { fr: 'Excusez-moi, le bus pour le centre-ville est déjà parti ?', en: 'Excuse me, has the downtown bus already left?', why: 'Partir takes être: est parti. And excusez-moi, because this is a stranger.' },
        others: [
          { fr: 'Excuse-moi, le bus pour le centre-ville est déjà parti ?', kind: 'register', why: 'Correct, but excuse-moi is tu. To a stranger: excusez-moi.' },
          { fr: 'Excusez-moi, le bus pour le centre-ville a déjà parti ?', kind: 'error', why: 'Partir uses être in the passé composé: est parti, not a parti.' },
        ] },
      { who: 'other', fr: 'Oui, il est parti il y a cinq minutes. Le prochain arrive dans dix minutes.', en: 'Yes, it left five minutes ago. The next one comes in ten minutes.' },
      { who: 'you', best: { fr: 'D’accord. Il passe par le centre-ville ?', en: 'OK. Does it go through downtown?', why: 'Il passe: the present, the plain way to ask about a regular route.' },
        others: [
          { fr: 'D’accord. Où est la lumière ?', kind: 'other', why: 'Correct French, but nothing has been said about a light yet.' },
          { fr: 'D’accord. Il passer par le centre-ville ?', kind: 'error', why: 'The subject il needs the present: passe, not the infinitive passer.' },
        ] },
      { who: 'other', fr: 'Oui. Descendez après la lumière, au deuxième arrêt.', en: 'Yes. Get off after the traffic light, at the second stop.' },
      { who: 'you', best: { fr: 'D’accord, merci beaucoup !', en: 'OK, thanks a lot!', why: 'Merci beaucoup: a plain, warm thank-you.' },
        others: [
          { fr: 'D’accord, bienvenue !', kind: 'other', why: 'Bienvenue means “you’re welcome”, said after someone thanks YOU, not to thank them.' },
          { fr: 'D’accord, je merci beaucoup !', kind: 'error', why: 'Merci is not conjugated here: just merci (beaucoup).' },
        ] },
      { who: 'other', fr: 'Bienvenue !', en: 'You’re welcome!' },
    ] },

  { id: 'a-la-pharmacie', title: 'À la pharmacie', en: 'At the pharmacy', level: 'B1', needs: ['passe-compose', 'present-etendu'], qc: [],
    spotlight: { title: 'En: “some of it, of them”', text: 'En replaces “some of it / of them”, and goes before the verb: Prenez-en une = take one (of them). J’en prends une = I’m taking one. Also: pain is avoir mal à (j’ai mal à la gorge), and feelings with être (je suis fatigué).' },
    lines: [
      { who: 'other', fr: 'Bonjour, qu’est-ce que je peux faire pour vous ?', en: 'Hello, what can I do for you?' },
      { who: 'you', best: { fr: 'J’ai mal à la gorge depuis hier.', en: 'I’ve had a sore throat since yesterday.', why: 'Avoir mal à + the body part is how French says it hurts.' },
        others: [
          { fr: 'J’ai mal dans la gorge depuis hier.', kind: 'other', why: 'Understood, but the usual form is avoir mal à: j’ai mal à la gorge.' },
          { fr: 'Je suis mal à la gorge depuis hier.', kind: 'error', why: 'Pain uses avoir (j’ai mal à), not être.' },
        ] },
      { who: 'other', fr: 'Vous avez de la fièvre ?', en: 'Do you have a fever?' },
      { who: 'you', best: { fr: 'Non, mais je suis très fatigué.', en: 'No, but I’m very tired.', why: 'Je suis fatigué: how you feel uses être. (Fatiguée if you are a woman.)' },
        others: [
          { fr: 'Non, mais j’ai de la fièvre.', kind: 'other', why: 'Correct French, but it says the opposite of what you mean: he asked about a fever.' },
          { fr: 'Non, mais j’ai très fatigué.', kind: 'error', why: 'How you feel uses être: je suis fatigué, not j’ai.' },
        ] },
      { who: 'other', fr: 'Prenez-en une toutes les quatre heures.', en: 'Take one every four hours.' },
      { who: 'you', best: { fr: 'D’accord, j’en prends une maintenant.', en: 'OK, I’ll take one now.', why: 'En stands for “of them” and goes before the verb: j’en prends une.' },
        others: [
          { fr: 'D’accord, je les prends maintenant.', kind: 'other', why: 'Correct French, but it means “I’m taking them (all)”, not one.' },
          { fr: 'D’accord, je prends elle maintenant.', kind: 'error', why: 'A pronoun for “of them” is en, and it goes before the verb: j’en prends.' },
        ] },
      { who: 'other', fr: 'Parfait. Bon rétablissement !', en: 'Perfect. Get well soon!' },
    ] },
];
