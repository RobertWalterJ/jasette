// The short gloss shown on a question's buttons, from a Wiktionary gloss.
// Shared by build/words.mjs (which makes them) and build/verify.mjs (which
// checks them), so the check runs the very code that produced the answer.

// A short gloss for a question's buttons; the long one is kept for the card.
export function shorten(g) {
  let s = g.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) s = g.trim();
  s = s.replace(/ (in|of) colou?rs?\b/, '').replace(/^(a|an) (?=[a-z]{3,})/i, '');
  s = s.split(/;\s*/)[0].trim();
  const cs = s.split(/,\s*/);
  s = cs[0];
  if (cs[1] && (s + ', ' + cs[1]).length <= 28 && !/^(of|or|and|in|on|with)\b/.test(cs[1])) s += ', ' + cs[1];
  s = s.replace(/\.\s*\d+$/, '').replace(/[.:]+$/, '').trim();
  if (s.length > 44) s = s.slice(0, 44).replace(/\s+\S*$/, '');
  return s;
}
