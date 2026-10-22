# Rules v1.1 staged validation

Branch: `rules-v1.1` in `review-five-organizations`. The F1–F5 work was written on a separate branch (source tip `c5eb30b`, base `aa48952`) and integrated here commit by commit onto this checkout's existing `541c761`; the branch was not reset to the source snapshot.

| Source commit | Integrated as | Notes |
| --- | --- | --- |
| `266c2d8` evaluator split filter | `32d807f` | The local evaluator already filtered the split before analysis and had newer holdout protections; the local evaluator and its tests were kept. |
| `a7c768e` F1 | `aeac994`, `01bbcf0` | `01bbcf0` updates nine local expectations that still required pressure for named remote-tool requests. Negated, reported and unknown-requester negatives were retained. |
| `8f59a92` F2 | `a9e6af0` | The local Chase `+18009359935` Draft record with source notes was kept instead of the older source entry. |
| `72720c6` F3 | `5898d4f` | |
| `72bea69` F4 | `43615de` | |
| `d44d77c` F5 | `5657900` | Adds Draft domain-only records for HSBC, Royal Mail and E-ZPass. |
| `c5eb30b` robustness | `07b7a6d` | |

Against `541c761`, `src/assessment.js` and `js/assessment-gate.js` differ only by adding `T1-COMBO` to the closed Tier 1 registry; Details Match decision logic is unchanged. The `eval/` evaluator files are unchanged. `data/store.js` only gains the three Draft records. No test-split rows were evaluated.

## Dev evaluation (measured locally)

Corpus: `eval/data/supplied-30916d1f/revised-2026-10-16/messages.csv`, selected by `eval/data/active-eval.json` and its manifest (SHA-256 `8f7788ce5f8d034b83cf3410dfec505bf5a89c76e13d3026c1581104699ccab3`, verified before each run). 194 rows, all `dev` (95 fraud, 99 legit), reference date 2026-10-17. The older locked corpus (`30916d1f…`, 178 dev / 16 test) was not substituted. Each stage ran `npm run eval -- --split dev --input <corpus> --today 2026-10-17`.

Kinds are those of `eval/failures.cjs`: A fraud reassured (Details Match), B fraud only paused, C right verdict but expected Tier 1 rule missing, D false alarm (legit labeled Suspicious), E legit with a Tier 2 warning.

| Stage | Commit | New rule tests before implementation | New rule tests after implementation | npm test | Dev fraud caught | D | E | Legit dev Suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | `541c761` | N/A | N/A | Pass | 36/95 | 0 | 7 | 0/99 |
| Evaluator split filter | `32d807f` | N/A (fix already present locally) | Local tests kept | Pass | 36/95 | 0 | 7 | 0/99 |
| F1 | `aeac994` | Failed as expected | 38/38 | Pass | 42/95 | 0 | 7 | 0/99 |
| F2 | `a9e6af0` | Failed as expected | 27/27 | Pass | 48/95 | 0 | 7 | 0/99 |
| F3 | `5898d4f` | Failed as expected | 19/19 | Pass | 51/95 | 0 | 7 | 0/99 |
| F4 | `43615de` | Failed as expected | 12/12 | Pass | 52/95 | 0 | 7 | 0/99 |
| F5 | `5657900` | Failed as expected | 23/23 | Pass | 57/95 | 0 | 7 | 0/99 |
| Final robustness | `07b7a6d` | Failed as expected | 11/11 | Pass | 57/95 | 0 | 7 | 0/99 |

A and C were 0 at every stage. Final fraud labeled Suspicious: 57/95 = 60.0% (95% range 49.9%–69.3%), up from 36/95. A rerun at `07b7a6d` produced a `results.csv` byte-identical to the recorded final stage. Per-stage stats and test logs are in `docs/rules-v1.1-logs/local/`; full reports with message text stay in the git-ignored `eval/results/rules-v1.1/`.

Limits: 100 of the 194 dev rows are synthetic and 94 are public examples, so these are behaviour checks on the dev set, not field accuracy. The zero dev false-alarm result holds for this dev set only. Details Match cannot occur because no organization record is human-reviewed, so zero false reassurance is structural. The dev set was used while writing these rules.

## F1

Added pressure-free named-tool requests and nearby session/connection references. Negation, reported examples, the Wells Fargo advice and informational tool mentions remain excluded. Opening an article about AnyDesk or sharing a TeamViewer guide is also excluded. Generic remote access retains its existing pressure requirement. Updated prior expectations that explicitly required pressure for named tools.

## F2

Added explicit-number financial/account callbacks, including conditional instructions and amount-bearing payment notices. A stored number for the attributed brand leaves a Tier 2 blocker even when reviewed; a wrong-brand or second unknown callback number still qualifies. Added the user-supplied Chase number as unreviewed. No-charge notices, back-of-card advice and appointment messages remain excluded. Details Match gate logic is unchanged.

## F3

Added gift-card acquisition requests with nearby reimbursement, sender-use or inability-to-buy context. Birthday gifts, Apple/Amazon/Target credit-card bills and context-free “get some more gift cards?” remain outside Tier 1. No new gift-card payment interpretation is inferred from a brand name alone.

## F4

Added T1-COMBO only for a money request with secrecy and emergency/urgency context. Surprise-party contributions, homework and cases missing any one predicate remain excluded. Registered T1-COMBO in the gate’s closed rule list; assessment decision logic is unchanged. Explanations, annotations and self-check advice retain all three predicates.

## F5

Added whole-brand host matching plus direct pay/verify/confirm/reschedule/click instructions, using all domain-record statuses only for caution. Added domain-only Draft records for HSBC, Royal Mail and E-ZPass. Real domains and their subdomains, paths/queries, embedded brand letters and reported/negated instructions remain excluded. Modern contact-only Draft records also work without legacy domain fields. Fixed display handling of those records.

## Final robustness and failure causes

All 130 added rule/robustness cases pass alongside the existing suite. Five false-positive edge cases and one crash were reproduced as failing tests before correction:

| Observed implementation cause | Correction |
| --- | --- |
| A generic phone-number request could borrow an unrelated remote-tool mention | Session sharing requires a session/connection/access/request/ID object, not an arbitrary number |
| Quoted scam examples using single quotes lost their reporting scope across sentences | Both quote styles retain position-specific reporting ranges, including contractions and independent instructions after the quote |
| Any nearby money noun could qualify a request to send a document or a statement about saving | T1-COMBO now requires money as the direct requested object |
| Legacy lookalike checks assumed officialDomains existed | Contact-only Draft records supply a display/reference fallback without gaining trust |

The earlier F2 robustness check also excludes “No charge was made” from financial-alarm context.

These are code-level findings from the constructed cases. The corpus failure analysis follows.

## Dev failure analysis (`eval/analyze-dev.cjs`)

Run: `node eval/analyze-dev.cjs --input <revised corpus> --baseline eval/results/rules-v1.1/baseline/results.csv --after eval/results/rules-v1.1/final/results.csv --review docs/rules-v1.1-logs/review-notes-revised.json --day 2026-10-18 --out eval/results/rules-v1.1/analysis`. Output is copied to `docs/rules-v1.1-logs/local/dev-failure-analysis.md` and `analysis-stats.json`.

Manual causes for 58 of the 66 baseline failures are reused unchanged from the Oct 16 review (`deterministic-engine/eval/results/supplied-30916d1f/review-notes.json`). The other eight rows entered dev in the revised corpus and had no review; their causes were assigned during this integration and still need human confirmation: pub_0073 and pub_0092 (money appeal with no payment method), pub_0077, pub_0088 and pub_0094 (placeholder destination), pub_0082 and pub_0085 (opener with no action or destination), and pub_0084 (Maybank host with no Maybank record).

Baseline: 66 failures (B 59, E 7). After the final robustness stage: 45 remain (B 38, E 7), 21 fixed, no regressions, and no row became C or D.

| Fixed by | Rows | Baseline cause |
| --- | --- | --- |
| F1 | syn_0007, syn_0008, syn_0015, syn_0016, syn_0049, syn_0050 | Remote-access request lacked the previously required pressure |
| F2 | syn_0009, syn_0010, syn_0017, syn_0018, syn_0045, syn_0046 | Financial callback lacked the previously required device alarm |
| F3 | pub_0042, syn_0021, syn_0022 | Card purchase without a payment purpose or redemption secret |
| F4 | pub_0070 | Money appeal without a Tier 1 payment method (now money + secrecy + emergency) |
| F5 | pub_0079, pub_0089, pub_0093, syn_0041, syn_0042 | Missing sender record (now Draft domain records, caution only) |

| Remaining cause | Kind | Rows | Count |
| --- | --- | --- | --- |
| Destination replaced by a placeholder; no hostname to judge | B | pub_0065, pub_0066, pub_0068, pub_0074, pub_0075, pub_0076, pub_0077, pub_0078, pub_0080, pub_0086, pub_0088, pub_0094 | 12 |
| Isolated opener with no Tier 1 action or destination | B | pub_0002, pub_0041, pub_0043, pub_0044, pub_0056, pub_0059, pub_0060, pub_0082, pub_0085 | 9 |
| Money appeal with no payment method, or missing one of secrecy/emergency | B | pub_0071, pub_0073, pub_0092, syn_0039, syn_0040 | 5 |
| Gift-card purchase without sender-use, reimbursement or excuse context | B | pub_0057, pub_0058, pub_0061 | 3 |
| Domain expectation without hostname-deception evidence (brand in path, etc.) | B | pub_0001, pub_0081, pub_0083 | 3 |
| Missing sender record | B | pub_0064, pub_0084 | 2 |
| Foreign-brand host without a qualifying action request | B | syn_0001, syn_0002 | 2 |
| Callback expectation still outside the F2 contract | B | pub_0090 | 1 |
| Indirect third-party need outside the sender-demand contract | B | syn_0032 | 1 |
| Login instruction stays Tier 2 (source label does not authenticate) | E | pub_0027, pub_0048, syn_0064 | 3 |
| Clinical urgency triggers broad pressure vocabulary | E | syn_0073, syn_0074, syn_0097 | 3 |
| Routine appointment callback triggers call vocabulary | E | pub_0023 | 1 |

By the analyzer's cause categories (baseline): other 55, missing record 7, overly broad warning 4, wording 0, scope 0. The four overly broad warnings and the three login warnings are the seven E rows; none of the F1–F5 changes targeted them, and they stayed Tier 2 rather than becoming Suspicious.

The test split has not been evaluated, and the revised corpus has no test rows. A prospective test set is still needed before reporting field accuracy.
