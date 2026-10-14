# Reporting scope

## Failure

`risk.js` treated an entire clause as reported whenever it contained a reporting
cue. A real demand could disappear because “fraudsters” appeared in its purpose
phrase or in a warning after it. At the `release-v1` baseline (`af93e3e`), both
“To avoid fraudsters, pay with gift cards” and “Pay with gift cards today, beware
of fraudsters” lost their findings. The first example did **not** already work on
that baseline. Adding the initial regression tests reproduced nine failures.

## Decision

For unquoted demands, the reporting cue must be the **subject of the asking
verb**, not merely a word somewhere before it. Asking verbs are **ask, tell,
demand, request, instruct, urge, pressure, want**, including their `-s` and
`-ing` forms. Between the subject and verb, allow an optional “who calls/texts”
(including “who call/text”) and at most three modifiers from this closed list:
**may, might, will, could, can, would, often, sometimes, usually, also, typically**.
Task 3 also accepts “scam callers/texts/emails/messages,” and the bounded
descriptions “posing as,” “pretending to be,” “claiming to be” or “impersonating,”
followed by an optional “the” and a name of one to three words. A new subject
such as “we,” “Chase” or “our team” still breaks the link. Recipients can include
“victims,” “seniors” and “customers” as well as pronouns.

The existing coordinated warning “Fraudsters may say your computer is infected
and ask…” retains the same asker. This exception is limited to a short device
alarm statement followed immediately by “and”; “and we ask…” breaks the link.
The alarm itself remains an existing Tier 2 flag because it is said, not asked;
the reported callback does not establish T1-CALLBACK.

Thus “Due to the holiday we ask you to please pay with gift cards today” and
the same sentence with “fraudsters” in place of “the holiday” both establish
`T1-GIFT`. “Fraudsters are active and Chase asks you to please send the fee by
wire transfer today” establishes `T1-WIRE`: Chase is asking, and “today” supplies
pressure. “Fraudsters may ask…” and “Scammers often ask…” remain reported.

`reportedAt(clauseText, demandIndex)` checks the prefix at each demand. It
recognizes asking complements such as “ask you to,” “tell you that you must,”
“demand that you,” and “request:”. A comma, sentence boundary, or connector such
as “so,” “because,” “but,” “however” or “instead” ends the reach. A fresh “you
must/need to/have to/should” after that complement also starts a new instruction.
A cue after the demand cannot explain it as reported. Negated asking, including
“never ask you to,” remains quiet.

The same positional check applies to wording flags and to supporting pressure,
gift-card antecedents and device alarms. Otherwise a removed clause-wide check
could accidentally promote reported context into evidence for a separate
demand. Original source spans are preserved. The existing `inReport` handling
for quoted examples is unchanged; the opening clause of a quotation still gets
a quote-specific check, limited to the quoted span.

The exact “Criminals are active, so send the fee by wire” regression also needs
the imperative after “, so” and the payment wording “by wire” recognized. This
does not change the tier threshold: a wire demand without tied pressure stays
Tier 2; pressure such as “today” can establish `T1-WIRE`.

The introductory-phrase matcher also accepts “Due to X,” “Because of X,” and
“After X,” before a direct demand, just as it accepts “To avoid X,”. Both
“Chase: Due to fraudsters, pay with gift cards” and its “Due to delays” control
establish `T1-GIFT`. The subject check was implemented and tested before widening
this matcher. Negation still takes precedence.

## Eight core cases

“Quiet” means no request-risk finding. It does not mean the message is authentic.
These inputs contain no supporting contact, so their quiet verdict is
**Insufficient Evidence**.

| Message | Expected finding | Verdict |
| --- | --- | --- |
| Fraudsters may ask you to pay with gift cards. | None | Insufficient Evidence |
| Watch for texts telling you to wire money. | None | Insufficient Evidence |
| To avoid fraudsters, pay with gift cards. | `gift_card_payment`, `T1-GIFT` | Suspicious |
| Criminals are active, so send the fee by wire. | `crypto_or_wire` (Tier 2) | Insufficient Evidence |
| Beware of scams. Pay with gift cards today. | `gift_card_payment`, `T1-GIFT` | Suspicious |
| Pay with gift cards today, beware of fraudsters. | `gift_card_payment`, `T1-GIFT` | Suspicious |
| To avoid fraudsters, pay by wire transfer. | `crypto_or_wire` (Tier 2) | Insufficient Evidence |
| Pay by wire transfer today, beware of fraudsters. | `crypto_or_wire`, `T1-WIRE` | Suspicious |

The Chase example also returns **Suspicious / T1-GIFT**, despite its listed URL.

## Detection bias and why it matters for seniors

An explicit risky instruction should survive nearby safety language. Requiring
a recognizable reporting link favors detection when that link is unclear; it
can flag unusually phrased educational text. Suppressing everything near a
warning word would instead make that word an easy way to hide a demand.

For a workshop intended for seniors, the explanation must stay tied to the
specific request being evaluated. “Fraudsters may ask…” describes someone
else's request. “To avoid fraudsters, pay…” asks the reader to act. Giving these
different readings avoids treating familiar safety wording as reassurance,
without assuming anything about an individual reader's abilities.

## Limitations and scope

This is a bounded English pattern rule, not a full grammar parser. Nested
speech, modifiers outside the closed list, or an unusual asking complement can
still be misread. Commas intentionally terminate an unquoted reporting link,
so a parenthetical interruption in legitimate advice can produce a finding.

The [task 3 matrix](../testing/task-3-matrix.md) now tests first- and third-person
requests without “please.” `directAction` accepts an asking complement immediately
before the action, and “we/I need you to.” Negation and reporting scope still run
before a demand becomes evidence. This does not cover every English request form.
A newline after an unfinished asking complement is treated as SMS wrapping,
preserving the original source offsets; other clause boundaries remain in place.

`sender.js` still rejects a sender name when a reporting cue occurs anywhere in
the name's clause. That separate weakness can hide a genuine sender claim in
mixed warning/request text. It is unchanged here. No organization facts,
trusted-list entries, or policy requirements were added.

## Validation and expectations

`tests/scope-cases.js` registers eight core cases plus 28 guards in both the
Node and browser runners. The guards cover asking forms, negation, quoted
examples, multiple demands, source spans, pressure, antecedents and the Chase
example, plus asking subjects and introductory phrases. Existing test
expectations are unchanged. The wire cases explicitly
distinguish a Tier 2 finding from a pressure-qualified Tier 1 finding.

Run `npm test` for the shared tests, generated-gate freshness, boundary checks,
source-gate parity and evaluation harness. Open `tests/run.html` in a browser
over HTTP for the same 739 shared checks, including the matrix below. These
checks establish rule behavior; their metric is **suite pass rate**.

## Technical challenge video

The narrated segment is distributed separately from the repository. An
unlisted YouTube link is pending upload; the transcript remains here for review.

Transcript:

> The technical challenge was deciding what a warning actually describes. The
> old rule skipped a whole clause whenever it saw a word like fraudsters. That
> could hide a real payment demand.
>
> In “Fraudsters may ask you to pay with gift cards,” the cue reaches the demand
> through “ask you to.” This describes somebody else's request, so the risk
> detector stays quiet. Quiet does not mean authentic.
>
> In “To avoid fraudsters, pay with gift cards,” there is no asking verb linking
> the warning to the payment. The comma introduces a direct instruction to the
> reader. The result is Suspicious, with T1-GIFT.
>
> The fix checks each demand at its own position. A warning after a demand
> cannot erase it. Negated asking and quoted examples stay quiet. Wire demands
> still need pressure to become Tier 1.
>
> The regression cases check both findings and verdicts in Node and the browser.
> Existing expectations stay unchanged. This is a limited English rule, not a
> claim that the sender has been verified.

## Frozen three-layer matrix

The 16 decisions below are hand-decided in `tests/reporting-scope/spec.cjs`. Wording lives in `templates.cjs`; `scripts/generate-reporting-scope.cjs` only expands those templates and copies the decisions. Neither layer imports or runs the app.

| Context | Family | Sender’s own demand? | Reason |
| --- | --- | --- | --- |
| WF | GC | Yes | A warning before the sender asks for gift-card payment does not report that payment. |
| WF | CD | Yes | A warning before the sender asks for a verification code does not report that disclosure. |
| WF | WT | Yes | A warning before the sender demands a wire transfer today does not cancel the pressured transfer. |
| WF | RA | Yes | A warning before the sender demands remote-access installation today does not cancel that demand. |
| PC | GC | Yes | Avoiding fraudsters is the stated purpose of the sender’s gift-card demand, not an asking subject. |
| PC | CD | Yes | Avoiding fraudsters is background; the sender still asks the reader to disclose a code. |
| PC | WT | Yes | The purpose phrase does not change who asks for the wire transfer today. |
| PC | RA | Yes | The purpose phrase does not change who asks for remote-access installation today. |
| RD | GC | No | Fraudsters are the subject of the reported gift-card request; the sender makes no demand. |
| RD | CD | No | Fraudsters are the subject of the reported code request; the sender makes no demand. |
| RD | WT | No | The wire transfer and its timing are both inside the reported request, not the sender’s demand. |
| RD | RA | No | The installation and its timing are both inside the reported request, not the sender’s demand. |
| TW | GC | Yes | A warning after the sender’s gift-card request cannot retroactively report it. |
| TW | CD | Yes | A warning after the sender’s disclosure request cannot retroactively report it. |
| TW | WT | Yes | A trailing warning cannot erase the sender’s pressured wire-transfer demand. |
| TW | RA | Yes | A trailing warning cannot erase the sender’s pressured remote-access demand. |

WF means warning first, PC means purpose clause, RD means reported demand, and
TW means trailing warning. The frozen contract is
`SPEC = { WF: true, PC: true, RD: false, TW: true }`. Its verdict precedence is:

1. A sender demand produces exactly its family finding and **Suspicious**,
   regardless of record state. An approved record must never erase that demand.
2. No sender demand plus an approved record produces no findings and **Details Match**.
3. No sender demand with any other record state produces no findings and
   **Insufficient Evidence**.

| Family | Fixture finding ID | Existing engine representations |
| --- | --- | --- |
| GC | `gift_card_demand` | `T1-GIFT`, `gift_card_payment`, `gift_card_disclosure` |
| CD | `code_request` | `T1-CODE`, `share_code` |
| WT | `wire_demand` | `T1-WIRE`, `crypto_or_wire` |
| RA | `remote_access` | `T1-REMOTE`, `remote_access` |

The fixture uses the requested family IDs. The shared setup maps the engine's
existing IDs to those names and deduplicates Tier 1 evidence and its display
flag. It retains unexpected families, unknown IDs and unresolved evidence, so
they fail the exact finding comparison. Verdicts are checked independently:
a wire flag without Tier 1 pressure cannot satisfy a Suspicious expectation.
Every generated demand includes “today”; the wire/remote-access tier threshold
has not changed. The setup uses fictional reference records and no policies.

### Generation and records

`tests/reporting-scope/fixture.json` contains `rows` (384 generated cases) and
`hand_rows` (18 authored cases). Generated IDs are
`${context}-${family}-${variant}-${record_state}`. Hand rows retain their review
IDs, such as OWN1 and W1. Every row has explicit findings, verdict and
`known_limitation: null`; none are skipped or treated as expected failures.

For each of the 16 cells, nine boundary variants and two wrap variants run with
both `none` and `approved` records. Only the dot variant adds `rejected` and
`expired`: `(9 + 2) × 2 + 2 = 24` rows per cell, or **384** total. Boundary values
are dot `. `, semi `; `, colon `: `, dash `, `, excl `! `, none ` `, LF, blank
line and CRLF. Boundary rows set `{W}` to a space; wrap rows set `{B}` to `.` and
`{W}` to LF or CRLF. A space in each template after `{B}` prevents words from
joining into accidental domains. Every template includes Chase and the same
`https://chase.com` link placeholder. Each family uses separate vocabulary.
WF includes the literal cue “Beware of hackers”; an alarm alone is not a cue.

The fixture supplies the frozen evaluation date **2026-10-12** to the shared
Node/browser setup. The approved record expires on 2026-12-31; the expired
record expired on 2026-10-11; the rejected record is explicitly rejected and
`none` has no contact record. Host clocks cannot change these outcomes.

Run the offline generator only when deliberately reviewing spec or wording
changes:

```sh
node scripts/generate-reporting-scope.cjs
node scripts/generate-reporting-scope.cjs --check
```

Neither test runner imports the spec, templates or generator. Node reads the
checked-in JSON; the browser fetches that same file. Tests do not regenerate it.
The engine is checked against the frozen spec; a disagreement fails the test.
Never relabel a row from observed engine output.

### Execution checklist and evidence

- [x] Write 16 decisions and reasons, templates, generator and checked-in JSON.
- [x] Inspect 20 randomly selected rows for meaning changes; correct wording,
  not expectations. See [manual review](../testing/reporting-scope-results/manual-review.md).
- [x] Record every failure before engine changes in
  [baseline.json](../testing/reporting-scope-results/baseline.json).
- [x] Correct accidental joined words in wrap templates and complete OWN7–8;
  record [the corrected-template baseline](../testing/reporting-scope-results/baseline-corrected-templates.json)
  against unchanged release engine `f66029b` (139/402).
- [x] Widen `directAction` after the subject check; retain negation, quoted
  examples and pressure thresholds. Preserve the existing coordinated warning.
- [x] Verify OWN1–8, W1–4, legitimate controls and earlier regressions.
- [x] Report counts for all 16 cells and each hand-row group in
  [final.json](../testing/reporting-scope-results/final.json).

The corrected baseline contains all 263 failures, fixture and engine hashes,
the frozen date and per-group counts. The initial baseline is retained as well:
it had 400 rows before the template correction and two additional positive OWN
cases. No existing expectation was changed; the old OWN7–8 texts remain quiet
as NEG-REPORT and NEG-ASK. Their IDs moved because they describe a reported or
negated request, whereas the OWN group is now reserved for sender demands.

All templates share one author and a small set of wording patterns. The variants
are correlated, not independent samples of real messages. A perfect **384/384
suite pass rate** does not replace real-message collection (**Task 11**) or
estimate performance on messages from the public. The matrix isolates reporting
scope; it does not cover sender attribution, all policies, all English grammar,
or every possible location of an SMS wrap. The `sender.js` weakness above remains.
