# Screenshot OCR preview

Implemented on 2026-10-21 in the isolated `ocr-preview` branch.

The user waived the earlier video, physical-phone and frozen-release gates, then
authorized dependency downloads and implementation. The old evidence booleans in
`readiness.json` remain false; waiver is recorded separately rather than claiming
those tasks happened.

## Where the work lives

- Preview folder: the repository root of the `ocr-preview` checkout
- Branch: `ocr-preview`
- Original Git base: `305cbdf3e7b66fc6e143fc6b29423a6fee8d0518`
- Preview baseline: `075860496e91fa7c84138f26d8cfede47d685ecc`

The preview baseline preserves the existing unsaved safety repairs, page-copy
edits, tests and OCR prep files. The source checkout was left intact. This is a
development snapshot, not a frozen submission build or a claim about the live site.

## Run the preview

In the preview folder:

```sh
npm ci --ignore-scripts
npm run check:ocr-assets
npm run preview:ocr
```

Open [the local preview](http://127.0.0.1:8381/T4Slvers_CAC/).
The server binds only to this Mac and excludes Git internals, installed packages,
evaluation data and other private paths. It supports both the project subpath
and the site root. Opening `index.html` through `file://` is not supported.

Choose Text, Email or Not sure. Select a PNG or JPEG screenshot. The text appears
in the existing message box with an image for comparison. Fix missing words and
broken contacts, tick the review box, then choose Check. Editing text clears the
review tick. Selection and recognition never run the message engine by themselves.

Use “Clear screenshot and paste instead” to clear image provenance and start with
fresh pasted text. Reset clears the preview, raw recognized text and image URL.
Cancel preserves the previous message. Failed, blank and oversized reads also
preserve the previous message.

## Packages and assets

| Package | Pinned or resolved version | Purpose |
| --- | --- | --- |
| tesseract.js | 7.0.0 | Browser OCR API and worker |
| tesseract.js-core | 7.0.0, locked transitively | WebAssembly engine |
| @tesseract.js-data/eng | 1.0.0 | English integer model |
| @playwright/test | 1.64.1 | Browser validation only |

`package-lock.json` freezes the resolved dependency tree. `node_modules/` and
browser-test output are ignored. Runtime assets are tracked in `vendor/tesseract/`
so the static site needs no package install to serve OCR.

Run `npm run vendor:ocr` after a deliberate dependency change. The copier includes
all six core variants found in version 7, their separate WebAssembly binaries,
the English data, package metadata and license notices. The asset manifest records
versions, sizes and SHA-256 hashes. `npm run check:ocr-assets` compares it with the
installed packages and rejects missing, modified or unexpected files.

The older four-core-file count is not valid for this version. Paths derive from
`document.baseURI` and use local library, worker, core and language locations.
The language cache key includes its version. A future model update must change
that key or deliberately clear old cached data.

## Text and verdict safeguards

No automatic line joining, contact repair, autocorrection or filtering is applied.
The raw OCR string is retained in the read-only source view until reset; the
textarea exposes native CRLF-to-LF behavior. Existing line boundaries can affect
demand scope and sender attribution, so uncertain wraps need human correction.

A screenshot-derived message retains `inputSource: screenshot`, including after
edits. An unresolved OCR check reaches the existing assessment gate and prevents
Details Match, even with a fictional approved contact. It cannot create Suspicious
on its own. Established requests in the reviewed text still use the existing
Tier 1 rules. The canonical verdict rules in `src/assessment.js` are unchanged.

`js/ocr.js` and `js/ocr-ui.js` do not import message rules, the verdict gate, or
reference data. The normal form passes provenance to the existing engine adapter.
Result validation checks that provenance and visible uncertainty agree.

The confidence cutoff of 60 is provisional. It only adds a readability warning;
higher confidence does not establish completeness. Every image requires review,
and every image-derived contact remains unresolved regardless of confidence.

## Limits and remaining evidence

- English PNG/JPEG only, up to 12 MiB, 24 million source pixels and a longest side
  of 16,000 pixels. Dimensions are read from the file before browser decoding.
  Unsupported or corrupt formats lead to the copy-and-paste fallback.
- Recognition uses a canvas capped at 3,200 pixels on the longest side. Small
  letters in long images can still be lost. Crop to one complete message.
- Reading has a two-minute timeout, library loading a 30-second timeout and the
  image-element fallback a 15-second timeout. Cancel also stops initialization.
- The library loads only when a valid image is selected. A second read reuses its
  worker. Language data can be cached in IndexedDB; screenshots and recognized
  text are not intentionally persisted by this feature.
- Local assets do not provide full offline startup. No service worker or offline
  page cache was added. Offline behavior is limited to an already loaded tab with
  its worker ready; test any broader promise separately.
- Browser tests use synthetic images and fictional approved contacts. They are
  behavior checks, not real-message accuracy, a 20-screenshot study or a senior
  usability result. Physical-phone and screen-reader checks remain unperformed.
- A branch push does not create a distinct GitHub Pages deployment. The existing
  publishing source must stay unchanged unless a separate deployment is requested.

## Checks

```sh
npm test
npm run check:ocr-assets
npm run test:ocr-browser
node scripts/ocr-preflight.cjs
```

The first command includes the existing app/engine/evaluation checks, five OCR
boundary/provenance groups and a replay of all 810 authored regression rows.
Plain-text verdicts retain their checked-in expectations. The image-provenance
replay compares findings and verifies the conservative gate; it does not run OCR
on 810 screenshots. No held-out message corpus is read or scored.

The readiness tool now accepts the recorded waiver and checks the isolated branch,
its baseline ancestry, origin and saved tree. A passing readiness check establishes
setup state only. See [validation results](VALIDATION.md) for executed checks.

## Why the original joiner was dropped

The earlier audit found 490 single-line fixture rows and 320 rows with existing
line breaks. Applying the pasted joiner after replacing every fourth, fifth or
sixth ASCII space restored exact text in only 70/490, 237/490 and 350/490 cases.
Repeated-space loss and URL gluing both contributed. For example,
`Visit https://chase.com\nfor help.` became `Visit https://chase.comfor help.`.
These were text diagnostics, not verdict or OCR measurements. The preview avoids
that transform instead of weakening its failed exact-text assertions.

Implementation references:
[Tesseract API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md),
[local assets](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md),
[language data](https://github.com/naptha/tessdata), and the installed version 7
worker's `getCore.js`, which selects relaxed-SIMD as well as SIMD/portable cores.
