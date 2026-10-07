// Jasette — does the palette still carry its information without colour?
//
//   node build/audit-colour.mjs            report, and fail on any loss
//   node build/audit-colour.mjs --full     every check, including the passes
//
// The rule and the engine live in build/lib/audit-template.mjs, shared with
// Hok Gong, Landfall, Halyard, Wordhoard and Commonplace. This file only says
// which tokens mean what, and where.
//
// Six palettes — Fleurdelisé, Tricolore and Montréal, each light and dark — all
// checked. A palette that passes in light and fails in dark is not a palette
// that passes. And the rule that makes this a short list: the right answer is
// always BLUE and the wrong one always a red-brown, because that pair survives
// red-green colour blindness where red and green do not.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAudit } from './lib/audit-template.mjs';

const D = ':root[data-eff="dark"]', T = ':root[data-theme="tricolore"]', M = ':root[data-theme="montreal"]';
const SPEC = {
  files: ['app/style.css'],
  surfaces: [
    ['fleurdelisé · clair', ':root'],
    ['fleurdelisé · sombre', [':root', D]],
    ['tricolore · clair', [':root', T]],
    ['tricolore · sombre', [':root', D, T, T + '[data-eff="dark"]']],
    ['montréal · clair', [':root', M]],
    ['montréal · sombre', [':root', D, M, M + '[data-eff="dark"]']],
  ],
  pairs: [
    // Right and wrong carry a ✓ and a ✗, so colour reinforces a glyph…
    { a: '--right', b: '--wrong', channel: 'shape', where: 'the marked answer and the verdict line' },
    { a: '--right-bg', b: '--wrong-bg', channel: 'tint', where: 'the wash behind a marked answer' },
    // …and those glyphs have to be legible on their own washes.
    { a: '--right', b: '--right-bg', channel: 'lightness', where: 'the ✓ on the right-answer wash' },
    { a: '--wrong', b: '--wrong-bg', channel: 'lightness', where: 'the ✗ on the wrong-answer wash' },
    // Progress is read by fill alone: the bar, the ring, the line between stations.
    { a: '--accent', b: '--line', channel: 'lightness', where: 'a progress bar against its track' },
    { a: '--accent', b: '--chip', channel: 'lightness', where: 'a skill bar against its track' },
    // The three states in the word list (not met / met / known) are marked by a
    // dot with a label, but the dots must still separate by lightness.
    { a: '--line', b: '--dot-met', channel: 'lightness', where: 'word list: not met yet against met' },
    // A filled slot or an answered station sits on a card.
    { a: '--accent', b: '--card', channel: 'lightness', where: 'the filled station and the drawn ring on a card' },
    { a: '--dot-met', b: '--card', channel: 'lightness', where: 'the ring of a station not yet reached' },
    // The accent is a control colour; wrong is a verdict. They must not be one
    // another's twin.
    { a: '--accent', b: '--wrong', channel: 'tint', where: 'the accent against the wrong-answer red' },
  ],
  text: [
    { fg: '--ink', bg: '--bg', where: 'headings and body on the page' },
    { fg: '--ink', bg: '--card', where: 'questions, answers, options' },
    { fg: '--muted', bg: '--card', where: 'the notes under a question' },
    { fg: '--muted', bg: '--bg', where: 'the line under the home links' },
    { fg: '--muted', bg: '--chip', where: 'small print on a chip' },
    { fg: '--ink', bg: '--chip', where: 'the word-list rows and bank tiles' },
    { fg: '--accent', bg: '--card', where: 'links, the skill chip and the play button' },
    { fg: '--accent', bg: '--bg', where: 'the wordmark and the active tab' },
    { fg: '--accent', bg: '--tint', where: 'a chip and a play button on a wash' },
    { fg: '--accent-ink', bg: '--accent', where: 'the Commencer button' },
    { fg: '--ink', bg: '--right-bg', where: 'the text of a right answer' },
    { fg: '--ink', bg: '--wrong-bg', where: 'the text of a wrong answer' },
    { fg: '--right', bg: '--right-bg', where: 'the verdict "Exact"' },
    { fg: '--wrong', bg: '--wrong-bg', where: 'the verdict "Pas tout à fait"' },
    { fg: '--wrong', bg: '--card', where: 'a warning on a card' },
    { fg: '--ink', bg: '--tint', where: 'the Québec card of the day' },
    { fg: '--muted', bg: '--tint', where: 'the small print on the Québec card' },
  ],
};

runAudit(SPEC, join(dirname(fileURLToPath(import.meta.url)), '..'));
