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
Any other intervening words, including a new subject such as “we,” “Chase” or
“our team,” break the link.

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

The separate gap in first- and third-person requests without “please” remains
open. The [task 3 matrix](../testing/task-3-matrix.md) now has a dedicated
**sender's own request** family; this repair does not widen that instruction
recognition.

`sender.js` still rejects a sender name when a reporting cue occurs anywhere in
the name's clause. That separate weakness can hide a genuine sender claim in
mixed warning/request text. It is unchanged here. No organization facts,
trusted-list entries, or policy requirements were added.

## Validation and expectations

`tests/scope-cases.js` registers eight core cases plus 25 guards in both the
Node and browser runners. The guards cover asking forms, negation, quoted
examples, multiple demands, source spans, pressure, antecedents and the Chase
example, plus asking subjects and introductory phrases. Existing test
expectations are unchanged. The wire cases explicitly
distinguish a Tier 2 finding from a pressure-qualified Tier 1 finding.

Run `npm test` for the shared tests, generated-gate freshness, boundary checks,
source-gate parity and evaluation harness. Open `tests/run.html` in a browser
for the same 334 shared checks. These checks establish rule behavior, not
field accuracy.

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
