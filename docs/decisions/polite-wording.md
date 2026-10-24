# Decision: courtesy words in front of an instruction

Status: **done in engine 0.4.2, on `final-site`.** Prepared Oct 23, 2026.

## The defect

The rules read "Please send the payment by wire transfer" as an instruction, but not "Kindly send",
"Just send" or "Please just send". The check that decides whether a verb is an instruction to the
reader allowed exactly one courtesy word, "please", in front of the verb. The same narrow check sat
inside the asking form ("needs you to please download" was caught, "needs you to just download" was
not) and in the longer polite forms ("Would you be so kind as to send", "I'd appreciate it if you
could send").

Found by the rewrite robustness run (`adversarial/`, [decision](robustness-rewrites.md)). It was
first confirmed straight against the engine, not only through the tool:

| Message | 0.4.1 | 0.4.2 |
| --- | --- | --- |
| "…overdue. **Please send** the payment by wire transfer today to avoid arrest." | Suspicious (T1-WIRE) | Suspicious (T1-WIRE) |
| "…overdue. **Kindly send** the payment by wire transfer today…" | Insufficient Evidence | Suspicious (T1-WIRE) |
| "…overdue. **Just send** the payment by wire transfer today…" | Insufficient Evidence | Suspicious (T1-WIRE) |
| "Grandma, I am in trouble. **Kindly buy** 3 Apple gift cards and send me the codes." | Insufficient Evidence | Suspicious (T1-GIFT) |
| "Our technician needs you to **just download** AnyDesk now." | Insufficient Evidence | Suspicious (T1-REMOTE) |

## The fix

`js/engine/risk.js`, `directAction`: a run of courtesy words (please, kindly, just) right before the
verb is read as "please", but **only where an instruction can begin**: at the start of a sentence,
after a colon, comma or semicolon, after "you to", or after "you must", "could you" and similar. So
"I just sent the payment" and "They kindly sent the receipt" keep their subject and stay statements.
"Would you be so kind as to" and "I'd appreciate it if you could" are read as "could you".
`askingBefore`, `NEED_COMPLEMENT` and `OWN_NEED` accept the same courtesy words, and "kindly"
joins the words a negation reaches past ("never kindly send" is still negated).

Nothing else changed. The fix only makes these forms behave the way "please" already did.

## How it is tested

`tests/polite-wording-cases.js` (24 checks, in `npm test` and `tests/run.html`).

- **Pairs (PW01–PW10).** Each "Please" message must itself be Suspicious with the named rule, so a
  pair can never pass by both sides being quiet. Every courtesy variant must then give exactly the
  same verdict, the same Tier 1 rules and the same wording flags. Covers all five Tier 1 request
  rules that "please" reaches (gift card, code, remote access, wire, callback), the address form
  ("Grandma, kindly buy"), the asking forms, and a text message wrapped right after the courtesy word.
- **Controls (PW20–PW33)** must stay not Suspicious with no Tier 1 rule:
  - ordinary requests and advice ("Kindly call the number on the back of your card");
  - negated ("Never kindly send money by wire transfer", "We will never ask you to kindly read us a code");
  - quoted ("Scammers say: “Kindly buy 3 Apple gift cards…”");
  - reported ("Fraudsters may ask you to kindly install AnyDesk");
  - a subject before the word ("I just sent the payment by wire transfer", "They kindly sent us the
    wire transfer receipt", "I went to the bank and just sent…", "I want to just send you the
    birthday money by wire transfer").

All ten pair tests failed before the fix. All controls passed both before and after it.

## Results on the rewrite run

Published settings: generator seed 20261023, depth 3, budget 500 per seed, reference date
2026-10-22, reference list 2026-10-18-five-org-draft. Same 4,000 fraud and 3,477 legitimate rewrites.

| | Engine 0.4.1 | Engine 0.4.2 |
| --- | --- | --- |
| Fraud rewrites that escaped Suspicious | 669/4000 | **469/4000** |
| Rewrites with the politeness change that escaped | 222/380 | **22/380** |
| Fraud seeds with at least one escape | 7/8 | 7/8 |
| Rewrites that escape now but did not before | — | **0** |
| Legitimate rewrites that became Suspicious | 12/3477 | 12/3477 (the same 12) |
| Legitimate rewrites given a new Tier 2 warning | 6/3477 | 7/3477 |
| Fraud rewrites reaching Details Match | 0 | 0 |

The new Tier 2 warning is "USPS: … **Just** give the delivery code to the driver…", which now gets
the warning that "**Please** give the delivery code…" already got. That warning on delivery codes is
an existing nuisance (listed below), not a new kind of error.

Each of the 22 remaining politeness escapes also contains another change that is not fixed: two
clauses joined with ", and", a synonym ("forward", "phone"), a dash, a wrapped line or a warning
sentence in front. The seed count does not move, because escapes from those other causes remain on
the same seeds. These rates are counts over related rewrites of 8 seed messages, not estimates (see
[robustness-rewrites.md](robustness-rewrites.md)); the seed count is the independent unit.

## Known failures, tracked one by one

`adversarial/known-failures.json` lists every rewrite that still fails at the published settings:
469 escapes and 12 false alarms, with the engine version, reference list and generator fingerprints
they were made with. `tests/adversarial-known-node.cjs` (in `npm test`) regenerates the run and fails if:

- a fraud rewrite escapes that is not on the list (a regression);
- a legitimate rewrite becomes Suspicious that is not on the list;
- a listed item no longer fails (the list is stale; an entry left after its fix would hide the same
  failure if it came back);
- any fraud rewrite reaches Details Match;
- the generator differs from the one the list was made with.

The check was confirmed to work both ways: on engine 0.4.1 it reproduces 669 escapes and 12 false
alarms, and with the fix switched off it fails with 145 new escapes. After a deliberate rule change,
`npm run robustness:known` regenerates the list; say in the change's decision note what moved.

Not fixed, and on the list:

| Cause | Escapes containing it | Example |
| --- | --- | --- |
| Two clauses joined with ", and" | 179 | "…is overdue, and send the payment by wire transfer" |
| Synonym verbs | 130 | "Forward the payment by wire", "Phone this toll-free number" |
| Comma or dash instead of a full stop | 112 | "…is overdue, send the payment by wire transfer" |
| Purpose clause | 89 | "For your protection against scam texts, send the payment by wire transfer" |
| Line wraps in pasted text (not screenshots) | 85 | "…send the payment by\nwire transfer today" |
| Two seeds never caught at all | — | "Share the one-time passcode…" (T1-CODE), "convert the balance to bitcoin…" (T1-WIRE) |
| False alarms on two legitimate messages | 12 (7 USPS delivery code, 5 Chase fraud warning) | a wrapped line or a lookalike letter ("delivery сode" with a Cyrillic с) defeats the exemption |

A rewrite can contain several causes, so the counts overlap.

## Keeping these messages out of the held-out test

Every message used here has been looked at while changing rules, so it is dev material.
`eval/exposed-elsewhere.cjs` collects the seed messages, every listed failure and every
polite-wording case, and `eval/test-access.cjs` refuses a test row that matches any of them, using
the same fingerprint as the dev-exposure ledger (test E23). That catches exact and near-exact
copies only. A reworded relative of one of these messages is still the same family and still
belongs in dev. Catching those is the human family review's job.

## Limits

- The fix and its tests come from one generated rewrite list and hand-written cases. They show that
  courtesy words no longer hide these requests. They say nothing about how often real scams use them.
- "Just" is ambiguous. Where it follows a subject ("I just sent") it is not read as a courtesy word.
  A message that starts with "Just" as an instruction to someone other than the reader would be
  read as an instruction to the reader, the same way "Please" already is.
- Rates are tied to engine 0.4.2 and the published generator settings. They are not comparable to
  any other engine version or setting.
