# Discovery: grouping development requests for human review

An **experimental, local developer tool**. It helps Naman find wording the deterministic rules miss
and risk concepts they lack, by preparing development messages for review and (optionally) grouping
similar request spans with local sentence embeddings. Its usefulness is **unvalidated**: no human
review has been recorded yet.

It is outside the senior-facing app and outside the verdict path. It never labels a scam, approves a
reference, edits a rule or changes a verdict. A group is a candidate for investigation, never proof
that a rule is needed. Why and how: [DECISION.md](DECISION.md). File formats: [SCHEMA.md](SCHEMA.md).

## Setup

```sh
npm ci            # Playwright and its Chromium run the vendored model locally
```

The model is `vendor/minilm` (already in the repository). Nothing is downloaded at run time.

## Run

```sh
npm run discovery -- --input discovery/fixtures/fictional-dev.csv --split dev --today 2026-10-22 --out discovery/out/demo
npm run discovery:check -- --report discovery/out/demo
```

| Option | Meaning |
| --- | --- |
| `--input` | An eligible source (repeatable): dev rows of `eval/data/*.csv` (dev or supplied format), `adversarial/seeds.cjs`, `adversarial/known-failures.json`, or `discovery/fixtures/*.csv`. Anything else is refused with the reason. |
| `--split dev` | Required. Any other value is refused; there is no override. |
| `--today` | Required reference date for the engine (`YYYY-MM-DD`). |
| `--out` | Report folder. Must be outside the repository or git-ignored (`discovery/out/` is). |
| `--cutoff` | Cosine distance cutoff for grouping (default 0.35, chosen in DECISION.md). |
| `--token-limit` | Embedding window size in tokens (default 256). |
| `--cache` | Embedding cache folder (default `discovery/.cache/embeddings`, git-ignored). |
| `--no-ml` | Skip embeddings; write the ungrouped queue only. |

Exit codes: `0` report written (the ML stage may still be `unavailable`; the report says so and the
ungrouped queue is complete), `1` the report failed its own validation, `2` refused or failed.

The constructed dev material in the repository can be run the same way:

```sh
npm run discovery -- --input adversarial/seeds.cjs --input adversarial/known-failures.json --split dev --today 2026-10-22 --out discovery/out/constructed
```

## Review

Open `discovery/review/index.html` in a browser (straight from disk, or through any local static
server) and use **Load findings.json**. The page makes no network requests and shows message text as
text only.

1. **Ungrouped queue** (the baseline): by default, spans in fraud-labeled messages that no Tier 1
   span overlaps. Other filters include spans no Tier 1 covers inside messages already Suspicious.
2. **Freeze ungrouped notes** before opening the grouped view if you want an exploratory comparison.
3. **Grouped view**: groups with provisional names, representatives, family counts (real and
   synthetic apart), stability at nearby cutoffs, singletons, and items that were not grouped.
4. For any candidate: the original message with the span highlighted, the replayed engine findings,
   similar legitimate examples, a span editor (offsets or text selection; adjust, split, reject,
   confirm, or add a new span), one of five outcomes, evidence, next action, and issue-draft fields.
5. **Export review** (JSON), **Export issue drafts** and **Export summary** (Markdown). Decisions are
   also kept in this browser per run; **Reset review** clears them.

Then validate the export and write the summary next to the report:

```sh
npm run discovery:check -- --report discovery/out/demo --review ~/Downloads/review-<runId>.json
```

Nothing is filed, published or changed in the rules. A proposed rule change is a separate change
with its own controls, regression checks and evaluation.

## Tests

```sh
npm run discovery:test
```

`discovery/tests/discovery-node.cjs` covers the data boundary, exact spans, multi-request coverage,
long input, the ML-unavailable fallback, cache keys, repeatability, reachability, `discovery:check`,
review validation and production independence, plus a real offline model check in Chromium (skip it
with `--no-browser`). `discovery/tests/review-browser.cjs` drives the review page in Chromium.

## Privacy

Reports, review exports and the embedding cache contain message text or vectors derived from it.
They stay local and are git-ignored (`discovery/out/`, `discovery/.cache/`, `review-*.json`).
Vectors are not anonymous. Only code, documentation and the fictional fixtures are tracked.
GitHub Pages publishes the repository, so this folder's code and fixtures are publicly reachable;
the review page holds no data until someone loads a file into their own browser.

## Limits

- It can expose only concepts present in its input.
- Groups can reflect names, writing style or templates instead of request meaning.
- No Tier 1 hit does not by itself establish a defect.
- Low group yield does not prove an in-path detector has no value.
- Repeated variants of one family are not independent discoveries.
- No real or public development messages exist in this checkout yet, so every run so far is a
  demonstration on fictional or constructed material.
