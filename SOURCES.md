# Sources

Everything the app teaches comes from one of these. Nothing is invented: each word
carries the meaning and gender its sources give it, each verb form is one
Wiktionary's table lists, each sentence is quoted verbatim with its author, and
every recording is credited by speaker. The explanations of grammar and of when to
use which word are the author's, and the app says so each time.

## Frequency and forms

**Lexique 3.83**, Boris New, Christophe Pallier et al. — https://www.lexique.org
· CC BY-SA 4.0. For every lemma: its frequency in film subtitles (the nearest
thing to speech) and in books, every inflected spelling, and the gender Lexique
records. The deck's order is `0.6 × films + 0.4 × books`. *Limitation:* the
subtitles are mostly from France; Québec speech is not separately counted.

## Meanings, sounds and conjugation

**English Wiktionary**, via kaikki.org's machine-readable dump
(https://kaikki.org/dictionary/French/) · CC BY-SA 3.0 / 4.0. Meanings, tagged by
region and register; IPA, with Québec and France pronunciations where they differ;
the full conjugation table of every verb (and which auxiliary it takes); and the
links to recordings. A lemma's meaning is chosen by `build/senses.mjs`, which
ranks Wiktionary's senses by what the translators of 378,000 sentences reach for
(it is only ever used to RANK senses a dictionary gives, never as a gloss), and
for ~170 closed-class and polysemous words by hand (`content/glosses.mjs`, which
`build/verify.mjs` checks against Wiktionary).

## Sentences

**Tatoeba** — https://tatoeba.org · sentences CC BY 2.0 FR. 378,000 French
sentences with an English translation, filtered for suitability
(`content/unsuitable.mjs`). Recordings, where they exist, are by Tatoeba
contributors and are mostly CC BY-NC-ND 3.0 or CC BY-NC 4.0: free, unmodified,
credited and for non-commercial use. *Only 1,242 of 59,296 Creative-Commons-licensed
French recordings in Tatoeba's weekly export still exist on the audio server*
(`build/probe-audio.mjs` asks, with a HEAD request, about every one); the rest
have been deleted since the export was made.

## Voices

**Lingua Libre** recordings on **Wikimedia Commons** · CC BY-SA 4.0 (some CC0),
each file's licence on its Commons page. The Québec voice is
DenisdeShawi (Shawinigan); the France voices are GrandCelinien (Paris),
WikiLucas00 (Lyon), Poslovitch and LoquaxFR (Vosges), Lepticed7 (Toulouse) and
others, in that order of preference. A word with no Québec recording says so and
plays the France one, or the phone's fr-CA voice, labelled as a machine.

## The Canadian French track

Every claim in `content/canadian.mjs` — "in Québec, this word means that" — is
one English Wiktionary makes about that word, on a sense it tags Québec, Canada or
North America (`build/canadian-src.mjs` pulls the entry whole; `build/verify.mjs`
compares). A second, independent opinion is asked of the **French Wiktionnaire**
(CC BY-SA) by `build/canadian-crosscheck.mjs`; 45 of 58 entries are marked there
too, and the app says which. The "in France" column is the author's, not a
dictionary's, and is marked as such. The *sacres* (the church-word swearing) are
not drilled.

## Scheduling

**ts-fsrs** 5.4 (the Free Spaced Repetition Scheduler, FSRS-6), Open Spaced
Repetition · MIT. Vendored as `app/js/vendor/ts-fsrs.mjs`.

## Fonts

**Atkinson Hyperlegible** (Braille Institute) and **Fraunces** (Undercase Type) ·
SIL Open Font License, self-hosted.

## Considered and not used

- **ABC-style dictionaries and the OQLF *Grand dictionnaire terminologique***:
  all rights reserved.
- **Common Voice (fr)**: CC0 and has Canadian speakers, but its download is gated
  behind an account and tens of gigabytes; worth revisiting for Québec sentence audio.
- **Dictionnaire des francophones**: its regional labels would be a third source
  for the Canadian track; the public site is up but there is no open API.


## Office québécois de la langue française: Banque de dépannage linguistique (added 2026-10-07)

- **What:** about 25,000 sentences labelled grammatical or ungrammatical, each filed under the page of the OQLF's
  language bank that explains the rule (spelling, vocabulary, anglicisms, grammar, syntax, typography…).
- **Used for:** the *Laquelle est correcte ?* questions (320): one correct sentence and the two wrong ones from the
  same rule page that look most like it. The rule is the OQLF's own page, linked after the answer; the app does not
  reword it.
- **From:** Données Québec, dataset *Données linguistiques et terminologiques tirées de la Vitrine linguistique*
  (https://donneesquebec.ca/recherche/dataset/donnees-linguistiques), published by the Office québécois de la langue
  française; data last updated 2026-07-10. Fetched by build/oqlf-src.mjs into sources/oqlf/ (not committed).
- **Licence:** CC BY-NC-SA 4.0: attribution, **non-commercial**, share-alike. Jasette is a free personal app; the
  deck's OQLF questions carry the same licence and the attribution on the About screen. Not for commercial use.
- **Not used:** the OQLF's 20 MB set of full terminology cards, and its 1,470 official terms (mostly technical
  vocabulary, e.g. 'sheepsfoot roller').
- **Checked:** build/verify.mjs re-reads the OQLF file and fails if any question's right sentence is not labelled
  grammatical on its page, or a wrong sentence is not labelled ungrammatical on the same page.

## Wikipedia (culture notes)

- **Used for:** the fourteen notes in the Culture section, written in the app's own words from named articles
  (Quebec French, Joual, Quebec French profanity), text under CC BY-SA 4.0. Each note's key phrases are checked
  against the saved article text (corpus/culture-wikipedia.json, with revision ids) when the app is built.
