# OCR preview validation

Executed on 2026-10-21 in the isolated `ocr-preview` worktree on macOS.
Baseline: `075860496e91fa7c84138f26d8cfede47d685ecc`.

## Passed locally

- `npm test`: existing 1,183 shared checks, 36 source-gate parity checks,
  two source boundaries, 15 evaluation-harness checks and the app-element
  contract covering 48 IDs. All prior expectations remain in place.
- Five OCR source/provenance groups. The regression group checks all 810 authored
  rows: plain-text verdicts match their expectations; screenshot provenance adds
  uncertainty without changing findings, and blocks otherwise possible matches.
- `npm run check:ocr-assets`: 21 copied assets plus their manifest verified
  against installed packages and local notice text; total asset size 45.6 MiB.
- `npm audit --omit=optional`: no reported vulnerabilities in this installed tree
  at the time of the check. This is a package-advisory result, not a security proof.
- `git diff --check`: no whitespace errors.

`src/assessment.js` and its generated browser copy are unchanged from the baseline.
The engine adapter adds screenshot provenance and uncertainty; it does not replace
the verdict rules. The source checkout's saved snapshot hashes were checked
separately after implementation to detect accidental edits.

## Browser checks: 11 / 11

Chromium 156 through Playwright 1.64.1, viewport 390 by 844:

1. Pasted text takes the existing Check path and loads no OCR assets.
2. Real PNG OCR uses only same-origin assets on `/T4Slvers_CAC/`, never auto-checks,
   requires review, invalidates review after edits, updates the character count,
   displays the result note and keeps heading focus. A second read reuses the
   worker with the browser offline and causes no additional asset requests.
3. Real JPEG OCR with a fictional approved contact yields Insufficient Evidence.
4. A dark synthetic screenshot reads through the image-element decode fallback.
5. A deliberately failed core download recovers on a real OCR retry.
6. Exact raw line breaks are retained; the textarea applies native CRLF-to-LF
   handling. A controlled low-confidence result warns. Failed, blank and long
   results preserve prior text. Programmatic submit is blocked before review.
7. Cancel and reset discard controlled stale reads and clear preview state.
8. A deliberately failed library download recovers without reloading the page.
9. A controlled stalled worker times out, terminates and permits retry.
10. Cancel terminates a real worker while language loading is still pending.
11. Unsupported images and oversized dimensions fail before library loading;
    root-path controls work and private server paths return 404.

The suite contains actual OCR runs and separate controlled fault cases. The latter
isolate UI and lifecycle behavior; they are not OCR-quality measurements. All
images are generated synthetic examples. The approved reference exists only in
its browser test. No source reference record was approved or edited.

The mobile screenshot was inspected visually. The image sits next to the message
entry area in document flow, with an option to open it larger. No horizontal
page overflow was detected at the tested width.

## Not established

No 20-screenshot study, physical-phone/Safari/Android test, screen-reader test,
real-message accuracy estimate, full offline-startup test, or public Pages-preview
check was performed. No held-out message corpus was read or scored. GitHub CI
has been configured but its remote run is separate from these local results.

Manual next check: open the local preview, use a PNG/JPEG screenshot you are
comfortable inspecting locally, compare every word, fix errors, tick the review
box and choose Check. For real usability evidence, repeat this with the intended
users on their own phones and record observed correction and task-completion
behavior.
