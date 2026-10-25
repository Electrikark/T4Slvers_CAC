# Decision: a local discovery tool for rule gaps (developer-only, experimental)

Status: **experimental developer tool; usefulness unvalidated.** No human review has been recorded.
Prepared 2026-10-24. Inspection started on `learn-guide` at `f633207`; the work is on branch
`discovery-tool` from `origin/main` `17612d4` (the merge of `learn-guide`), in its own worktree,
because another session was committing in the shared checkout. Checks: [VALIDATION.md](VALIDATION.md).

## What it is for

Naman reviews development messages to find wording the deterministic rules miss and risk concepts
they do not have. This tool prepares that review: it replays the real engine, breaks every eligible
message into exact source spans, and (optionally) groups similar spans with local sentence
embeddings so a reviewer can look at related requests together.

It is **outside the senior-facing app and outside the verdict path**. Nothing in `js/`, `src/`,
`data/` or any page loads it (checked by `discovery/tests/discovery-node.cjs`). It never labels a
scam, approves a reference, edits a rule or changes a verdict. A group is a candidate for
investigation, never proof that a rule is needed.

## Data boundary

| Source | Eligible? | Rule | Bucket |
| --- | --- | --- | --- |
| `eval/data/*.csv` in the dev, supplied or locked dataset format | yes, `dev` rows only | Rows whose `split` is not `dev` are discarded at intake. A dev row is also discarded if its family appears in a non-dev row or its text fingerprint equals a non-dev row's. Locks and the active snapshot are verified with the existing `eval/` code. Dev exposure is recorded with `eval/test-access.cjs` `recordDevExposure`. | `real` unless the row is marked synthetic |
| `eval/data/*.csv` in the legacy `messages.csv` format | **no** | No family IDs; automatic splits do not separate families (`eval/README.md`). Refused with that reason. | — |
| `adversarial/seeds.cjs`, `adversarial/known-failures.json` | yes | Declared dev-only by `eval/exposed-elsewhere.cjs`. A row whose text fingerprint is not in that registry is excluded. Exposure is already recorded by that registry, so no ledger write. | `synthetic` (constructed) |
| `discovery/fixtures/*.csv` | yes, `dev` rows only | Fictional fixtures. `provenance` must start with `FICTIONAL`. A run using only fixtures is a **demonstration with no real-data findings**. Never written to the exposure ledger. | `synthetic` (fictional) |
| Anything else (help-search data, volunteer material, `ml/data`, test files, other paths) | **no** | No eligibility rule. Refused. | — |

Only `--split dev` is accepted. There is no switch that admits other rows.

Local state checked on 2026-10-24: `eval/data/` holds only `.gitkeep`; `ml/data/` does not exist.
**No real or public development messages are available in this checkout**, so every run here is on
constructed or fictional material and reports no real-data findings.

## Pipeline

1. **Intake** (`lib/sources.cjs`): resolve each `--input` against the table above, select dev rows,
   record the source path, digest, provenance, exposure state and selection rule.
2. **Engine replay** (`lib/replay.cjs`): the real engine through `eval/engine.cjs` `loadEngine`,
   with an explicit `--today` and the row's channel. Engine, store, policy and gate digests are
   recorded. No verdict logic is copied.
3. **Candidates** (`lib/candidates.cjs`): every message gets a full-message candidate, sentence and
   line candidates, and clause candidates where a sentence joins requests (`;`, `, and`, `and then`,
   `also`…). This does **not** use the engine's demand verbs and runs on every message, including
   messages the rules already flag, so a second request in a Suspicious message is still exposed.
4. **Embeddings** (`lib/embed.cjs`): all-MiniLM-L6-v2 (vendored q8 ONNX, Transformers.js 4.3.0) in
   headless Chromium through Playwright, served from `vendor/minilm` by a request handler that
   aborts every other URL. Mean pooling, L2-normalized. No remote model, no fallback model.
5. **Grouping** (`lib/cluster.cjs`): average-linkage agglomerative clustering on cosine distance,
   cut at a threshold. Deterministic tie-break on item order. Singletons are kept and listed.
6. **Report** (`lib/report.cjs`): `findings.json` (what the review page loads), `report.md`,
   `manifest.json`.

If the model is missing or inference fails, stages 4–5 are marked `unavailable` with the reason and
the ungrouped queue is still written and usable.

## Exact spans

Offsets are **UTF-16 code-unit indices into the original message string, half-open
`[start, end)`** — JavaScript `String.prototype.slice`. This is the convention the engine's own
spans use. The original is the CSV field after the reader removes a leading byte-order mark; CRLF
inside a quoted field is kept. Every stored quote, context and embedding window satisfies
`original.slice(start, end) === quote`; `discovery:check` re-verifies it.

Embedding input is derived separately: whitespace runs collapsed to one space and trimmed
(`ws-collapse-v1`). No masking. Negation, reported speech, recipients and purpose stay in the text.

## Long input

The vendored tokenizer would silently truncate at 512 tokens. The discovery limit is **256 tokens
including `[CLS]`/`[SEP]`** (the upstream sentence-transformers setting for this model), so longer
candidates are cut into overlapping word-aligned windows (about 32 tokens of overlap) that keep exact
source offsets; the candidate vector is the normalized mean of its windows and the candidate is
flagged `windowed`. Above 64 windows the candidate is not embedded and is flagged `too_long`; it
stays in the ungrouped queue. The engine reads only the first 20,000 characters; messages beyond
that are flagged `engine_truncated`.

## Cache

One file per embedding, keyed by SHA-256 of: every model and runtime asset digest, the tokenizer
digests, Transformers.js and browser versions, the preprocessing id, pooling/normalization/dtype, the
token limit and the exact embedding input. Changing any of them misses the cache. Entries hold the
key and vector only, not text. Default location `discovery/.cache/` (git-ignored). Vectors are
derived from message text and are **not anonymous**.

## Cutoff

Chosen on development data by a rule fixed before looking at results (see `calibrate.cjs`):
on constructed rewrite families (`adversarial/seeds.cjs` + `known-failures.json`, full messages),
pick the cutoff with the highest V-measure against the seed family; ties go to the smaller cutoff.
Rewrites of one seed are declared meaning-preserving, so this measures "keeps rewordings of one
message together and different messages apart". It is a proxy: it does not show that sentence-level
groups track request concepts. Results are recorded in the Calibration section below. The cutoff is
`--cutoff`; every run also reports group counts, singletons, adjusted Rand index and per-group
stability at ±0.05 and ±0.10.

Similarity scores are grouping signals, not fraud probabilities.

## Review and the baseline

The review page (`discovery/review/index.html`) shows the same candidates and engine findings in
two modes:

- **Ungrouped queue** — the baseline: ordinary human review of the misses (by default, candidates in
  fraud-labeled messages that no Tier 1 span overlaps).
- **Grouped view** — groups, representatives, singletons, similar legitimate examples.

A reviewer can freeze ungrouped notes before opening the grouped view. Decisions made after the
freeze are marked, so added findings can be compared **exploratorily**. Prior exposure prevents a
clean speed or causal comparison; stronger evidence needs matched batches in varied order or separate
reviewers. Elapsed time is recorded only as measured by the page.

Outcomes: wording gap in an existing rule · possible missing risk concept · appropriate uncertainty
or missing external context · already covered · invalid candidate or label concern. Issue drafts are
generated for the first two. Nothing is filed automatically.

## Known limits (always shown)

- The tool can expose only concepts present in its input.
- Groups can reflect names, writing style or templates instead of request meaning.
- No Tier 1 hit does not by itself establish a defect.
- Low group yield does not prove an in-path detector has no value.
- Repeated variants of one family are not independent discoveries; counts are per family.

## Honest claim

Until human review supports it: **none beyond "an experimental local tool exists and passes its
functional and privacy checks."** If review later supports it: "I used local embeddings to group
development examples for human review and identify specific rule gaps." Not: complete scam coverage,
test accuracy, improved senior safety, or automatic discovery of new scam types. Any rule change
proposed through this tool is a separate change with its own controls, regression checks and
genuinely separate evaluation.

## Calibration

Run 2026-10-24 with `npm run discovery:calibrate` (darwin-arm64, Node 26.11.1, Chromium 156,
Transformers.js 4.3.0, ONNX Runtime Web 1.31.0-dev). Data: 499 constructed dev messages in 18 seed
families (`adversarial/seeds.cjs` `5c0df72c6caf…`, `adversarial/known-failures.json`
`c8b2aaeeccde…`), full messages, no windows needed.

| Cutoff | V-measure | Homogeneity | Completeness | Groups | Singletons | Groups spanning families | Groups mixing fraud and legit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0.10 | 0.835 | 1.000 | 0.716 | 33 | 21 | 0 | 0 |
| 0.15 | 0.937 | 1.000 | 0.881 | 19 | 13 | 0 | 0 |
| 0.20 | 0.974 | 1.000 | 0.949 | 13 | 11 | 0 | 0 |
| 0.25 | 0.997 | 1.000 | 0.994 | 9 | 10 | 0 | 0 |
| 0.30 | 0.997 | 1.000 | 0.994 | 9 | 10 | 0 | 0 |
| **0.35 (chosen)** | 1.000 | 1.000 | 1.000 | 9 | 9 | 0 | 0 |
| 0.40 | 1.000 | 1.000 | 1.000 | 9 | 9 | 0 | 0 |
| 0.45 | 0.998 | 0.997 | 1.000 | 9 | 8 | 1 | 1 |
| 0.50 | 0.997 | 0.994 | 1.000 | 9 | 7 | 1 | 1 |
| 0.55 | 0.918 | 0.849 | 1.000 | 8 | 7 | 2 | 1 |
| 0.60 | 0.896 | 0.812 | 1.000 | 7 | 6 | 3 | 2 |
| 0.65 | 0.875 | 0.777 | 1.000 | 6 | 5 | 4 | 3 |
| 0.70 | 0.849 | 0.738 | 1.000 | 6 | 2 | 4 | 2 |

Default cutoff: **0.35** (cosine similarity ≥ 0.65 on average linkage), by the rule; 0.35 and 0.40
tie and ties go to the smaller cutoff. Disclosure: 0.35 was already in the code as a placeholder
before this run; the rule selected the same value.

How much this shows: little. Rewrites of one seed are close paraphrases, so recovering 18 families
is an easy task, and the plateau is wide. It shows the cutoff does not merge different constructed
messages or mix fraud with legitimate controls on this material; it does not show that
sentence-level groups track request concepts on real messages. Recalibrate when real dev data
exists, and read each run's sensitivity table rather than trusting the default.

## Results so far and shipping decision

On fictional and constructed material (see [VALIDATION.md](VALIDATION.md)), groups mostly reflect
templates, names and family structure rather than request concepts: every group that spans more
than one constructed family is generator boilerplate. No real dev data exists yet and no human
review has been done, so the ML benefit is **unproven** and the claim stays "an experimental local
tool exists and passes its functional and privacy checks."

Shipped as an experimental local developer tool, because the functional and privacy checks pass.
What to invest in next, most useful and most reliable first:

1. **Eligible real dev data** (`eval/data` dev rows with family IDs). Without it nothing real can be
   found; a run on it is the first meaningful test.
2. **The ungrouped queue** for the first review pass. It needs no model, and it already surfaces
   uncovered spans inside Suspicious messages.
3. **A fair comparison** only after that: matched batches in varied order, or separate reviewers.
   Freezing notes before the grouped view gives an exploratory comparison only.
4. **Grouping changes** only if review shows they help: for example de-emphasizing very short
   boilerplate spans or masking names before embedding. Either needs recalibration and a new note
   here, and must stay embedding-only (never touching the original text or offsets).

If review shows grouping adds little, keep the ungrouped queue and say the ML benefit is unproven.
Do not invent a rule to claim a discovery.
