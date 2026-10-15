# Reporting scope

## Failure and repair

At `af93e3e`, `risk.js` treated an entire clause as reported when a reporting
cue occurred anywhere in it. Thus “To avoid fraudsters, pay with gift cards”
and “Pay with gift cards today, beware of fraudsters” could lose their findings.
The repair in `745f577` introduced `reportedAt(clauseText, demandIndex)` so
reporting is checked at each demand and at supporting pressure/antecedents.

The later asking expansion introduced a separate regression: it treated any
unrecognized asker as the sender. W5–W10 reproduce ordinary safety warnings
that became Suspicious. Their quiet expectations were written first, and every
failure was saved before the sender-subject change.

## Current decision: recognize the sender positively

An indirect asking complement establishes a sender demand only if its subject
is **we, I, our team, Chase, or the organization label at the start of the
message**. A label is a claimed identity, not proof of authenticity. Named
subjects must begin a statement; “Scammers posing as Chase ask…” does not make
Chase the asker. Conditional first-person subjects and descriptions such as
“posing as our team” are excluded. An unfamiliar asker stays quiet, including
when “please” is inside that asking complement. A separately stated direct
instruction is still evaluated normally.

`askingBefore` identifies an asking complement immediately before an action:
“ask you to,” “tell you that you must,” “demand that you,” or “request:”. It
recognizes ask, tell, demand, request, instruct, urge, pressure and want, their
-s/-ing forms, pronouns and the recipient nouns victims/seniors/customers.
It locates syntax; it no longer establishes sender ownership by itself.
`OWN_NEED` separately recognizes “we/I need you to,” which is not an asking verb.

Existing reporting-subject patterns remain for reporting scope and supporting
evidence. The cue must be the **subject of the asking verb**, not just an earlier
word. Bounded descriptions, optional “who calls/texts,” and a closed set of
modals/adverbs are supported. Unknown subjects no longer require expanding that
list to avoid becoming sender demands. `ALARM_COORDINATION` preserves the
existing “Fraudsters may say your computer is infected and ask…” warning; a new
“and we ask…” subject breaks the link. The alarm remains an existing Tier 2
flag, while the reported callback does not establish T1-CALLBACK.

Commas and connectors such as “so,” “because,” “since,” “but,” “however” and
“instead” end the reach of an unquoted report. A fresh “you must/need to/have
to/should” after the complement starts a new instruction. A trailing warning
cannot retroactively explain away a demand. Negated asking remains quiet.
The existing `inReport` quote handling is unchanged.

The newline exception preserves an unfinished asking complement across LF or
CRLF, so “Fraudsters may ask you to\npay…” does not turn into a bare command.
Original source offsets remain intact. Other sentence boundaries still split
clauses. Bare requests after short “Beware of…” or “To avoid…” prefaces now
accept comma, colon or no punctuation; this additional instruction-recognition
change is counted separately from the original scope repair.

## Sixteen hand-decided decisions

Layer 1 is `tests/reporting-scope/spec.cjs`; layer 2 is wording in
`templates.cjs`; layer 3 is `scripts/generate-reporting-scope.cjs`. None of these
loads the app or obtains expected values from observed results.

| Context | Family | Sender's own demand? | Reason |
| --- | --- | --- | --- |
| WF | GC | Yes | A warning before the sender asks for gift-card payment does not report that payment. |
| WF | CD | Yes | A warning before the sender asks for a verification code does not report that disclosure. |
| WF | WT | Yes | A warning before the sender demands a wire transfer today does not cancel the pressured transfer. |
| WF | RA | Yes | A warning before the sender demands remote-access installation today does not cancel that demand. |
| PC | GC | Yes | Avoiding fraudsters is the stated purpose of the sender’s gift-card demand, not an asking subject. |
| PC | CD | Yes | Avoiding fraudsters is background; the sender still asks the reader to disclose a code. |
| PC | WT | Yes | The purpose phrase does not change who asks for the wire transfer today. |
| PC | RA | Yes | The purpose phrase does not change who asks for remote-access installation today. |
| RD | GC | No | The sender describes or quotes fraudsters’ gift-card request, rather than making that demand. |
| RD | CD | No | The sender describes or quotes fraudsters’ code request, rather than making that demand. |
| RD | WT | No | The transfer and its timing are inside a reported or quoted request, not the sender’s demand. |
| RD | RA | No | The installation and timing are inside a reported or quoted request, not the sender’s demand. |
| TW | GC | Yes | A warning after the sender’s gift-card request cannot retroactively report it. |
| TW | CD | Yes | A warning after the sender’s disclosure request cannot retroactively report it. |
| TW | WT | Yes | A trailing warning cannot erase the sender’s pressured wire-transfer demand. |
| TW | RA | Yes | A trailing warning cannot erase the sender’s pressured remote-access demand. |

WF = warning first; PC = purpose clause; RD = reported demand; TW = trailing
warning. The frozen contract is `{ WF: true, PC: true, RD: false, TW: true }`.
The asking RD form describes fraudsters asking; the bare RD form quotes their
imperative as an example. Neither is the sender's own demand.

| Family | Fixture finding ID | Existing engine representations |
| --- | --- | --- |
| GC | `gift_card_demand` | `T1-GIFT`, `gift_card_payment`, `gift_card_disclosure` |
| CD | `code_request` | `T1-CODE`, `share_code` |
| WT | `wire_demand` | `T1-WIRE`, `crypto_or_wire` |
| RA | `remote_access` | `T1-REMOTE`, `remote_access` |

Verdict precedence is fixed:

1. A sender demand produces exactly its family finding and **Suspicious**,
   regardless of record state. An approved record must never erase it.
2. No sender demand with an approved record produces no findings and **Details Match**.
3. No sender demand with any other record state produces no findings and
   **Insufficient Evidence**.

The shared adapter maps existing engine IDs to the fixture's family names and
deduplicates Tier 1 evidence and its display flag. Unexpected families, unknown
IDs and unresolved evidence remain visible and fail the comparison. Verdicts
are asserted independently. Generated demands include “today” so wire and
remote-access cases qualify for Tier 1. The existing wire case “Criminals are
active, so send the fee by wire” has no pressure: its Tier 2 finding and
Insufficient Evidence expectation remain unchanged.

## Fixture shape and variety

The original 384 rows represented **16 sentences × 11 surface variants**, with
record states providing repeated wording and different verdict eligibility.
The expanded fixture uses **32 sentences**: asking and bare forms for each of
16 decisions. Each gets nine boundaries and two wraps with none/approved
records, plus rejected/expired only for dot: `32 × ((11 × 2) + 2) = 768` rows.
There are another 24 hand rows: OWN1–8, W1–10, four legitimate controls and two
negation/reporting controls. All are read from one checked-in JSON fixture.

Generated IDs include form: `context-family-form-variant-record_state`.
All rows retain explicit expectations and `known_limitation: null`; none are
skipped. Boundaries are dot, semi, colon, **comma**, excl, none, LF, blank and
CRLF. The old name “dash” for a comma was incorrect and has been renamed;
there is no em-dash variant in this matrix.

All templates contain `{B}`, `{W}`, Chase and the same `{LINK}` substitution,
`https://chase.com`. Family vocabulary stays separate. Every WF template
contains the literal cue “Beware of hackers.” For boundary variants W is a
space; for wrap variants B is a dot and W is LF/CRLF. W precedes the action
verb: after the complement in asking forms, at the start of the imperative in
bare forms. These do not test wrapping inside an object phrase. A literal space
after B prevents accidental bare domains such as `today.Beware`.

Shared setup requires the frozen date **2026-10-12**. The approved fictional
record expires on 2026-12-31, the expired one on 2026-10-11, the rejected one
is explicitly rejected, and none has no contact record. No policies are loaded.
Node reads the JSON; the browser fetches it over HTTP. Neither regenerates it.
The spec wins over the engine: disagreements are test failures, not relabeling.

## Expectations, bias and limits

One existing guard expectation changed: RS25's “Fraudsters appear to ask you
to please pay…” now stays quiet because an unrecognized asking subject is not
positive evidence of a sender demand. This follows the revised contract, not
an attempt to fit observed output. All generated expectations remain frozen.
The old quiet OWN7–8 texts remain NEG-REPORT/NEG-ASK; their replacement OWN texts
are genuine code and remote-access requests. W10 completes the reviewer's
ellipsis with “pay with gift cards.”

Direct risky instructions survive nearby safety language. Indirect requests
need a recognized sender subject. This balances detecting demands with avoiding
false alarms on ordinary bank warnings—an especially important distinction
when seniors use the tool to understand advice they receive. Quiet still does
not mean authentic. The allowlist can miss indirect demands from unrecognized
senders; that tradeoff is deliberate and requires real-message evaluation.

This is bounded English pattern matching. Nested speech, uncommon descriptions,
parenthetical commas and other wrap positions can still be misread. All
**templates share one author** and surface variants are correlated. A perfect
**768/768 suite pass rate** does not replace real-message collection in **Task 11**.
`sender.js` still rejects some sender claims when a reporting cue occurs in
the same clause; it remains unchanged. No organization facts, policy records
or trusted-reference data were added.

## Execution checklist

- [x] Write W5–W10 quiet expectations and save all six pre-fix failures.
- [x] Require a sender subject for indirect asking; rerun the existing suite.
- [x] Add bare forms, rename comma, regenerate offline and inspect wording.
- [x] Save full baselines against unchanged `af93e3e` and `f66029b` using the
  same expanded fixture; distinguish scope gains from OWN and preface gains.
- [x] Save the 40 new bare-preface failures before fixing recognition.
- [x] Keep all fixture expectations fixed and document the single RS25 change.
- [x] Record counts by form × context × family and each hand group in the
  [results report](../testing/reporting-scope-results/README.md).
- [x] Pass 1,130 shared checks on Node 22, Node 24 and Chromium, plus Node-only
  parity, boundary and evaluation checks before merging into release-v1.

Run `npm test` and serve `tests/run.html` over HTTP for the shared suite.
Run `node scripts/run-reporting-scope.cjs` for the suite pass rate. The offline
`node scripts/generate-reporting-scope.cjs --check` checks the committed fixture
separately from tests. See the [hand-row matrix](../testing/task-3-matrix.md).

## Technical challenge video: revised narration

The video stays outside Git. The earlier recording should not be presented as
covering this revision; an updated recording and unlisted upload remain pending.
Use this corrected narration rather than the old OWN-heavy before/after claim:

> “Fraudsters may ask you to pay with gift cards” describes someone else's
> request. “To avoid fraudsters, pay with gift cards” directly asks you to act.
> The repair checks each demand instead of ignoring a whole clause containing
> a warning word. We also learned that an unfamiliar asker must not automatically
> count as the sender: ordinary advice like “If someone asks you to pay, hang up”
> needs to stay quiet.
>
> We tested 32 sentence templates in 11 surface forms and repeated them across
> record states. That produces 768 generated rows, not 768 independently written
> messages. On the bare-imperative subset, the pre-repair engine passed 312 of
> 384; the original scope repair passed 344. Recognizing short warning prefaces
> brought it to 384. The asking subset separately checks sender-request and
> line-wrap behavior. These are suite pass rates, not real-world success rates;
> we still need real messages for Task 11.
