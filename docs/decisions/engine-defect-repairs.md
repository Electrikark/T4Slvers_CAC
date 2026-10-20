# Engine defect repairs (R1–R6)

An inspection found six engine and wording defects and confirmed each one by running
the engine. Each repair started with a failing test whose expectation was decided by
hand. The tests are in [repair-cases.js](../../tests/repair-cases.js), which runs in both
the Node and browser runners. The gate (`src/assessment.js`), the Tier 1 rule list, the
store's review status and the USPS policy were not changed.

## Initial failures

Before any fix, each new group failed at least one test. The suite otherwise passed.

| Group | First failure |
| --- | --- |
| R1 | `secrecy` flagged for "Your verification code is 482913. Do not share this with anyone." |
| R2 | No soft wording for medicaid.gov; it got "Do not open or reply to" and "an address refers to Medicare". |
| R3 | "Grandma, buy me gift cards for my birthday and text me the codes": Insufficient Evidence. With an approved chase.com record and a "Chase:" label, the same demand was **Details Match**. |
| R4 | "Amazon asks you to read the code back to us.": no T1-CODE, in either store. |
| R5 | "Chase: sign in at https://chаse.com" (Cyrillic а): no T1-DOMAIN annotation note. |
| R6 | "Call +44 20 7946 0958": the only check was `nothing_to_check`. |

All six groups now pass, and so does every existing check in `npm test`: gate parity,
boundaries, the 810-row scope matrix and the evaluation harness tests.

## Changes

**R1. Code advice is not secrecy** (`js/engine/risk.js`, `notCodeAdvice`). "Share this with"
and "mention this/it to" are not counted as `secrecy` when this clause, before the phrase,
or the clause just before it names a code, PIN, OTP, passcode or password. "Don't tell Mom",
"keep this between us" and an unrelated "Do not share this with anyone" still get the flag.
A code mentioned two sentences earlier does not stop it.

**R2. Similar addresses** (`js/engine/copy.js` `warnings()`, `js/engine/aggregate.js`).
The domain rules are unchanged. medicaid.gov, mymedicare.gov and usmobile.com are still
typosquats, and connect.comcast.net still gets `same_label_other_tld`.
- "Do not open or reply to X" is now shown only for an address with a T1-DOMAIN finding.
  Other strong lookalikes get: "X looks similar to Y. We can’t tell whether it belongs to them."
- Only a SUPPORTS check can name an implicit sender now. A lookalike only resembles an
  organization, so it no longer produces "an address refers to Medicare" or the advice
  "Contact Medicare…".
- comcast.net was **not** added to Xfinity's domains, because no primary source is recorded.
  It remains in `freeMailDomains`, for email addresses only.

**R3. Addressed requests** (`risk.js`, `directAction`). An instruction now also counts when
the whole prefix of its clause is an address: a family term ("Grandma,", "Hi Mom,") or one
capitalized name ("Maria,"). The address must be the entire prefix, so a comma later in
the sentence never starts an instruction. Negation and reporting are checked first, as
before. The gift-card antecedent and source spans are verified with both absent and
approved records ([grandparent-opener-task.md](../testing/grandparent-opener-task.md)).

**R4. Named askers** (`risk.js`, `senderAsker`). The literal `'chase'` was removed. An asker is
recognized when it is the message's own label or a name on the organization list (aliases
and strict aliases). `aggregate.js` passes `store.orgs` to `sourceSignals`. As in `sender.js`,
strict aliases ("Chase", "Apple", "Citi") count only when capitalized.

**R5. Annotations** (`js/annotate.js`). `sourceTargets` reads lookalike letters as Latin, but
the check read the pasted characters (`xn--chse-63d.com`). Each pasted contact span is now read
again with the same normalization and extraction the check used, then matched by that
reading. The homoglyph message was added to the annotation `SAMPLES`.

**R6. Unreadable phone numbers** (`js/engine/extract.js`, `domain.js`, `evidence.js`, `copy.js`).
Numbers with another country's code (`+44 …`, 8–15 digits) and numbers with letters
(`1-800-ASK-USPS`, 7 characters after the area code) become phone contacts with
`error: 'unsupported'`. `checkPhone` returns `UNKNOWN` / `phone_unreadable` and compares the
number with no list. The evidence records `extraction_failed`, so Details Match stays
blocked. The page says the number could not be read. It no longer says the message has no
number. U.S. numbers, codes, amounts, ZIP+4 codes and dates are unchanged.

## Changed expectations

No existing expectation was changed. One sample was added to the annotation `SAMPLES`.

These behavior changes were not covered by an existing test:
- Lowercase "chase asks you to …" no longer names an asker, because Chase is a strict
  alias in the real list. A named asker must also be on the list in use.
- If a message names no sender and its only address is a lookalike such as chаse.com, the
  next steps no longer name the imitated organization. The strong warning is still shown.
- The soft wording also covers strong `brand_in_foreign_domain` addresses without a lure
  word (for example paypal-help.com). These were already Tier 2.

## Remaining gaps (not fixed)

- The typosquat detail line still says "Copycat sites use small spelling changes".
- T1-CALLBACK still recognizes only U.S. digit numbers in "call …".
- National formats without `+` (`020 7946 0958`) are not extracted.
- "Aunt Sue," and other multi-word addresses are not recognized as openers.
- "Your code is 1234. Don't tell anyone." still gets `secrecy` ("tell" was left unchanged).
- The dated scope snapshots were not regenerated. FOLLOWUP-GRANDPARENT in
  `tier2-review-known-gaps.json` now passes. KNOWN-DEPOSIT is still open.
