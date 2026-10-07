# Jasette — le français, canadien d’abord

An app to **keep and extend your French**, built for someone who already has it.
Québec first, France alongside. Phone-first, installable, works offline.

Built the way [Hok Gong](https://github.com/RobertWalterJ/hokgong) was: spaced
retrieval, nothing taught that a source does not say, and measurement you can
check. The difference is the learner. Hok Gong starts from nothing; Jasette starts
by finding where you stand and then spends its teaching on what is new.

## What it does

- **Finds your level first.** A five-minute adaptive check (30 words, from the
  commonest to the rarest, with an honest *je ne sais pas*) estimates your
  vocabulary and places you in the course. Everything behind your stage is
  *assumed known* — asked only as occasional spot checks. A spot check answered
  right graduates at once; one answered wrong becomes ordinary new material.
- **7,000 words in eight stages**, ordered by how often French is actually
  used (films and books), A1 to C1. 30–40 new questions a day by default.
- **Both accents, by ear.** A Québec speaker (Shawinigan) and speakers from
  France (Paris, Lyon, Toulouse, the Vosges) for the words; ~1,100 recorded
  sentences. Each clip is credited by name. The phone's own fr-CA / fr-FR voice
  fills in, and is labelled as a machine.
- **A Canadian French track** — *dépanneur*, *tuque*, *souper* / *dîner* /
  *déjeuner*, *bienvenue*, *magasiner*, and the way it is said (*tsé*, *chu*,
  *pantoute*). 58 entries, every claim checked against Wiktionary at build time,
  45 also confirmed in the French Wiktionnaire.
- **Twenty-one kinds of question** across six skills (listening, speaking,
  reading, writing, grammar, Québec): hear / read / pick a word, gaps filled by
  **tapping words into the blanks** (one or several), un or une, the right form of
  a verb, avoir or être, participle agreement, words that sound alike, which
  spelling, minimal pairs, putting a sentence in order, false friends.
- **A conjugation track of its own** (*Conjugaison*): ~6,400 drills in sixteen steps,
  built from each verb's own Wiktionary table. It starts with the twelve verbs in
  almost every sentence (être, avoir, aller, faire…) in the present, then regular
  -er verbs, the other common verbs, passé composé, imparfait, futur proche, futur,
  conditionnel, impératif, plus-que-parfait, subjonctif, the compound tenses, and
  finally every verb to the 3,500th word. A step opens when the one before is about
  half met, or when you say you already know it. It has its own daily allowance
  (6 / 12 / 24 / 40 new) and shows the whole pattern after every answer.
  `build/verify.mjs` re-derives every answer independently (helper, participle
  agreement, elision, the imperative's dropped s) and `test-verify.mjs` breaks five
  of those rules on purpose.
- **Taught before it is tested.** A new word gets a card first (meaning, both accents,
  example sentences; for a verb its present tense and *which form* each example sentence
  uses: “est apparu” = passé composé of apparaître, read from the verb's own table by
  `app/js/forms.js` and tested in `build/test-forms.mjs`). Each conjugation step opens with
  a lesson (what the tense is for, how it is made, what to watch for, a worked model verb) that
  shows which earlier steps it is **built on** and how you are doing on them; a step opens when
  the one before is half met and going well, and shows Learning / Solid / Mastered and a weekly
  trend.
- **Odd usages, explained.** Phrases whose words don't add up (*avoir du bol*, *poser un
  lapin*, *tomber dans les pommes*): 23 of them, each one a question and a card with the
  word-for-word reading and the explanation. The meaning must be one English Wiktionary gives
  (`build/lib/expressions.mjs`, checked again by verify), an origin is claimed only if the head
  word's Wiktionary etymology says it, and where nobody knows why (as with *bol* and *pot*)
  the card says so.
- **Short rounds.** 18 questions a round; up to 40 new a day on offer across several rounds,
  or a slower 15–20 a day if you do one. Nothing is forced.
- **Read aloud, three ways**: a speaker beside every choice, an *À voix haute* button on every
  question, and an auto-read mode that says each question as it appears (and, if
  wanted, the answer afterwards). Any touch stops it.
- **Scheduling by FSRS** ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs),
  MIT): 88% requested retention. Intervals grow 3 → 18 → 86 days where SM-2 gave
  3 → 7 → 15, which is what makes 30+ new questions a day sustainable.
- **Designed for a dyslexic reader**: Atkinson Hyperlegible, no timers, no capitals,
  read-aloud on every word, sentence and explanation, a roomier-spacing setting and
  a switch that sets the French in sans-serif. Three palettes — *Fleurdelisé*,
  *Tricolore* and *Montréal* — each light and dark, all audited for colour blindness.

## Running it

```
npm install
npm run corpus      # Lexique + Wiktionary + Tatoeba -> corpus/
npm run audio       # probe which recordings still exist, build the deck, fetch them
node build/items.mjs
npm run dev         # http://localhost:8899 (add ?debug to open any one question)
npm run build       # all the gates, then docs/ for GitHub Pages
```

`sources/` (Lexique 3.83, the kaikki.org Wiktionary dump, the Tatoeba exports) is
not committed; `SOURCES.md` says where each comes from.

## The gates

`npm run check` fails the build if any of these fail:

| gate | what it checks |
|---|---|
| `build/verify.mjs` | ~550,000 checks (including every conjugation drill re-derived independently, every expression re-checked against Wiktionary, every lesson's "builds on" link): every gloss is one Wiktionary gives; every gender is one Lexique and Wiktionary agree on; every conjugated form is in Wiktionary's table; every sentence is Tatoeba's, suitable, and every recording exists and is credited; no question has two right answers; every grammar point has a question; every Canadian claim is Wiktionary's; every French word in the interface is a spelling Lexique knows |
| `build/test-verify.mjs` | breaks 24 things on purpose and requires all 24 to be caught |
| `build/audit-colour.mjs` | no meaning rides on hue alone, in six palettes, under deuteranopia, protanopia, tritanopia or no colour at all |
| `audits/run-dyslexia.mjs` | no capitals, no centred prose, no fast timers, read-aloud throughout, an off-white page |
| `build/test-voices.mjs` | French is only ever read by a French voice ("English (Canada)" is not one) |
| `build/test-forms.mjs` | the tense a form in an example sentence is said to be is the right one |
| `build/test-budget.mjs` | every recording is on the phone, cached and trimmable, or streamed; the budgets hold |
| `build/test-layout.mjs` | nothing wider than a 320px phone |
| `build/test-schedule.mjs` | plays 180 days (from the start; placed at stage 4; a casual learner; with a daily conjugation sitting) against the app's own `core.js`: no repeats, full rounds, 30+ new a day, bounded backlog, spot checks that graduate |
| `build/test-keen.mjs` | eight rounds back to back must all come up full |

## What it cannot do

It cannot hear whether you pronounced a word correctly. Speech recognition (off
by default) sends your voice to the browser-maker and mishears learners more than
natives. The recorded sentences are mostly French from France; Québec French
comes through the recorded words and the Québec track. Frequency is from
subtitles and books, not from Québec speech, so the order is French's, not
Québec's. And no estimate of your vocabulary from thirty questions is a measurement.

## Licence

The code is Robert Walter-Joseph’s, MIT ([LICENSE](LICENSE)). The data belongs to
the projects in [SOURCES.md](SOURCES.md) and is used under their licences, which
require attribution — hence the About screen. `app/js/vendor/ts-fsrs.mjs` is
ts-fsrs, MIT.
