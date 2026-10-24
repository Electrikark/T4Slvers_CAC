# OCR robustness: do the rules survive screenshot text?

**Question.** When a message arrives as a screenshot, the app reads it with on-device OCR and the
person reviews the text before checking. Do the request rules still fire on that text?

**Answer, on the tested conditions.** Before this work, the rules lost the **Suspicious** verdict
on **180 of 500** screenshots (36%), even though OCR read almost every character correctly. The
cause was line wrapping, not misread letters. After the fix, **5 of 500** (1.0%) lose it, all on a
deliberately low-resolution JPEG.

## Method

- **Messages:** 100 unique texts: 77 from the engine's regression fixture
  (`tests/reporting-scope/fixture.json`: one plain row per context, family and demand form, plus all
  45 hand-written rows), the 7 app demos, and the 16-message synthetic challenge set in `ml/probe.py`.
- **Screenshots:** each message drawn as a phone-style text bubble (blue underlined links and
  numbers) in 5 conditions: `light` (17px, 3x), `small` (14px, 2x), `dark` (dark mode, 3x),
  `narrow` (300px wide, more wrapping, 3x), `jpeg` (17px, 1x, quality 55). 500 screenshots. The
  5 renderings of one message are **not** independent examples.
- **OCR:** every image goes through the app's own `readScreenshot` (`js/ocr.js`), with the same
  local Tesseract files and settings the page uses. Median read time 159 ms, 95th percentile 358 ms.
- **Fair baseline:** the exact visible text and the OCR text are **both** analyzed as
  `inputSource: "screenshot"`, with the same channel, store and date. Only OCR differences can
  change the result.
- **Measured:** Tier 1 rules lost or gained, Tier 2 warnings lost or gained, Suspicious lost or
  gained, any result becoming Details Match, and changes to links, phone numbers, amounts and codes.

## Results

| | Suspicious lost | Tier 1 rule lost | Tier 1 rule gained | Became Details Match |
| --- | --- | --- | --- | --- |
| Before the fix | 180/500 (36.0%) | 181/500 (36.2%) | 3/500 (0.6%) | 0/500 |
| After the fix | 5/500 (1.0%) | 5/500 (1.0%) | 0/500 | 0/500 |

After the fix, `light`, `small` and `dark` lose nothing; `narrow` and `jpeg` lose 0 and 5.
The full tables, every failure and every field change are in `out/report.md` (and the pre-fix
run in `out/report-before-fix.md`) after running the scripts.

## What was wrong, and the fix

OCR returns one line per row of the picture. The rules treat a line break as the end of a
sentence, so "We ask / you to pay with gift cards" became two pieces and neither was a demand.
Joining single line breaks restored **162 of the 180** lost verdicts. Most of the rest were web
addresses and phone numbers broken at a hyphen (`chase-secure-` / `login.net`, `1-` /
`888-555-0142`); two of the app's own demos lost Suspicious this way in a plain light-mode
screenshot.

`T.unwrapLayout` (in `js/engine/normalize.js`) now runs for screenshot text only:

- a single line break becomes a space; a blank line (paragraph break) stays;
- a web address or U.S. phone number broken right after a hyphen is joined exactly as written;
- nothing is corrected or guessed: a misread `hitps://` stays as read;
- a position map keeps every highlighted quote pointing at the exact visible text;
- pasted text is never changed, and screenshot text still cannot produce Details Match.

All 813 regression rows give the same verdict and the same rules for pasted and screenshot input;
only the length of some highlighted clauses changed.

## What remains

- **Low-resolution misreads** (all 5 remaining failures are `jpeg` at 1x): a misread scheme
  (`hitps://`, `hiips://`, `hitp:/`) hides the web address, and two word misreads (`wil`,
  `access.`) break a request. These are not repaired on purpose: a guessed correction would be
  presented as evidence.
- **Pasted text with line breaks** (for example, a copied email that wraps every line) still
  treats each break as a sentence end. Not changed here, because pasted line breaks can be the
  writer's own; it needs its own test.

## Limits

- Constructed screenshots of one message bubble: no sender line, status bar, keyboard, emoji,
  pictures or cropping. One font family drawn by Chromium.
- Most messages are regression cases, not a sample of real scam traffic.
- This supports a claim about these tested conditions only, not overall real-world OCR reliability.

## Run it

```sh
npm ci                                                   # Playwright and the OCR library
node experiments/ocr-robustness/render_ocr.cjs            # about 2 minutes; cached in out/ocr.json
node experiments/ocr-robustness/analyze.cjs               # writes out/report.md
```
If Playwright's own Chromium is not installed, pass `--chromium /path/to/chrome`.
