# Rules v1.1 staged validation

Branch: `rules-v1.1`. Base: repaired pre-F1–F5 commit `aa48952`.
The prior combined implementation remains untouched in `/workspace/T4Slvers_CAC`.

The evaluator now selects the requested split **before** engine analysis. Its regression test failed before the change and passes after it. No held-out corpus rows have been evaluated.

| Stage | New rule tests before implementation | New rule tests after implementation | npm test | Dev fraud caught | D | E | Legit dev Suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | N/A | N/A | Pass | unavailable | unavailable | unavailable | unavailable |
| F1 | Failed as expected | 38/38 | Pass | unavailable | unavailable | unavailable | unavailable |
| F2 | Failed as expected | 27/27 | Pass | unavailable | unavailable | unavailable | unavailable |
| F3 | Failed as expected | 19/19 | Pass | unavailable | unavailable | unavailable | unavailable |
| F4 | Failed as expected | 12/12 | Pass | unavailable | unavailable | unavailable | unavailable |
| F5 | Failed as expected | 23/23 | Pass | unavailable | unavailable | unavailable | unavailable |
| Final robustness | Failed as expected | 11/11 | Pass | unavailable | unavailable | unavailable | unavailable |

For each completed stage, `npm run eval -- --split dev` was invoked and exited 2 because `eval/data/messages.csv` is absent. Unavailable is not zero. The meanings of D and E and the existing failure taxonomy must come from the supplied analysis script/spec; they are not guessed here. Logs are in `docs/rules-v1.1-logs/`.

The user supplied Mac paths for the locked corpus with SHA-256 `30916d1f386a3f5feb67f544be323861b62ac7b4405dd298c2c508686c87f6ab` and a revised corpus with SHA-256 `8f7788ce5f8d034b83cf3410dfec505bf5a89c76e13d3026c1581104699ccab3`. Neither file is accessible in this cloud workspace. `eval/analyze-dev.cjs` is also absent. No synthetic rows are substituted for those datasets.

After the user's instruction to continue, implementation proceeds with constructed positive and negative regression cases, without claiming the dev false-alarm requirement is verified. The zero-legitimate-dev-Suspicious acceptance condition remains unverified until the corpus is available.

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

These are code-level findings, **not updated corpus failure counts**. After all five fixes, `node eval/analyze-dev.cjs` was attempted and failed with MODULE_NOT_FOUND. The original analyzer and its D/E taxonomy are unavailable, so its failure causes cannot be recomputed faithfully. The final dev evaluation also stopped at the missing CSV. No dev false-alarm guarantee, fraud-caught count or D/E count is claimed.

The gate comparison confirms that `src/assessment.js` matches `aa48952` exactly apart from adding `T1-COMBO` to the closed rule registry. Draft domain records and the unreviewed Chase number cannot authenticate a contact. Full test logs, failed-test evidence, dev command errors and the gate comparison are retained beside this file.

To finish field validation, supply the locked corpus and the existing `eval/analyze-dev.cjs` (and its dependencies or D/E definitions). Verify the supplied CSV hash before installing it in the ignored `eval/data/` directory. Reproduce each stage using the F1–F5 commits, run only the dev split, and stop on any legitimate dev message becoming Suspicious. The earlier test split has not been evaluated.
