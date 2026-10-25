# Discovery tool: validation report

Date 2026-10-24 · branch `discovery-tool` from `origin/main` `17612d4` · darwin-arm64 · Node 26.11.1 ·
Playwright 1.64.1 / Chromium 156 · Transformers.js 4.3.0 · ONNX Runtime Web 1.31.0-dev.

**Status: functional and privacy checks pass. Usefulness unvalidated. Human review: none recorded.
ML benefit: unproven.** No real or public development messages exist in this checkout, so every run
below is on fictional or constructed material and has no real-data findings.

## Checks run

| Check | Result |
| --- | --- |
| `npm test` (existing chain, including `build:gate --check`, eval tests, adversarial gate and known failures) | exit 0; 469 escapes and 12 false alarms, all known and unchanged |
| `npm run robustness` | gate passed |
| `node discovery/tests/discovery-node.cjs` | 15/15 |
| `node discovery/tests/review-browser.cjs` | 9/9 |
| `git diff origin/main -- js src data eval css scripts tests '*.html'` | empty: no app, engine, evaluator or test file changed |
| Manual pass in the app's browser pane | report loaded through the file input; hostile text inert; decision, freeze and grouped view work; no console errors; no requests beyond the page's own files |

## Acceptance checks

| Requirement | Evidence |
| --- | --- |
| Held-out sentinel rows never reach the engine, embedding adapter, cache, UI or exports | Node test 1 spies on the engine and embedder and scans every output and cache file; the fixture's test rows, the dev row whose family spans splits, the dev row duplicating a test text and the empty-split row are counted and dropped at intake. The browser test loads only the resulting findings. |
| Only `--split dev`; ineligible sources refused | Node test 2 (`test`, `all`, missing, `dev,test`; legacy `messages.csv`; help-search data; CLI exit 2) |
| Dev exposure recorded through the existing mechanism | Node test 3: an `eval/data` dev CSV writes dev IDs and families (not test ones) to `exposure-ledger.json` via `recordDevExposure` |
| Exact quotes survive Unicode, CRLF, multiple requests and window boundaries | Node test 4 re-slices every candidate, context and window; CRLF lines and an emoji line reconstruct exactly; no surrogate is split |
| One covered request still exposes the second | Node test 5 (unit and end to end: the fixture's passcode sentence stays a candidate next to the T1-GIFT span) |
| Negated, reported and legitimate requests stay controls | Node test 6; no model-made label field exists; nearest-neighbor lists contain only legit examples and are labeled "not labels" |
| Long input windowed or flagged, nothing lost | Node test 7: overlapping windows with exact offsets; a 5,000-character unbroken word is cut at code points; over 64 windows → `too_long`; text past the engine's 20,000 characters still yields candidates |
| Missing model or inference error leaves the ungrouped queue usable | Node test 8 (missing model folder, injected failure mid-run, `--no-ml`) |
| Offline after local assets; blocked requests don't break it | Node test 15: the embedding page fetches Hugging Face and a path-traversal URL; both are blocked and recorded; embedding still works. Real runs record `blockedRequests: []`. |
| Repeatable grouping in the recorded runtime | Node test 9 (byte-identical findings; corrupted cache entry rejected and recomputed); real model: byte-identical findings from a cold and a warm cache |
| Hostile text inert; decisions survive export/reload; reset is clean | Browser test (markup, `<script>`, `javascript:` link and U+202E rendered as text; no `img`/`script`/`a`/handler elements; malformed, wrong-schema, tampered and >64 MB files refused; export → reload → reset → import) |
| Existing verdict behavior unchanged | `npm test` and the known-failures gate pass; no engine file changed; Node test 14 checks engine digests before and after a run |
| Every reported discovery traceable to a source and a review decision | `discovery:check --review` validates the export and writes `review-summary.md` listing candidate, message, family, source, outcome, evidence and when it was decided (Node test 12) |

## Runs

| Run | Messages (real / synthetic) | Families | Candidates | Groups | Singletons | Not grouped |
| --- | --- | --- | --- | --- | --- | --- |
| Fictional fixture (`discovery/fixtures/fictional-dev.csv`) | 0 / 15 | 0 / 14 | 81 | 4 | 32 | 13 (context only) |
| Constructed dev material (`adversarial/seeds.cjs` + `known-failures.json`) | 0 / 499 | 0 / 18 | 1,902 | 60 | 32 | 378 (context only) |

What the groups contained (read by the developer, not a human review decision):

- **Fixture:** 30 near-identical newsletter lines from one message (a template); two greetings
  grouped by name ("Grandpa it is Sam"); two pairs of a sentence and its own clause. The three
  cash-by-courier requests stayed singletons at 0.35. The nearest legitimate example to the first
  courier request is the *reported* warning (similarity 0.63), ahead of the genuine courier notice
  (0.37): similarity is not evidence of fraud.
- **Constructed:** 40 groups hold one seed family each (rewrites of one message). All 20 groups
  spanning several families are boilerplate the rewrite generator inserts ("Fraud warning.",
  "Hello.", "Act today.", "Ref 88421", "Regards, Customer Care."), not request concepts. 43 spans in
  Suspicious messages have no overlapping Tier 1 span, and 471 of 481 fraud-labeled messages are
  not Suspicious (these are known escapes by construction).

So on this material the grouping mostly reflects templates, names and family structure. The
ungrouped queue is the part that is useful today. That is not evidence about real messages either
way.

## Not done or not shown

- No human review was performed or recorded; no review decision, timing or benefit is claimed.
- No real or public development data was available, so no real-data findings exist.
- No comparison between the ungrouped queue and the grouped view has been run.
- Equality across runtimes (other OS, browser or ONNX Runtime builds) is not assumed or tested.
- The machine's network was not disabled; offline behavior is shown by aborting every non-vendored
  request inside the embedding browser.
- `package.json` is one of the files fingerprinted by a future held-out test release
  (`eval/test-access.cjs` `RELEASE_FILES`); adding the discovery scripts must happen before such a
  freeze, or the freeze must be redone.
- Pre-existing, not changed here: `tests/eval-tests.cjs` runs `eval/run.cjs --split dev` on
  temporary inputs, which writes test IDs (`d`, `g1`, `u1`, `x`) into the real
  `eval/data/exposure-ledger.json` of whatever checkout runs `npm test`.
