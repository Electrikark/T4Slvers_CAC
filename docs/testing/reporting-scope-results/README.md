# Reporting-scope results

Primary metric: **suite pass rate**. Frozen evaluation date: **2026-10-12**.

Tier 2 follow-up: GAP1–3 add approved-record warnings (795/795 fixture rows; 1,138 shared checks), changing all three from Details Match to Insufficient Evidence; see [before](tier2-gaps-before.json) and [after](tier2-gaps-after.json), with earlier tables retained as historical results.

Tier 2 review: 15 new variations improve from 1/15 to 15/15, bringing the fixture suite pass rate to 810/810; see [before](tier2-review-before.json), [after](tier2-review-after.json) and [two open diagnostics](tier2-review-known-gaps.json). Both diagnostics now pass: FOLLOWUP-GRANDPARENT after repair R3, and KNOWN-DEPOSIT, now a passing NOTICE row, after repair B5 ([engine defect repairs](../../decisions/engine-defect-repairs.md)).

## Current Tier 2 review

Five staff-request, five crypto-instruction and five birthday-purchase variations
were written before the engine changes. The baseline preserves all 14 failures;
only the crypto-after-action control ATM5 already passed. All 15 now produce
their single family finding and Insufficient Evidence with an approved record.
C14's message is unchanged, but its expectation and two duplicate tier assertions
now require a warning: a birthday purpose cannot justify Details Match for a
gift-card purchase request. No other existing expectations were changed.

| Group | Before this review | After |
| --- | --- | --- |
| STAFF1–5 | 0/5 | 5/5 |
| ATM1–5 | 1/5 | 5/5 |
| BIRTH1–5 | 0/5 | 5/5 |
| Each form × context × family cell (32 cells) | 24/24 | 24/24 |
| OWN | 8/8 | 8/8 |
| W | 10/10 | 10/10 |
| LEGIT | 6/6 | 6/6 |
| GAP | 3/3 | 3/3 |
| Overall suite pass rate | 796/810 | 810/810 |

The two snapshots use identical fixture hashes and the frozen date above.
There are now 42 hand rows alongside the unchanged 768 generated rows.
Node 22 and 24 and Chromium passed **1,155/1,155 shared checks**. Node also
passed 36 parity, 2 boundary and 12 evaluation checks. The offline generator
check passed; runtime tests read the checked-in fixture.

Separately, **one known false alarm remains**: “Deposit received: $500 by wire
transfer” produces a wire warning and Insufficient Evidence instead of Details
Match with an approved official link. Both that case and the older “Grandma,
buy…” miss are retained as historical failed diagnostics outside the 810 rows.
The bounded family opener was repaired on 2026-10-21 in `FIX18` of
`tests/repair-cases.js`; the deposit false warning remains. See the
[follow-up task](../grandparent-opener-task.md) for the remaining opener scope.

Only examples supplied in the review and the listed variations were checked;
the reviewer's complete 24-message set was not provided. Synthetic tests do
not replace real-message collection. The sections below retain historical
counts and baselines from the earlier reporting-scope work.

## What these rows represent

The original 384 rows were **16 sentence templates**, each expanded into 11
punctuation/line-wrap variants and multiple record states. They were not 384
independently written messages. The expanded suite has **32 sentence templates**:
16 asking forms and 16 bare-imperative forms. Each has the same 11 surface
variants and record-state combinations, yielding 768 generated rows. Record
state changes evidence/verdict eligibility, not the wording or request parsing.
There are also 24 hand-written rows (OWN 8, W 10, legitimate/negation 6).
The comma variant is now named `comma`; the former `dash` name was incorrect.

All templates share one author. Correlated synthetic variants cannot substitute
for real-message collection in Task 11. A perfect suite pass rate is not a
performance estimate for messages from the public.

## Before and after, separated by demand form

All three columns use exactly the same fixture hash. `af93e3e` predates the
reporting-scope repair `745f577`; `f66029b` contains that repair but predates the
OWN expansion. The current engine is identified by its hash in
[final-expanded.json](final-expanded.json).

| Form / context × family / hand group | Before scope: af93e3e | After scope: f66029b | Current |
| --- | --- | --- | --- |
| asking-WF-GC | 4/24 | 4/24 | 24/24 |
| asking-WF-CD | 4/24 | 4/24 | 24/24 |
| asking-WF-WT | 4/24 | 4/24 | 24/24 |
| asking-WF-RA | 4/24 | 4/24 | 24/24 |
| asking-PC-GC | 4/24 | 4/24 | 24/24 |
| asking-PC-CD | 4/24 | 4/24 | 24/24 |
| asking-PC-WT | 4/24 | 4/24 | 24/24 |
| asking-PC-RA | 4/24 | 4/24 | 24/24 |
| asking-RD-GC | 20/24 | 20/24 | 24/24 |
| asking-RD-CD | 20/24 | 20/24 | 24/24 |
| asking-RD-WT | 20/24 | 20/24 | 24/24 |
| asking-RD-RA | 20/24 | 20/24 | 24/24 |
| asking-TW-GC | 4/24 | 4/24 | 24/24 |
| asking-TW-CD | 4/24 | 4/24 | 24/24 |
| asking-TW-WT | 4/24 | 4/24 | 24/24 |
| asking-TW-RA | 4/24 | 4/24 | 24/24 |
| bare-WF-GC | 18/24 | 18/24 | 24/24 |
| bare-WF-CD | 18/24 | 18/24 | 24/24 |
| bare-WF-WT | 18/24 | 18/24 | 24/24 |
| bare-WF-RA | 18/24 | 18/24 | 24/24 |
| bare-PC-GC | 18/24 | 20/24 | 24/24 |
| bare-PC-CD | 18/24 | 20/24 | 24/24 |
| bare-PC-WT | 18/24 | 20/24 | 24/24 |
| bare-PC-RA | 18/24 | 20/24 | 24/24 |
| bare-RD-GC | 24/24 | 24/24 | 24/24 |
| bare-RD-CD | 24/24 | 24/24 | 24/24 |
| bare-RD-WT | 24/24 | 24/24 | 24/24 |
| bare-RD-RA | 24/24 | 24/24 | 24/24 |
| bare-TW-GC | 18/24 | 24/24 | 24/24 |
| bare-TW-CD | 18/24 | 24/24 | 24/24 |
| bare-TW-WT | 18/24 | 24/24 | 24/24 |
| bare-TW-RA | 18/24 | 24/24 | 24/24 |
| OWN | 1/8 | 1/8 | 8/8 |
| W | 10/10 | 10/10 | 10/10 |
| LEGIT | 6/6 | 6/6 | 6/6 |
| Overall | 457/792 | 489/792 | 792/792 |

The bare-imperative subset moves **312/384 → 344/384 → 384/384**. The first gain
of 32 rows is evidence for the original scope repair. The remaining 40 rows
needed today's recognition of short warning/purpose prefaces with colon,
comma or no punctuation; do not attribute them to the earlier scope repair.
The asking subset moves **128/384 → 128/384 → 384/384**, which primarily measures
OWN recognition and SMS-wrap handling, not the original clause-scope defect.
The four baseline passes in each positive asking cell were wrap variants:
without the asking prefix on the same line, the action looked like an imperative.

## Audit trail

- [baseline-af93e3e.json](baseline-af93e3e.json): full current fixture against the
  pre-repair engine; all 335 failures, hashes, frozen date and cell counts.
- [baseline-f66029b-expanded.json](baseline-f66029b-expanded.json): the same
  fixture after the original repair; all 303 failures, allowing the scope gain
  to be separated from later instruction recognition.
- [warnings-before-subject-fix.json](warnings-before-subject-fix.json): W5–W10
  each fail as Suspicious before the sender allowlist; their quiet expectations
  were written first. W10 completes the reviewer's ellipsis with “pay with gift cards.”
- [warnings-after-subject-fix.json](warnings-after-subject-fix.json): all six
  warnings pass after the initial allowlist change (408/408 at that stage).
- [expanded-before-boundary-fix.json](expanded-before-boundary-fix.json): all 40
  bare-preface failures saved before their recognition fix.
- [final-expanded.json](final-expanded.json): 792/792, no skipped or
  expected-failure rows; 24/24 in all 32 form × context × family cells.
- The older `baseline.json`, `baseline-corrected-templates.json` and
  `final.json` remain historical evidence for the earlier, smaller fixture.
  Their OWN-heavy table must not be used as proof of the original scope repair.

## Reproduce

Validated on Node 22.23.3 and Node 24.19.0: 1,130/1,130 shared checks,
36/36 source-gate parity checks, 2/2 boundaries and 12/12 evaluation checks.
Chromium over HTTP also passed 1,130/1,130 shared checks with the checked-in
768 generated and 24 hand rows. The offline generator check passed separately.
The [expanded manual review](manual-review-expanded.md) records 20 sampled rows.

Tests read the checked-in fixture. The generator is only an offline editing tool.

```sh
node scripts/generate-reporting-scope.cjs --check
node scripts/run-reporting-scope.cjs
npm test
mkdir -p /tmp/scope-before
# Use a fresh directory for this archive.
git archive af93e3e | tar -x -C /tmp/scope-before
node scripts/run-reporting-scope.cjs --engine-root /tmp/scope-before --output /tmp/scope-before-results.json
```

The result writer refuses to overwrite an existing output. A failing baseline
returns exit code 1; that is expected and does not change any fixture label.
See the [decision and execution checklist](../../decisions/reporting-scope.md).
