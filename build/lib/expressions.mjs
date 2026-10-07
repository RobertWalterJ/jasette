// Is an expression backed by Wiktionary?  Used by build/items.mjs (to leave out what is not),
// build/verify.mjs (to check the deck again) and build/check-expressions.mjs (to print why).
//
// `src` is corpus/expressions-src.json: { entryWord: [{ pos, etym, senses: [{ g, t, ex }] }] }.
// Returns the reasons it is NOT backed; an empty list means it is.
export function backing(e, src) {
  const why = [];
  for (const w of e.wik) {
    const re = new RegExp(w.has, 'i');
    const hit = (src[w.word] || []).flatMap((x) => x.senses).find((s) => re.test(s.g));
    if (!hit) why.push(`no sense of "${w.word}" matches /${w.has}/`);
  }
  if (e.etym) {
    const text = (src[e.etym.word] || []).map((x) => x.etym).join(' ').toLowerCase();
    for (const k of e.etym.says) if (!text.includes(k.toLowerCase())) why.push(`the etymology of "${e.etym.word}" does not mention "${k}"`);
  }
  return why;
}

// The first Wiktionary example of the sense that backs the expression, if it has one.
export function exampleFor(e, src) {
  const re = new RegExp(e.wik[0].has, 'i');
  const hit = (src[e.wik[0].word] || []).flatMap((x) => x.senses).find((s) => re.test(s.g) && s.ex?.length);
  return hit?.ex?.[0] || null;
}
