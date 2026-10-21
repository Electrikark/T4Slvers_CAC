# OCR preparation

Prepared on 2026-10-19. This is setup preparation; screenshot reading is not built.

The supplied gate still applies: build only after the video is recorded and a
physical-phone check shows copying is hard. Neither result has been provided.
Do not fill the evidence fields with assumed results.

## Verified starting state

- Folder: `/Users/namanraichura/Desktop/T4S project/Tech4Silvers-codex-worktree`
- Origin: `https://github.com/Electrikark/T4Slvers_CAC.git`
- Branch: `codex-worktree`
- Revision: `305cbdf3e7b66fc6e143fc6b29423a6fee8d0518`
- Tree was clean before these preparation files were added.
- After fetching branches and tags, no `v1.0-cac` tag exists. No `RELEASE.md`
  exists here or at the fetched `origin/main` or `origin/fix-reporting-scope` tip.
- The earlier page check used desktop mobile emulation, not a physical phone.
  See `../decisions/phone-check-page-repair.md`.
- No feature branch, dependency install, OCR UI, push or deployment was performed.
- Preparation validation passed: JavaScript syntax and 12 isolated readiness
  cases, including missing evidence, wrong origin, dirty tree, tag mismatch and
  tracked-release fallback. Each audit preserved the temporary repo's files and
  revision. The app suite was not rerun; app and engine files were not edited.

## Readiness check

Run from this project:

```sh
node scripts/ocr-preflight.cjs
```

Exit 1 means a prerequisite is pending; exit 0 only means recorded prerequisites
passed. The tool reads files and Git state. It never installs, switches branches,
creates a tag, changes files, pushes, or runs the message engine. Use `--json`
for structured output or `--root PATH` to inspect another checkout.

When the two real-world checks are done, record their results in
`docs/ocr/readiness.json`: set each relevant boolean to `true` and write a short
evidence note with the date, video location, and phone/browser observation.
Do not include private message text. The tool checks that notes exist; it cannot
verify that the video or phone task happened.

Freeze the intended submission build separately. Set `freeze.sourceRevision`
to its full 40-character Git SHA and explain the freeze in `freeze.evidence`.
The SHA must resolve locally and match `v1.0-cac`. If that tag does not exist,
the tracked `RELEASE.md` must contain this line, using the actual full SHA:

```text
Source revision: <full SHA>
```

The prep files themselves make this tree dirty until saved through the usual
review flow. Preserve them; do not discard unrelated work to make the check pass.

## Isolated setup after the gate passes

1. Recheck the repo, clean state, freeze and physical-phone evidence. Identify
   which revision and URL the submission actually serves. Do not infer that a
   local release branch is the deployed build.
2. Create a separate worktree on branch `ocr-preview` at the verified frozen
   revision. Check its branch and exact HEAD before adding files. Reuse an
   existing preview branch only after inspecting its history. Do not switch or
   reset the current checkout, and do not replace an existing folder.
3. Carry these prep files into that worktree only after verifying the start.
   Push the preview branch as instructed once it exists. A push alone does not
   create a separate GitHub Pages preview. Verify the publishing source before
   changing any deployment settings or using a public preview URL.
4. Add `node_modules/` to `.gitignore` before installing packages. This repo
   currently lacks that rule. Keep vendor assets and the lockfile tracked.
5. On 2026-10-19, npm metadata reported `tesseract.js@7.0.0`, requiring
   `tesseract.js-core@^7.0.0`, and `@tesseract.js-data/eng@1.0.0`.
   The exact core `7.0.0` exists, although the core package's default version
   query reported `6.1.2`. Do not independently install that older core.
   Recheck before choosing versions, then pin the direct packages and retain
   the lockfile. No version has been installed or validated here.
6. Build the copy script against the installed package layout. Include license
   notices and an asset/hash manifest. Use local library, worker, core-directory
   and language paths relative to `document.baseURI`. The upstream API lists
   four core `.wasm.js` variants; inspect the chosen release for any separate
   required assets rather than treating a file count as sufficient proof.
7. Start with a local HTTP preview under `/T4Slvers_CAC/`. Test cold and warm
   loads and intercept worker requests as well as page requests. Verify every
   OCR asset is same-origin. Test airplane mode separately: local hosting does
   not make the whole app available offline, and cached language data alone
   does not cache the page, library and worker.

Upstream sources checked during preparation:
[API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md),
[local installation](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md),
[image decoding](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap).

## Changes needed before using the pasted skeleton

| Issue | Required change |
| --- | --- |
| `readScreenshot` calls `joinWrappedLines`, but a re-export does not create a local binding | Import it locally before calling it. |
| The real textarea is `message`, not `message-input` | Fill the existing box, then dispatch its `input` event so the counter and existing input handling update. |
| `js/app.js` is a classic script | Add a separate module controller; do not paste a top-level import into the current classic script. |
| A valid URL at the end of a visual line absorbs the next word | Do not automatically glue every line after a URL-like token. Keep uncertain contact breaks visible for review. |
| Native message line breaks carry meaning | Preserve raw OCR text and make any proposed joining reversible; do not silently treat every line break as a visual wrap. |
| Full image decoding happens before shrinking | Handle decode failures and large-image limits; test actual phone formats. `createImageBitmap` is not a universal iPhone-format converter. |
| A read can overwrite text typed while OCR is running | Define busy-state behavior and preserve existing input on failure or stale completion. |
| UI state outlives the image read | Clear image URLs, preview state and warnings on reset; invalidate late results and provide timeout/retry recovery. |
| A confidence value of 60 has no local validation | Label it provisional. High confidence does not establish that all words were captured. |
| An import grep checks only a narrow spelling | Combine a dependency-boundary check with behavioral tests. A helper with no engine import can still alter a verdict by altering text. |

Keep explicit human review before Check, the existing channel choice, text length
limit and error recovery. Never auto-submit recognized text. Do not change the
verdict gate to hide recognition defects. Omitted negation and incomplete contacts
need explicit release decisions; a warning badge alone is not proof of safety.

## Line splitting and fixture audit

`js/engine/risk.js` uses `/[.!?;\n]|\b(?:but|however|instead)\b/gi` to cut clauses,
with exceptions for decimal points and newlines after unfinished asking phrases.
A single newline can therefore create a boundary; blank lines also contain that
boundary, subject to the asking-phrase exception. `js/engine/sender.js` also uses
line starts and the last non-empty line to identify labels and sign-offs.
This means joining can alter both demand scope and sender identity.

The checked-in fixture has 810 rows: 490 have no CR/LF and 320 already have line
breaks. Of the 490, 448 contain repeated spaces. They are synthetic regression
setups, not 810 independent real messages.

The exact pasted joining algorithm was replayed in isolation, without loading
the engine. For each eligible row, every Nth ASCII space was replaced with `\n`:

| N | Exact original text restored | Different text |
| --- | --- | --- |
| 4 | 70 / 490 | 420 / 490 |
| 5 | 237 / 490 | 253 / 490 |
| 6 | 350 / 490 | 140 / 490 |

This is a text-reconstruction diagnostic, not a verdict comparison or OCR test.
Stripping spaces around newlines loses them; contact gluing also changes text. Do not
change the fixtures or weaken exact assertions to claim the proposed test passed.
If a later test uses canonical spacing, report that as a separate property and
retain the original source text and exact failures.

Two concrete results of the pasted function:

```text
Input:  Visit https://chase.com\nfor help.
Output: Visit https://chase.comfor help.

Input:  Use https://chase-secure.\ncom/verify
Output: Use https://chase-secure.com/verify
```

The second example also disproves the stated blanket dot-gap limitation: the
URL-prefix rule glues that case. A bare `chase.\ncom` is left with a space.
Neither result establishes when gluing is safe.

## Validation after implementation

- Keep `npm test` passing; add explicit expected outputs for ordinary wraps,
  repeated spaces, CRLF, blank lines, labels, sign-offs, negation and contacts.
- Replay eligible wrapped rows at 4, 5 and 6 words with each row's record state,
  frozen date and channel. Compare exact text first, then verdict and findings
  under the same setup. Report skips and failures. Keep multiline cases separate.
- Use only checked-in regression fixtures for this replay. Do not read or run a
  held-out message split to tune OCR or line joining.
- Verify no engine call occurs on image selection or recognition completion.
  Exercise retry, corrupt files, empty output, stale reads, reset and long text.
- Use the 20-screenshot study to measure text/contact errors and missing words,
  human correction, and cold/warm timings. Include dark mode and omitted-negation
  cases. Keep real screenshots private and outside tracked files.
- Check layout, keyboard/screen-reader use, physical iPhone/Safari and Android,
  the Pages subpath and all network requests. Measure real behavior before making
  privacy, usability or offline claims.
- Steps 5–8 were referenced but not supplied in full. Their exact prior wording
  has not been recovered or treated as completed. Do not label the preview ready
  for submission until the risk, screenshot, phone and labeling checks are met.
