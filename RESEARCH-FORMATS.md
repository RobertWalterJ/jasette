# Learning and question-format research (for Jasette and Hok Gong)

Findings from web searches, 2026-10-07. These are summaries of what the search results said, not
a literature review; follow the links before leaning hard on any single claim.

## What the evidence supports

- **Retrieval, spacing and "desirable difficulty"** are the best-supported foundations: being made to
  recall something beats re-reading it, and spacing makes it last. A study on German as a foreign language
  found better delayed retention and production for learners who used spacing, retrieval and generative
  tasks. ([Berkeley teaching guide](https://teaching.berkeley.edu/node/114),
  [Carl Hendrick's dispatch](https://carlhendrick.substack.com/p/the-monthly-dispatch-whats-new-in-3c4),
  [German as a foreign language study](https://ensani.ir/fa/article/633887/desirable-difficulties-and-long-term-learning-outcomes-in-german-as-a-foreign-language-evidence-from-iranian-learners))
- **Interleaving is weaker for second-language vocabulary** than for maths-style skills. Don't mix topics
  aggressively for words; use it for grammar and forms. (Same Carl Hendrick source.)
- **Recall (productive) beats recognition (multiple choice)** for building *active* vocabulary; in one
  comparison, sentence-writing was most effective, then gap-filling, then choosing a definition. But
  gap-filling and choice train *receptive* knowledge and leave learners less ready to produce.
  ([productive vs receptive testing](https://doaji.irandoc.ac.ir/home/article?id=101832),
  [C-test vs multiple choice](https://sanad.iau.ir/en/Article/907868))
- **The pretesting effect:** asking a question *before* teaching improves later recall even when the
  learner gets it wrong; immediate feedback beat delayed feedback.
  ([Pretesting and feedback timing](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12292081/),
  [timing of corrective feedback in L2](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9995700/))
  This supports Jasette's "wrong is fine, here is why" after every answer, and says teach-then-test and
  test-then-teach are both fine; what matters is that the explanation follows promptly.
- **Shadowing** (repeating speech as you hear it) improved listening comprehension, fluency and some
  aspects of pronunciation in several studies, especially over weeks.
  ([Shadowing as a method](https://journal.uia.no/index.php/NJLTL/article/view/1139))
- **Duolingo's published scheduler work** (half-life regression) improved retention, and shows that
  a per-item memory model beats fixed schedules, which Jasette already uses (FSRS).
  ([How we learn how you learn](https://blog.duolingo.com/how-we-learn-how-you-learn),
  [HLR paper](https://preview.aclanthology.org/fix_video/P16-1174.pdf))
- **Variety of drill types** is standard across Busuu, Babbel and Duolingo: fill-in-the-blank, flashcards,
  matching pairs, sentence construction, multiple choice, across reading, writing, listening and speaking.
  ([comparison](https://testprepinsight.com/comparisons/busuu-vs-babbel/))

## What it means for the apps

1. Keep retrieval and spacing at the centre (done: FSRS, no repeats in a session).
2. Add **recall-leaning** formats where marking is cheap and dyslexia-safe: tap-to-build, tap the letters or
   pieces in order, and **dialogues** (respond, not just recognise).
3. Add **matching pairs** and **spot the error**: low cost, good variety, receptive-to-productive bridge.
4. Keep immediate, specific feedback with the reason (already the rule).
5. Offer **shadowing** as an optional mode, never a requirement (speech recognition is imperfect for learners).
6. Don't interleave unrelated vocabulary aggressively in one round; do interleave *forms* of the same grammar.

## Apps studied

| App | The idea worth taking | Source |
|---|---|---|
| Jumpspeak | Listen → write → speak → conversation in three minutes; situation-based lessons | [Lingopie](https://lingopie.com/blog/jumpspeak-review), [Languatalk](https://languatalk.com/blog/jumpspeak-review/) |
| Pimsleur | Anticipation (answer before you hear it) and graduated-interval recall; grammar through use | [Pimsleur](https://www.pimsleur.com/blog/memory-and-language-learning-how-pimsleur-helps-you-retain-what-you-learn/) |
| Glossika | Mass sentences with one pattern, spaced; best for upper-beginner to intermediate | [Glossika](https://glossika.notion.site/What-is-the-Mass-Sentence-Method-272b88aeb94380c09290f944f52c4c23) |
| Language Transfer | Work the grammar out aloud from what you already know | [Actual Fluency](https://actualfluency.com/language-transfer) |
| Kwiziq | Grammar as a knowledge map with per-point confidence and targeted mini-lessons | [Kwiziq tour](https://french.kwiziq.com/tour) |

## Built or planned because of this

- Built: lessons that build on earlier steps with levels and a trend (Kwiziq); teaching cards before testing (pretesting
  literature says both orders work).
- In progress: dialogues (Jumpspeak): the five exchanges and their verification are done, the player screen is next.
- Planned: spot-the-error and matching pairs (variety); shadowing mode; sentence "pattern sets" (Glossika);
  "think it through" cards (Language Transfer).
