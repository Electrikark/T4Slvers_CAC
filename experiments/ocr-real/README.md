# Real-screenshot check

**Question.** When a senior uploads a real screenshot from their phone, does the app reach the same
result as if they had copied the message text?

The earlier measurement (`experiments/ocr-robustness`) used constructed screenshots: one clean
bubble, no status bar, no sender line, no "Text Message · Today 9:41 AM" header. The line-wrap fix
was also designed on those same 500 pictures, so its 5-of-500 result is a development number.
This check uses screenshots from real phones, which the fix never saw.

## What it measures

For each screenshot:

| Side | Text | Checked as |
| --- | --- | --- |
| Real message | what you type into `truth.csv` (the message only, as the sender wrote it) | pasted text |
| Screenshot | what the app's own OCR reads, **before** anyone corrects it | screenshot |

**Gate (fixed in `check.cjs` before any screenshot is read):**

- at least **20** screenshots;
- the same verdict and the same Tier 1 findings on at least **90%** (18 of 20);
- **0** screenshots where the screenshot gives a *safer* verdict than the real message
  (for example Suspicious → Insufficient Evidence).

A screenshot can never reach Details Match by design, so Details Match → Insufficient Evidence
is expected and is not counted against OCR.

It also reports: whether every link and phone number was read exactly, extra numbers picked up from
the screen (usually the sender line), and two diagnostics that separate OCR misreads from the effect
of screenshot mode itself.

## Step 1: Take the screenshots (about 1 hour)

Send messages **between your own phones** (yours and a volunteer's), so no real person's details
are in them. Write messages that look like real ones: copy the wording of scam warnings from the
FTC or your workshop slides, and include ordinary messages too.

Aim for this mix across 20+ screenshots:

- iPhone **and** Android
- light **and** dark mode
- 5+ with a web address, 5+ with a phone number
- at least 6 ordinary (legitimate) messages
- 1–2 long messages that wrap many lines
- 1 screenshot of an **email**
- 1 cropped tightly to the bubble; **all the others full-screen, with the sender line and header left
  in**, the way a senior would take them

Save them as PNG or JPEG (iPhone and Android screenshots already are). Not HEIC photos.

## Step 2: Put them in the data folder

```
experiments/ocr-real/data/            ← kept out of git (.gitignore)
  truth.csv
  images/
    s01.png
    s02.png
    ...
```

Copy `truth.template.csv` to `data/truth.csv` and fill one row per screenshot:

| Column | Required | What to write |
| --- | --- | --- |
| `id` | yes | `s01`, `s02`, … |
| `file` | yes | the image file name in `images/` |
| `channel` | yes | `text`, `email` or `unknown` |
| `text` | yes | **exactly** the message as sent: the words in the bubble, nothing from the phone's screen. Put it in double quotes; inside, write `"` as `""`. |
| `device` | no | `iphone` or `android` |
| `appearance` | no | `light` or `dark` |
| `header` | no | `yes` if the sender line and time header are in the picture |
| `notes` | no | anything else |

**Type `text` from the message itself, before you run the check,** not from the OCR output.
If you copy the OCR output, the test only compares OCR with itself.

## Step 3: Run it

```sh
npm ci                                      # once, for Playwright
node experiments/ocr-real/check.cjs --today 2026-10-23
```

If Playwright's own Chromium is missing, add `--chromium "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.

It prints the gate result and writes `out/report.md` (the full table, and the real and read text for
every screenshot that did not match). OCR results are cached in `out/ocr.json`, so fixing a typo in
`truth.csv` and rerunning is instant.

Exit code: `0` gate passed, `1` not passed (or fewer than 20), `2` a problem with `truth.csv`.

`node experiments/ocr-real/check.cjs --self-test` checks the comparison logic without any images.

## Step 4: Record it

Put the counts (not percentages) in `docs/ocr/readiness.json` and `docs/ocr/VALIDATION.md`, with the
date, for example: "19 of 20 real phone screenshots gave the same result as the typed message; 0 gave
a safer verdict." With 0 of 20 safer, the honest claim is that the safer rate is likely under 16%,
not that it never happens.

If the gate does not pass, do not change `GATE` or drop screenshots to make it pass. Look at the
failures in `out/report.md` and say what caused each one.

## Limits

- 20 screenshots of messages your team wrote and sent. This checks those screenshots, not real-world
  OCR accuracy.
- Raw OCR before correction. In the app, the person reviews and fixes the text first. This check
  does not measure whether people actually do.
