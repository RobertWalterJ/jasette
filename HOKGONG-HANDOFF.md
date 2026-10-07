# Hok Gong: what Jasette has learned, and what to bring over

For the Claude Code session working on **Hok Gong** (`Documents\Cantonese`, v1.13.0).
Written from a survey of Hok Gong's current code (not from memory) and Jasette (`Documents\French`, v1.2.0 live, more built since).
Jasette is a sibling app: same engine family, built on top of Hok Gong's lessons. Several of its changes are improvements Hok Gong should have.

**How to use this:** read §1 (the gaps), pick from §2 (ranked), copy from the files named in §3, and read §5 (hazards) before touching the scheduler. Jasette's repo is `Documents\French`; every file named below is there.

---

## 1. The gaps, side by side

| | Hok Gong (v1.13.0) | Jasette (v1.2.0+) |
|---|---|---|
| **Questions per round** | 25 default (sittings 12 / 25 / 40) | **18** default (12 / 18 / 25 / 40). Rounds are short on purpose. |
| **New questions** | Steady = 9 per round, 30 a day | Steady = 9 per round, **40 a day on offer**; one round a day simply gives a slower 15–20 (nothing forced) |
| **Scheduler** | SM-2-lite (ease 1.35–3.0, max 270 days) | **FSRS** (`ts-fsrs`, 88% retention, no short steps), "known" must be proven at 21+ days |
| **Level check** | None (10 gated stages, everyone starts at stage 1) | **Adaptive placement** (12 frequency bands); stages below the floor are "assumed known" and only spot-checked |
| **Teaching before testing** | `meetCard`: one new-word card | New-word card **plus** lessons per grammar step, expression cards, and, for verbs, **which form each example uses** |
| **Grammar** | A lookup screen of patterns, no lessons | A **ladder of lessons** (16 steps), each stating *what it builds on*, a model, levels (Learning / Solid / Mastered), a weekly trend |
| **Progression** | 10 gated stages by frequency | Frequency stages **plus** the ladder, which opens when the step before is ~50% met and ≥60% right (with "skip ahead") |
| **Question kinds** | 12 kinds, 5 skills | 22 kinds, 6 skills (dialogues: content and checks done, player in progress; match-pairs and spot-the-error planned) |
| **Navigation** | Drill-down router, no tab bar; home = hero banner + 3 list rows; settings is a bottom sheet | **4-tab bottom bar** (Today / Course / Words / Progress), hero card with a progress ring, settings as a screen |
| **Themes** | Automatic light/dark only; no picker | 3 palettes × light/dark, picker in Settings; all colour-blind audited |
| **Controls** | Stacked option cards for pace and sitting | Full-width **segmented controls**; toggles; no cramped columns |
| **Interface language** | 22-phrase ladder, English → Cantonese, only some menus | ~154 phrases, **fades per phrase** by days seen, one button to bring English back, long-press shows it |
| **Read-aloud** | Press-to-play; autoplay on listening questions only | A speaker beside every choice, an "À voix haute" button on every question, **auto-read** (off / question / question + choices / answer too), speed |
| **Install** | No install button; manifest has **no `id`** | In-app install button and steps (Android + iPhone), unique manifest `id`, `notranslate` |
| **Storage** | Manual JSON backup only | Tiers (core / bundled / remote), a size cap, "keep essentials", "free up space", a provenance manifest so a clip can never be the wrong word |
| **Version** | Settings footer + About | Settings footer + About card + changelog |
| **Debug** | None | `?debug` with `J.sweep()` and `J.teach()` rendering every card kind and flagging "null", missing buttons, empty cards |

## 2. What to bring over, ranked (value ÷ effort)

1. **Shorter rounds and the 40/day model.** Set the default sitting to ~18 (keep 12 / 25 / 40 as options), `newPerRound` 9, `newPerDay` 40. Retune `MIN_NEW` (6) so reviews are not squeezed out: a short round with a big new quota starves reviews. **Re-run `test-schedule` with several short rounds a day, not 2–6 long ones**, and add a "casual" scenario (1–3 rounds) that must still get ~15–20 new in the first fortnight. (Jasette's `build/test-schedule.mjs`.)
2. **Fix the PWA identity.** Add a unique manifest `id` (`/hokgong/`), `notranslate`, and the in-app install flow (`app/js/app.js` `installApp`, `installSheet`, `installCard`). This is Robert's standing shared-origin rule; Hok Gong currently breaks it.
3. **A level check.** Jasette's `app/js/placement.js` (adaptive staircase over frequency bands) plus assumed-known stages and spot checks (`Round` `spot` option). For Cantonese, bands should be by Hok Gong's own frequency ranks; keep the English-first instructions and "I don't know" button, and teach on a wrong answer.
4. **FSRS in place of SM-2-lite.** `app/js/vendor/ts-fsrs.mjs` + the FSRS block in `schedule.js` `State.answer`. Keep Hok Gong's rules: no repeats in a session, a miss is due tomorrow, "known" only after 21 days proven. Intervals reach 3 → 18 → 86 days instead of 3 → 7 → 15, which is what makes 30+ new a day sustainable.
5. **Grammar as a ladder of lessons** (see §4: Cantonese has no conjugation, so the unit is a *pattern*: aspect particles 咗 / 緊 / 過, measure words, sentence-final particles 啦 / 嘅 / 喎, 係 vs 喺 vs 有, comparison, questions with 咩 / 乜嘢). Copy the *mechanism*: `content/conjugation.mjs` (rungs), `conjugation-lessons.mjs` (`TEACH` + `BUILDS`, where each lesson names earlier steps and verify rejects a forward link), `core.js` `conjState` (open rule, levels, trend), `teach.js` `lessonCard`.
6. **Teach before test, extended.** Jasette's `teach.js` `wordIntro` adds example sentences and, where a form is non-obvious, an explanation of which form the example uses. For Cantonese the analogue is *marking the particle or measure word in the example* ("this 咗 marks a completed action"). `forms.js` is pure and testable in Node; write the Cantonese reader the same way, with its own test (`build/test-forms.mjs`).
7. **Read-aloud, three layers** (`app/js/read.js`): speaker beside each choice, a per-question button, auto-read mode. **Use the Cantonese voice only; Hok Gong already refuses Mandarin voices, keep that.** Take the `speech.js` fix: never accept a voice just because its *name* contains a region word (Jasette picked "English (Canada)" as its Québec voice). `build/test-voices.mjs` is the guard; adapt the lists to `zh-HK` / `yue`.
8. **Navigation and style.** A 4-tab bar with large tap targets and a hero card with a progress ring; settings as a screen; full-width segmented controls instead of stacked cards. Hok Gong's identity (pink paper, red accent, blue "right", plum "wrong", Han undertext hero) should stay. Borrow the structure, not the colours. (Jasette `app/style.css`: `.tabbar`, `.seg`, `.srow:has(> .seg)`, `.hero`, `.ring`.)
9. **Storage tiers and a size cap** for the audio (`sw.js`, `app/js/audio.js` `tierOf`, `app/js/storage.js`, `build/lib/tiers.mjs`, `build/test-budget.mjs`). Include the **provenance manifest**: clips are filed by rank, ranks shift, so a clip fetched under an old numbering plays the *next* word.
10. **Expressions / odd usages.** Cantonese is full of them (e.g. 食飯 vs 食咗飯, and slang). The pattern: `content/expressions.mjs` with a Wiktionary sense that must back the meaning, an etymology claim only where the head word's etymology says it, and honest "nobody knows why". (`build/expressions-src.mjs`, `build/lib/expressions.mjs`.)
11. **Debug and visibility.** `?debug` + `J.sweep()` / `J.teach()`; a clear Version card in About.

## 3. Question formats worth adding (research summary)

From the research done for Jasette (links in `RESEARCH-FORMATS.md` when it lands): recall beats recognition; the pretesting effect means asking before teaching still helps; immediate feedback beats delayed; interleaving is *weak* for vocabulary (don't mix too aggressively); spacing and retrieval are well supported. So:

- **Keep** tap-to-fill, meaning picks, listening picks.
- **Add** *spot the error* (three lines, one wrong), *match pairs* (five French ↔ five English, touch-friendly), and **dialogues** (hear a line, choose the natural reply, see why: Jumpspeak's "listen → respond" idea, with no timers and no usage caps).
- **Add productive (recall) variants** where they are cheap to mark: tapping the letters/tones in order is cheaper to build than typing, and dyslexia-safe.
- **Add shadowing** (optional, speech recognition is imperfect for learners).

## 4. Cantonese-specific notes

- No conjugation, so the "ladder" is a ladder of **patterns**. Each rung needs a model sentence built from the deck, so every character and Jyutping in a lesson is source-backed.
- Tone is the hard skill: Hok Gong's `tone-pair` and `tone-say` have no Jasette analogue and are worth protecting.
- The sense-ranking lesson (Hambaanglaang frequency as a *veto*, never a gloss) stays as written in memory.

## 5. Hazards (each one cost Jasette an afternoon)

1. **Pacing rules multiply.** Check the *interaction*. In Jasette a "second look at each new item" feature quietly added up to 8 extra new items per sitting and broke a daily allowance; the fill-up rule added more. Both needed a `capNew` switch. `test-keen` + a simulation of the *shipped* regime are the only guard.
2. **Simulate what ships.** Sitting size, pace presets and rounds-per-day all override module constants.
3. **Shell heredocs and `node -e` halve backslashes**, silently corrupting regexes. Use the Edit/Write tools for anything with `\`.
4. **`Node.append(null)` prints "null".** Filter optional children. A render sweep (`J.sweep`) catches it; nothing else did.
5. **A timed-out debug script keeps running in the page** and can interfere with the next test (it got read aloud). Reload between tests.
6. **A voice's *name* is not its language.** Check `lang`.
7. **Ranks shift, clip names do not.** Provenance manifest, always.
8. **Don't claim an etymology the source doesn't give.** Say "nobody knows why".
9. **Intransitive-or-transitive helpers:** don't build a "wrong answer" that is actually valid French. (Analogue for Cantonese: don't build a distractor that is a valid alternative.)

## 6. Inconsistencies found in Hok Gong today

- README says "nine kinds"; there are 12.
- About says "never more than twelve a day" but the Steady pace is 30.
- `?debug` is absent, so nothing renders every card for a sweep.
- Manifest has no `id`; no `notranslate`.
- A stale comment about a placement check that does not exist (`schedule.js` ~L227).

## 7. A prompt to paste into the Hok Gong session

> Read `Documents\French\HOKGONG-HANDOFF.md`. Work through §2 in order, one item at a time. Before each, read Jasette's named file and adapt it; do not copy blindly (Cantonese has tones, characters and no conjugation). After each: run `npm run check`, add a deliberate-fault case to `build/test-verify.mjs` for any new content, and re-run `test-schedule` and `test-keen` with the **shipped** settings. Do not push without asking Robert. Start with items 1 and 2 (round length / 40-a-day, and the manifest `id` + install flow).
