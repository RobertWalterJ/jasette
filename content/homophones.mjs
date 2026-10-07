// Words that sound alike and are spelled differently — the part of French that
// listening cannot teach you.
//
// Each set is a list of the spellings that are confused. build/items.mjs finds
// real Tatoeba sentences that contain exactly ONE of them, blanks it, and asks
// which it was; the English translation is shown, and the swap-test from the
// grammar point is given as the explanation. `use` is the one-line job each
// spelling does, shown after the answer.
//
// `pat` is how the spelling is found in a sentence: letters only, and not
// part of a longer word. (JavaScript's \b does not know that à is a letter.)

export default {
  'a-à': { stage: 2, point: 'homophones-1', tip: 'Try avait: il avait mangé works, so it is a. Otherwise it is à.', words: [
    { w: 'a', use: 'has (from avoir)' }, { w: 'à', use: 'to, at, in' } ] },
  'ou-où': { stage: 2, point: 'homophones-1', tip: 'Try ou bien (or else): if it fits, it is ou. If it asks about a place or a time, it is où.', words: [
    { w: 'ou', use: 'or' }, { w: 'où', use: 'where; when' } ] },
  'et-est': { stage: 2, point: 'homophones-1', tip: 'Try était: if il était fits, it is est. If it joins two things, it is et.', words: [
    { w: 'et', use: 'and' }, { w: 'est', use: 'is (from être)' } ] },
  'son-sont': { stage: 2, point: 'homophones-1', tip: 'Try étaient: if ils étaient fits, it is sont. If it sits before a noun and means his or her, it is son.', words: [
    { w: 'son', use: 'his, her, its' }, { w: 'sont', use: 'are (from être)' } ] },
  'on-ont': { stage: 2, point: 'homophones-1', tip: 'Try avaient: if ils avaient fits, it is ont. If it means we or one, it is on.', words: [
    { w: 'on', use: 'we; one; people' }, { w: 'ont', use: 'have (from avoir)' } ] },
  'ces-ses': { stage: 3, point: 'homophones-2', tip: 'Ces points at things (these). Ses belongs to someone (his, her, its).', words: [
    { w: 'ces', use: 'these, those' }, { w: 'ses', use: 'his, her, its (plural)' } ] },
  'ce-se': { stage: 3, point: 'homophones-2', tip: 'Se is a pronoun that sits right before a verb: il se lève. Ce points at something: ce livre.', words: [
    { w: 'ce', use: 'this, that' }, { w: 'se', use: 'himself, herself, themselves' } ] },
  'mais-mes': { stage: 3, point: 'homophones-2', tip: 'Mes is plural “my” and sits before a noun. Mais is “but” and joins two ideas.', words: [
    { w: 'mais', use: 'but' }, { w: 'mes', use: 'my (plural)' } ] },
  'peu-peut': { stage: 3, point: 'homophones-2', tip: 'Peut is a verb (can). Peu is a quantity (little, few) and never changes.', words: [
    { w: 'peu', use: 'little, few' }, { w: 'peut', use: 'can (from pouvoir)' } ] },
  'sur-sûr': { stage: 3, point: 'homophones-2', tip: 'Sûr, with its little hat, means sure. Sur, without, means on.', words: [
    { w: 'sur', use: 'on' }, { w: 'sûr', use: 'sure, certain' } ] },
  'la-là': { stage: 3, point: 'homophones-2', tip: 'Là, with the accent, is “there”. La is the, or her, and sits right before a noun or a verb.', words: [
    { w: 'la', use: 'the (f.); her, it' }, { w: 'là', use: 'there' } ] },
  'du-dû': { stage: 5, point: null, tip: 'Dû, with the little hat, is the participle of devoir (owed, had to). Du is “of the”.', words: [
    { w: 'du', use: 'of the; some' }, { w: 'dû', use: 'had to; owed' } ] },
  'leur-leurs': { stage: 4, point: null, tip: 'Leur before a singular noun, leurs before a plural one. And leur before a verb never takes an s.', words: [
    { w: 'leur', use: 'their (one thing); to them' }, { w: 'leurs', use: 'their (several things)' } ] },
  'tout-tous': { stage: 4, point: null, tip: 'Tous is plural (all of them). Tout is singular, or the adverb “quite”.', words: [
    { w: 'tout', use: 'all; everything; quite' }, { w: 'tous', use: 'all (plural); everyone' } ] },
};
