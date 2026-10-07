// Does the form-reader read forms correctly?   node build/test-forms.mjs
//
// forms.js tells the learner what a conjugated form in an example sentence IS ("est apparu" =
// passé composé). A wrong reading would teach the wrong thing, so it is checked against known
// cases, using the real deck's own verb tables.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readForms, tokenize } from '../app/js/forms.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const verb = (l) => { const i = deck.words.findIndex((w) => w.w === l); return { verb: l, conj: deck.conj[i], aux: deck.words[i].aux }; };
const says = (l, sentence) => readForms(verb(l), sentence, deck.conjTenses).map((f) => `${f.surface}: ${f.says}`);

const cases = [
  ['parler', 'Nous parlons français.', /^parlons: present, nous$/],
  ['parler', 'Je parle trop.', /^parle: present, je$/],                                  // narrowed by "je"
  ['parler', 'Il parle trop.', /^parle: present, il \/ elle \/ on$/],                    // narrowed by "il"
  ['parler', 'Il faut que tu parles.', /parles: .*subjunctive/],                         // ambiguous: shows both readings
  ['apparaître', 'Il est apparu de nulle part.', /^est apparu: past .*passé composé|^est apparu: .*helper .*past participle/],
  ['parler', "J'ai parlé hier.", /^ai parlé: .*helper .*past participle/],
  ['parler', 'Elle parlait doucement.', /^parlait: imperfect, il \/ elle \/ on$/],
  ['parler', 'Je voudrais parler.', /^parler: the infinitive/],
  ['parler', 'Il est parlé de ça.', /^est parlé: /],
  ['aller', 'Nous allons au marché.', /^allons: present, nous$/],
  ['aller', 'Elle est allée au marché.', /^est allée: .*helper .*past participle/],        // agreement: allée
  ['aller', 'Ils iront demain.', /^iront: future, ils \/ elles$/],
  ['finir', 'Il a fini son travail.', /^a fini: /],
  ['parler', 'La maison est grande.', null],                                             // no form of parler: nothing
];
let checks = 0;
const fails = [];
for (const [l, s, want] of cases) {
  const got = says(l, s);
  checks++;
  if (want === null) { if (got.length) fails.push(`${l} / "${s}": expected nothing, got ${JSON.stringify(got)}`); continue; }
  if (!got.some((g) => want.test(g))) fails.push(`${l} / "${s}": got ${JSON.stringify(got)}, expected ${want}`);
}
// elision splits j'ai into j' + ai
checks++;
if (tokenize("J'ai parlé de l'été").map((t) => t.key).join('|') !== "j'|ai|parlé|de|l'|été") fails.push('tokenize does not split elisions');
if (fails.length) { console.error('test-forms FAILED:'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log(`test-forms: ${checks} checks — forms in example sentences are read correctly.`);
