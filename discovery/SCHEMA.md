# Discovery output schema

A run writes one folder (default `discovery/out/<runId>/`, git-ignored). Offsets everywhere are
UTF-16 code-unit indices into the original message, half-open `[start, end)`, so
`message.text.slice(start, end) === quote`.

## `manifest.json` — how the run was made

| Field | Meaning |
| --- | --- |
| `schema`, `version` | `safety4seniors.discovery.manifest`, `1` |
| `runId` | `run-<referenceDate>-<12 hex>`; a digest of the inputs, configuration, engine and model fingerprints |
| `createdAt` | wall-clock time of the run (the only time-dependent field) |
| `demonstration` | `true` when no real or public rows were processed |
| `repository` | `revision`, `branch`, `dirty`, `dirtyFiles` |
| `referenceDate`, `split` | the `--today` passed to the engine; always `dev` |
| `sources[]` | per input: `kind`, `path`, `sha256`, `provenance`, `exposure`, `selectionRule`, `selected`, `excluded` (counts and reasons only; no excluded IDs or text) |
| `selection` | `selectedIds` (sorted) and counts by bucket (`real` / `synthetic`), message and family |
| `engine` | engine, store and policy versions; SHA-256 of every engine file, the store, the policies, `src/assessment.js` and the built gate |
| `model` | name, dtype, pooling, normalization, token limit, asset digests, tokenizer digest, Transformers.js, ONNX Runtime Web, browser and Node versions, platform |
| `preprocessing` | `ws-collapse-v1`: whitespace runs → one space, trimmed; no masking |
| `clustering` | method, linkage, metric, `cutoff`, sensitivity cutoffs, tie-break rule |
| `stages` | `intake`, `replay`, `candidates`, `embedding`, `clustering`, `report`: `status` (`ok`, `unavailable`, `skipped`, `failed`) and `detail` |
| `cache` | directory, hits, misses, rejected entries |
| `blockedRequests` | every URL the embedding browser tried to load outside the vendored assets (should be empty) |
| `outputs` | SHA-256 of `findings.json` and `report.md` |

## `findings.json` — what the review page loads

```text
schema            "safety4seniors.discovery.findings"
version           1
runId, demonstration, referenceDate, notices[]
config            { cutoff, sensitivity[], tokenLimit, windowOverlapTokens, maxWindows, neighbors, preprocessing }
stages            same as the manifest
messages[]        { messageId, familyId, split:"dev", provenance:{sourceKind, sourceType, bucket, detail},
                    suppliedLabel ("fraud"|"legit"|"unlabeled"), suppliedTier1[] (may be empty for fraud),
                    channel, text, flags[] ("engine_truncated"…), priorKnowledge[],
                    engine:{ assessment, rules[], blockedBy[], incomplete, truncated, valid,
                             tier1[]   { ruleId, status, span|null },
                             tier2[]   { ruleId, status, level, span|null },
                             unresolved[] { kind, id, span|null },
                             checks[]  { status, code, target },
                             evidence[] { kind, ruleId, start, end, quote, exact } } }
candidates[]      { candidateId, messageId, familyId, start, end, quote,
                    context:{ start, end, quote }, methods[] ("full_message"|"sentence"|"line"|"clause"),
                    origin:"automatic", reviewState:"unreviewed",
                    coverage:{ tier1[]{ruleId, overlap}, tier2[]{ruleId, overlap}, messageLevelTier1[], uncovered },
                    relatedEvidence[] (indices into message.engine.evidence),
                    embedding:{ status ("embedded"|"windowed"|"too_long"|"context_only"|"unavailable"|"skipped"),
                                tokens|null, windows[]{start, end, quote, tokens} },
                    groupId|null, similarityToRepresentative|null }
groups[]          { groupId, provisionalName, members[], representatives[], items, messages,
                    families:{ real, synthetic }, labels:{ fraud, legit, unlabeled },
                    uncoveredItems, singleFamily, meanSimilarity, stability{ "<cutoff>": jaccard } }
singletons[]      candidateIds embedded but not grouped with anything at the cutoff
ungroupable[]     candidateIds with no vector (reason in candidate.embedding.status)
neighbors         { candidateId: [ { candidateId, messageId, familyId, similarity } ] } — nearest legitimate
                    candidates from other families
sensitivity[]     { cutoff, groups, singletons, ari }
```

Every candidate is reachable: it is in exactly one group, in `singletons`, or in `ungroupable`.
`provisionalName` is the start of the representative quote; it is not a category.

## Review export (`review-<runId>.json`, written by the review page)

```text
schema       "safety4seniors.discovery.review"
version      1
runId        must equal the findings runId
reviewer     free text typed by the reviewer, or "" (never filled in by the tool)
frozenAt     ISO time the ungrouped notes were frozen, or null
firstGroupedAt ISO time the grouped view was first opened, or null (a grouped view opened before the freeze means no clean baseline)
baseline     snapshot of decisions at freeze time, or null
effort       { ungroupedMs, groupedMs } measured while the page was visible in each mode
created[]    reviewer-made candidates { candidateId, messageId, start, end, quote, origin:"reviewer", method }
decisions    { candidateId: { reviewState ("confirmed"|"adjusted"|"split"|"rejected"|"unreviewed"),
                              adjusted:{start,end,quote}|null, splitInto[],
                              outcome ("wording_gap"|"missing_concept"|"appropriate_uncertainty"|
                                       "already_covered"|"invalid_candidate"|null),
                              evidence, nextAction, knownBeforeRun ("yes"|"no"|"unsure"|""), knownReference,
                              issue:{ currentBehavior, whyInsufficient, intendedScope,
                                      controlsLegit, controlsNegated, controlsReported, unknowns },
                              mode ("ungrouped"|"grouped"), afterFreeze, updatedAt } }
```

`npm run discovery:check -- --report <folder> --review <file>` validates the export against the
findings and writes `review-summary.md` and `issue-drafts.md` into the report folder.
