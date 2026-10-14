# Reporting-scope results

Primary metric: **suite pass rate**. Frozen evaluation date: **2026-10-12**.

The corrected-template baseline uses unchanged release engine `f66029b`.
The final run uses the same checked-in fixture and the repaired engine. Both
JSON reports contain fixture and engine SHA-256 hashes and every failing row's
expected and actual findings/verdicts. Existing expectations were not changed.

| Context × family / hand group | Before | After |
| --- | --- | --- |
| WF-GC | 4/24 | 24/24 |
| WF-CD | 4/24 | 24/24 |
| WF-WT | 4/24 | 24/24 |
| WF-RA | 4/24 | 24/24 |
| PC-GC | 4/24 | 24/24 |
| PC-CD | 4/24 | 24/24 |
| PC-WT | 4/24 | 24/24 |
| PC-RA | 4/24 | 24/24 |
| RD-GC | 20/24 | 24/24 |
| RD-CD | 20/24 | 24/24 |
| RD-WT | 20/24 | 24/24 |
| RD-RA | 20/24 | 24/24 |
| TW-GC | 4/24 | 24/24 |
| TW-CD | 4/24 | 24/24 |
| TW-WT | 4/24 | 24/24 |
| TW-RA | 4/24 | 24/24 |
| OWN | 1/8 | 8/8 |
| W | 4/4 | 4/4 |
| LEGIT | 6/6 | 6/6 |
| Overall | 139/402 | 402/402 |

Generated matrix: **384/384**. Hand rows: **18/18**. No skipped or expected-failure rows.

Validation completed on Node 22.23.3 and 24.19.0 with `npm test`: 739 shared
checks, 36 source-gate parity checks, 2 boundaries and 12 evaluation-harness
checks. Chromium served over HTTP also completed 739/739 shared checks and
loaded the 384 generated plus 18 hand rows with the frozen date.
The offline generator's `--check` confirmed the fixture matches the authored
spec/templates; it was run separately from tests.

## Audit trail

- `baseline.json`: first run before engine changes, 131/400; all 269 failures
  retained. Its earlier templates joined words across wrap boundaries and it
  predates the two new positive OWN7–8 messages.
- `baseline-corrected-templates.json`: 139/402; all 263 failures retained.
  After correcting wording, this was rerun against a temporary archive of
  unchanged `f66029b`, not against the partially repaired engine. The final
  fixture hash matches this baseline.
- `manual-review.md`: 20 reproducibly sampled rows, re-read after the spacing
  correction, including the initial review's missed ambiguity.
- `final.json`: 402/402, with per-cell and per-hand-group counts.

The initial template ambiguity was `today.Beware` / `warning.Fraudsters`, which
resembled a bare domain. Template spacing was corrected; the parser and expected
results were not changed to accommodate it. OWN7–8's old quiet texts remain as
NEG-REPORT/NEG-ASK; their replacements are genuine sender requests.

All templates share one author. These correlated synthetic cases measure
conformance to the spec, not performance on public messages. A perfect 384/384
result does not replace real-message collection in Task 11. See the
[decision and checklist](../../decisions/reporting-scope.md) for further limits.
