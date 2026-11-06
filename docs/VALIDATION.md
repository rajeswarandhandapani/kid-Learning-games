# Validation · September 7, 2026

## Automated checks

- Static build verifies local game links and packages all 28 activities.
- Progress regressions cover rewards, reset, malformed/unavailable storage, expired streaks, and practice speed-record isolation.
- Chromium browser checks exercise all 27 quiz activities: start, choose an answer, feedback, next question, and return to setup.
- Complete counting practice round, results, replay, and progress persistence after reload.
- Timed expiry, automatic transition, cancellation on exit, and unlimited practice time.
- Search, empty results, reset filters, learning-stage filtering, favorites saved across reload, and the grown-up dialog.
- Complete Memory Garden through card interactions, reward once, and restart with a clean board.
- No page runtime errors or external asset requests in the tested flows.
- Responsive overflow checks across all activities at 390px; home, counting, stories, and memory additionally checked at 320px and 768px.

## Visual inspection

Reviewed Chromium screenshots of the desktop home, phone home/library, counting, Story Detectives, and Memory Garden. Fixed missing picture glyphs, emoji font spacing, card star alignment, and small-screen control wrapping. Screenshots are generated in `artifacts/` by `npm run test:e2e`; additional narrow and tablet snapshots are saved there from the final visual pass.

## Practical limits

- Tested in local Linux Chromium, not physical iOS/Android devices or Safari/Firefox.
- Speech synthesis uses the device's voices. Browser controls were exercised, but pronunciation and Tamil voice quality were not audited by listening.
- Age bands are suggestions; activities have not undergone formal curriculum or child-user validation.
- Scores, favorites, and progress remain on one browser. There is no cloud sync or parent account.
- The bundled emoji font adds about 11 MB on its first load and is cached by the browser according to hosting headers.

## Tamil typing additions · September 7, 2026

- Two new, separately linked activities: Tamil Sentence Words and Tamil Missing Letters. Total library count is now 30.
- The shared bank has 32 distinct Tamil sentence contexts across three topics. Letter mode excludes one-letter words, leaving 31 eligible contexts.
- Unit tests cover all target words and synonyms against the available on-screen keyboard, canonical Unicode normalization, and Tamil consonant/vowel-sign/pulli boundaries.
- The dedicated browser suite completes one shuffled 10-sentence round in each mode. It checks empty and incorrect submissions, retries, whole-word rejection in letter mode, native text insertion with Enter, composition-event submission protection, on-screen typing/deletion, answer reveal followed by required typing, pinned answer preview, score recording, replay, and persistence after reload.
- Both games were captured and visually inspected at phone and desktop widths; overflow checks and screenshots cover 320, 390, 768, and 1366 pixels. Wider compound-letter keys and a pinned answer preview address small-screen keyboard usability.
- The full library regression passed with all 30 activities; no browser page errors were observed.
- The site remains local. These additions were not exported or published.

## Tamil voices and 11 new Tamil activities · October 16, 2026

- 188 human recordings from Wikimedia Commons / Lingua Libre (CC BY-SA 3.0/4.0, CC0), 1.8 MB. Every vowel, consonant and ஃ, 41 compound letters, 102 of 108 picture words, all ten number words. Each file is credited in `assets/audio/tamil/CREDITS.md`.
- `tests/tamil-audio.test.cjs` checks the letter tables (12 + 18 + 216) and letter splitting. It also checks that every vowel and consonant is recorded, so every compound letter can be blended, and that every MP3 exists, is small, has an open licence and is credited.
- `tests/tamil-games-browser.cjs` runs on a simulated device with **no Tamil speech voice**. It logs which recordings play, finishes a full round of Letter Bubbles (10/10) and Word Puzzle, and matches every Tamil Memory pair. It checks that tracing rejects an empty canvas and a scribble but accepts a careful trace. It confirms that Tamil Alphabets' listen mode plays recordings and that unrecorded compound letters are blended from their parts. It checks that 11 quiz modes play Tamil audio when a question appears and again after an answer, with no overflow at 390px, no runtime errors and no external requests.
- The existing suites were updated for 44 games and the new Tamil tab, and all pass: `npm test` (16), `npm run test:e2e`, `npm run test:tamil` and `npm run build`.
- Practical limit: the processed recordings were checked by automated duration and loudness analysis and trimmed by speech detection. No one has listened to all 188 files yet. Please give a few letters a listen on a real phone.

## Visual multiplication & division · October 16, 2026

- Seven new activities: Picture Multiplication, Picture Division, Share It Fairly, Market Day, Fact Family Triangles, Array Garden and Multiples Hunt. The library now has 51 games.
- `tests/math-games-browser.cjs` plays every activity at 390px. For each groups or arrays question at all three levels, the number of items drawn equals the correct answer. For sharing, grouping and leftover questions, the solved picture (items per plate, loops, leftover items) matches the answer. Every question has exactly one correct choice and no duplicate choices. Market Day answers are recomputed from the story's numbers: round up for boats, round down for what you can afford, change, sharing, and "times as many".
- The test also checks the interactive games. Share It Fairly catches an unfair share and plays 6 stories to completion. Array Garden catches a turned-around array and has every factor pair found. Multiples Hunt explains a wrong tap and completes 3 tables. Progress is saved, with no errors and no external requests.
- Five repeated runs pass, since questions are random. One run found duplicate options in "number sentence" mode when rows = columns, which is now fixed.

## Version 3 — picture everything · October 23, 2026

- The library has 72 games: 21 new hand-built games and 22 existing games made picture-first. The home page, the four learning paths and the grown-up report are rendered from `assets/js/catalogue.js`.
- `tests/catalogue.test.cjs` checks that every game folder has exactly one catalogue entry, that skills and learning-path steps are real, and that the title count and `<noscript>` list in `index.html` match. `tests/visuals.test.cjs` checks the pure maths of the pictures: clock hand angles, coin totals and fewest-coin change, fraction wording and base-10 splits. `tests/progress.test.cjs` also covers the last-five scores, per-mode stars, old records without the new fields and the new badges.
- `tests/picture-games-browser.cjs` (`npm run test:pictures`) has 23 sections and plays every new game at every level. Highlights:
  - Set the Clock is driven with real pointer events as well as the buttons, and the clock hands are compared with the time asked.
  - Pizza Fractions, Coin Shop, Block Builder, Measure Lab and Picture Graphs compare the picture with the number asked for (shaded slices, coin total, block counts, marker position, scale tilt, icons drawn).
  - The sorting, ordering and map games are driven by tap and by keyboard; wrong placements keep the question open.
  - Another section plays the upgraded quiz games and checks each picture against the correct answer (fractions, clocks and timelines, coin trays, rulers, jugs, thermometers, scales, place-value blocks, rounding lines, ten-frames, dice, calendar grids, planet order).
  - The home section plays rounds, then checks that path steps tick, "Next up" moves, and the grown-up report lists "Needs practice" and "Ready for next".
  - A layout section loads every new and upgraded game at 320px. `VIEW_WIDTH=320` plays all sections at that width.
- Random suites were repeated: the picture-vs-answer section four times, the layout check six times, `npm run test:math` three times. Running them found real bugs, now fixed: an infinite loop in a question generator at level 1, a placed picture that swallowed taps meant for its house, long Tamil words and a four-column chart overflowing at 320px, and a primary button that turned white-on-white on hover.
- Seventeen new Tamil recordings (all 7 days, 9 of 12 months, 8 of 10 colours; 205 files, 2.0 MB) were fetched, trimmed and credited by `scripts/fetch-tamil-audio.cjs`. `tests/tamil-audio.test.cjs` checks that every MP3 exists, is small, has an open licence and is credited.

### Practical limits

- The new Tamil sentences (the four-picture stories and the picture-sentence questions) were written for this milestone and have not been read by a native Tamil speaker. Please have one checked before children use them. The new recordings were checked by file analysis only; nobody has listened to all 17.
- Pictures are emoji and inline SVG, so how they look depends on the bundled emoji font. A few newer emoji (for example the polar bear) may show as two symbols. The map and the child's body are simple sketches, not to scale.
- No child has used these games yet. Level boundaries (for example "every minute" on the clock) are starting points, and the money games use US coins and notes.
- Tests ran in Linux Chromium only, not on physical phones, Safari or Firefox. Touch dragging for the sorting games is covered by the tap alternative in the tests, not by a real finger.

## Offline / iPad · October 23, 2026

- Added a service worker (`sw.js`, generated by `scripts/build-sw.cjs`), a web app manifest and Home Screen icons. Every page registers the worker through `assets/js/progress.js`.
- `tests/offline-browser.cjs` visits once online, waits until all 393 files are saved, then switches the browser offline. Offline, it loads the home page, sees the "Saved on this device" status, and plays seven games: two quiz games with `?level=` settings, two hand-built games, two Tamil games and Memory Garden. It also fetches Tamil recordings and both fonts. All pass with no page errors.
- The same test passed with the build copied into a `games/` sub-folder of another site (`BASE_URL=http://localhost:8123/games`). The worker's scope was `/games/`, so the rest of the website is not affected.
- `tests/catalogue.test.cjs` fails if `sw.js` misses a file or lists one that no longer exists.
- Practical limit: tested in Chromium only. iPad Safari supports service workers and Add to Home Screen, but it was not tried on a real iPad. Safari may clear saved data for sites not opened for several weeks, unless the site was added to the Home Screen.

## Version 4 · November 5, 2026

The library has 80 games. This release adds Review My Mistakes, bigger question banks, 8 games, harder number levels, and a home page and game frame a child can use alone.

### Layout, measured on a 390×844 phone

| | Version 3 | Version 4 |
| --- | --- | --- |
| Distance to the first way into a game | 1,876px | 130px |
| Words to read on the home view | 291 before the first game | 36 |
| Places to tap on the home view | 40 before the first game | 14, not counting speakers |
| Home page height | 23,514px, about 28 screens | 844px, one screen |
| Taps from a first visit to playing | scrolling, then 2 | 3 |
| Words on a game's start screen | 62 on average | 20 typical, 29 at most |
| Play button below the screen | 8 games | none |
| Question starts at | y≈358 | y≈198 |
| Next below the screen after an answer | 16 of 40 quiz games (15 on a landscape iPad) | none |

### Automated checks

- `npm test` (74 tests): progress, the review schedule at each step, game ids inside the website's folder, every hand-written bank (size against round length, no repeats, one right answer, every picture in the bundled font), the catalogue, and the new game-choosing helpers. Every game can be reached from an age and a subject.
- `npm run test:ux`, at 320×568, 390×844, 810×1080, 1080×810 and 1366×900:
  - A first visit reaches a game in three taps. Play next is always on the first screen, and all six tiles are too, except at 320×568.
  - All 79 start screens: Play is on screen with no scrolling, with at most 30 words.
  - Controls are at least 44×44px on the home page, start screens and play screens, with the exceptions listed below.
  - After an answer, Next and feedback are on screen and uncovered, in all 69 games with a shared engine.
  - All answers fit on the screen from 390×844 up, with the exception listed below. 320×568 was not held to this.
  - Back, Home, Easier and Harder work. The age survives a reload, and everything works with storage blocked or from the keyboard alone. Each speaker says the right words (checked with a recording stub). Key text passes 4.5:1 contrast.
- `npm run test:review` plays all 69 covered games, plus 35 other settings: miss a question, reopen with `?review=1`, and check the same prompt, picture and answer come back and move along the schedule. Also run at 320px.
- `npm run test:levels` works every answer out again from the screen. `npm run test:newgames` plays the eight new games with real taps at 320 and 390px, including a real wrong tap carried into a review round, and a whole 15-pair Memory Garden.
- All earlier suites were updated for the new navigation, keeping what each one checks, and pass: `test:e2e`, `test:math`, `test:pictures` (also at 320px), `test:tamil`, `test:tamil-games`, `test:offline`, `npm run build`. The offline test now plays a review round with no network. 429 files are saved for offline use.
- The built site was also served from inside a `games/` folder, as on the website: the offline test, a review run and the navigation checks pass there.

### Bugs found and fixed

- **Live on the website:** every game reported its id as `games`, because the path there is `/games/games/counting/`. All stars and scores were lumped into one entry. Records already saved under that entry stay there.
- **Next below the screen** after an answer, in the numbers above.
- Picture Pro, Path Finder and All-Rounder could never be earned, because game pages did not load the catalogue. The 21 hand-built games could never earn the streak badges.
- Spelling Bee could offer real words as misspellings, including a rude word generated from "sock".
- Word Families cards for "pan" and "pet" had no picture. Animal Homes said "a emperor penguin".
- Block Builder could only remove a one cube by tapping a 12px target. It now has − buttons.
- Card descriptions showed literal `&ndash;` text.

### Exceptions the checks allow

- Array Garden and Multiples Hunt use ten-by-ten boards, which cannot give each square 44px on a phone. Their squares are as big as the screen allows (about 23px at 320px wide). They reach 44px on tablets.
- Block Builder's small blocks can still be tapped, but its − buttons do the same job at full size.
- கதை நேரம் shows a four-picture story, so it scrolls before its question.
- Memory Garden, the Tamil typing games and the Tamil Letter Chart have the new top bar and start screen, but keep their own play and end screens.

### Practical limits

- **No child has used this.** The layout checks measure size, position and wording, not whether a 4-year-old understands it. Please watch one try it.
- Tested in Linux Chromium only, not on a real iPad, phone, Safari or Firefox, and not with a real finger. Lettering uses the device's own rounded font where there is one, so an iPad will look different from the screenshots checked here.
- **The new Tamil has not been read by a native speaker.** `docs/TAMIL-REVIEW-v4.md` lists every new line, and the older lines that were never checked. It also asks one question about the word order game, which accepts only the written order although Tamil word order is flexible.
- New English and science questions are checked by tests for structure, and for accuracy only by Claude's own reading.
- Speakers on the home page use the device's voice, in English, so Tamil-named games speak their English description.
- Age bands are suggestions, and the choice is a shared setting on the device, not a child profile.
