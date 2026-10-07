// What a sentence says, read before anything else looks at it.
//
// Tatoeba is a general corpus, not one assembled for a learner, and its
// translators write about whatever they like. Hok Gong learned this the hard
// way, when a listening question asked Robert to recognise "You might as well
// go kill yourself". This is checked against the ENGLISH translation (a person
// wrote it, so it is the more reliable reading of what the sentence means) and
// the French.
//
// The line drawn: no violence done to a person as the point of the sentence,
// no self-harm, no sexual content, no slurs, no strong profanity, no hate. A
// sentence that merely mentions death or a war is fine; one that is ABOUT
// hurting someone is not. Wide on purpose — there are hundreds of thousands of
// sentences, and losing a few good ones costs nothing.

const EN = [
  [/\b(kill(ed|ing|s)? (yourself|himself|herself|myself|themselves)|suicid|commit(ted)? suicide|hang(ed)? (yourself|himself|herself))/i, 'self-harm'],
  [/\b(rape[ds]?|raping|molest|pedophil|paedophil|sexual(ly)?|sex\b|sexy|porn|naked|nude|orgasm|erotic|horny|masturbat|prostitut|whore|slut|boob|penis|vagina|dick\b|cock\b|pussy|testicl)/i, 'sexual'],
  [/\b(fuck|fucking|shit|bullshit|bitch|bastard|asshole|dickhead|cunt|damn|piss(ed)? off|goddamn|crap)\b/i, 'profanity'],
  [/\b(nigger|nigga|faggot|fag\b|retard|spic\b|chink|kike|gook|tranny|slave|slavery)\b/i, 'slur'],
  [/\b(nazi|hitler|holocaust|genocide|terroris|jihad|isis\b|al-qaeda|massacre|torture|behead|execut(e|ed|ion)|murder(ed|er|ing|s)?|shoot(s|ing)? (him|her|them|you|me|people)|stab(bed|bing)?|strangle|bomb(ed|ing|er)?\b)/i, 'violence'],
  [/\b(drunk|cocaine|heroin|marijuana|meth\b|overdose|get high|stoned)\b/i, 'drugs'],
  [/\bwould you like to (kill|die)|you should die|i('ll| will) kill|going to kill|want(s)? to die|wish(es)? (i|he|she|you) (was|were) dead/i, 'violence'],
];
const FR = [
  [/\b(suicid|viol(e|er|ée|és)?\b|baiser|bite\b|queue\b.*(bite)|chatte|putain|pute|salope|merde|con(ne|s)?\b|connard|enculé|foutre|branler|bander|nègre|pédé|tapette|youpin)/i, 'crude'],
  [/\b(tuer|tue |tué|assassin|massacr|égorg|pendre|se pendre|exécut|torture|nazi|hitler|terroris|bombe)/i, 'violence'],
];
export function unsuitable(en, fr = '') {
  for (const [re, why] of EN) if (re.test(en)) return why;
  for (const [re, why] of FR) if (re.test(fr)) return why;
  return null;
}
