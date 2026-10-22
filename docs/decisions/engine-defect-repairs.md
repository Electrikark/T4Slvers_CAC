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

# Second pass (A1–A5, B1–B11)

A second inspection reviewed this branch and `release-v1`. Each item again started with a
failing test with a hand-decided expectation. The tests are in
[repair2-cases.js](../../tests/repair2-cases.js), and the groups are named by item ID. The
page checks for B7 and B9 read files, so they run only in Node (`tests/run-node.cjs`, "Page
copy and contrast").

## Initial failures

Twelve groups failed before any fix. A5 and B10 passed from the start, because those items
add coverage; neither was a defect. A1 had "two letters away… Copycat sites" and "does not
match our stored list". A2 left "The IRS asks you to pay … with gift cards" quiet. A3 missed
1-800-Flowers. A4 made "300 XK4 9921" a phone number. B1 flagged arrest_threat on the SSA
advice. B2 found no link in microsoft-office-renew.zip. B3 used "still needs review" for
every reason and showed the automated status after a human review; DMV was excluded as
`ambiguous_scope`. B4 gave Insufficient Evidence. B5 flagged `crypto_or_wire` on "Deposit
received". B6 took 5,623 ms (about 6.0 s standalone). B7 had no English-only line. B8 showed
the raw email. B9 measured 1.62:1 and 2.05:1 and had no check mark.

## Changes

- **A1** (`copy.js`): when a typosquat, same-name-other-ending or brand-name check is not an
  address trick (`T.isDomainTrick`, now exported from `evidence.js`), the detail reads "X is
  similar to Y. We can’t tell whether it belongs to them." If every conflict is of this kind,
  the description says the address is similar to one on our list. The wording is unchanged for
  T1-DOMAIN tricks and other-organization conflicts.
- **A2** (`risk.js`): `senderAsker` drops a leading "the" or "your" before comparing the asker
  with the list. Reporting ("Scammers posing as the IRS") and conditional ("If the IRS") askers
  stay quiet.
- **A3/A4** (`extract.js`): numbers with letters must start with a toll-free area code (800,
  833, 844, 855, 866, 877, 888). Seven letters and digits must follow, including three letters
  in a row. Lowercase letters also need a dash or dot after the area code. "1-800-Flowers" is
  read, while "300 XK4 9921", "800 Clients" and "800 Main St." are not.
- **A5, decided: keep.** An imperative after a capitalized word and a comma still counts as a
  request to the reader. "Yes, send me the code" is T1-CODE: a code request from an unknown
  sender is the pattern T1-CODE exists for, whatever word comes first. Negation, reporting and
  unfamiliar askers are checked before the opener, so "Note, scammers may ask you to send the
  code", "Remember, never send the code", "Reminder, we will never ask…" and "Warning,
  criminals ask…" stay quiet. These are now tests.
- **B1** (`risk.js`, `notThreatAdvice`): `arrest_threat` is skipped when a negation or a
  reporting subject (scammers, fraudsters, criminals, imposters) comes earlier in the same part
  of the sentence. A condition ("If you do not pay a warrant will be issued") or a new
  consequence ("…or you will be arrested") still counts. "Arrest or deportation" is one object.
- **B2** (`extract.js`): `.zip`, `.mov` and `.md` are both file endings and domain endings. A
  token with one of these endings is checked as a website only when "at", "visit", "go to",
  "website", "site", "link", "tap" or "click" comes before it, or when it has a path or a
  subdomain. "photos.zip", "holiday-photos.zip", "README.md" and "saved it as clip.mov" stay
  quiet. microsoft-office-renew.zip is now checked and gives `brand_in_foreign_domain`.
  It stays Tier 2, because "renew" is not a lure word.
- **B3** (`trusted.js` `exclusionReason`, `domain.js`, `copy.js`): `reference_needs_review`
  checks now carry the trusted view's `reason`, and the detail is worded to match. The words
  are "still needs review", "the review of that record has expired", "that record’s scope is
  unclear", "also for another organization" or "missing review details". The code stays
  `reference_needs_review`. When a record was reviewed but is excluded, the explanation no
  longer says it was never reviewed. "About this check" shows "Reviewed by … on …" when
  `humanReview` exists. `ca.gov` is now a two-part ending in `domain.js`, so a reviewed
  dmv.ca.gov or edd.ca.gov record supports its contact. Before this, both were excluded as
  `ambiguous_scope` because `registrable()` read them as ca.gov.
- **B4** (`evidence.js` `brandLure`, `domain.js` exports `skeleton`): the brand part of the
  address is read the same way the brand match read it. As a result, amaz0n-secure.com with
  the lure word "secure" is T1-DOMAIN, while amaz0n-deals.com stays Tier 2.
- **B5** (`risk.js` `NOTICE`): an action word followed by what already happened is not an
  instruction. Examples are "Deposit received", "Transfer completed" and "Deposit of $500 by
  wire received". "Deposit $500 by wire today" is still flagged. KNOWN-DEPOSIT moved from the
  open diagnostics into the passing scope fixture as a new NOTICE group (`hand-cases.cjs`,
  regenerated `fixture.json`). The group has two Details Match notices and one demand control.
- **B6** (`risk.js`): `askingBefore`, `senderAsker` and `reportingSubject` now look back 200
  characters. `reportedAt` reads the last 500 characters of its sentence segment and finds a
  later "you must" once per call, not once per asking verb. The 20,000-character input now
  takes about 140 ms instead of 6.0 s. No existing result changed. The invariant is 1.5 s.
- **B7** (`index.html`): the input hint now ends "This checker reads messages written in
  English."
- **B8** (`copy.js` `shown`): an email whose domain has lookalike letters shows
  `support@chаse.com (support@xn--chse-63d.com)`.
- **B9** (`css/styles.css`): the channel, message-box and self-check borders are now
  `#768a7a`. That is 3.69:1 on white and 3.62:1 on the message box's background, where the
  old colors were 1.62:1 and 2.05:1. A selected channel or self-check choice shows "✓", with
  empty alternative text because `aria-pressed` already announces the state.
- **B10**: every demo now has a hand-decided verdict (`bank`, `code`, `support`, `toll` and
  `family` are Suspicious; `phone` and `delivery` are Insufficient Evidence). A real-list case
  covers lowercase "chase" naming no sender. A comment notes that the fixture store treats
  "chase" as a plain alias.
- **A6/B11** (`README.md`): the totals are now 1,208 shared checks and 1,261 checks in
  `npm test`. The review paragraph matches `trusted.js`, including `reviewDue` and a source.
  The Tier 1 list includes T1-POLICY. The gate cases are U1–U15. The changed behavior is
  described. The dated totals in other decision notes (1,155 and 1,214) are records of earlier
  runs and were left as they are.

## Changed expectations

- **R16** (`tests/real-store-cases.js`) changed from `insufficient_evidence` to `suspicious`
  with rule `T1-DOMAIN` (B4).
- The scope matrix gains a NOTICE group: 813 rows, up from 810, with 45 hand rows. No existing
  row's expectation changed.

These behavior changes were not covered by an existing test:
- A bare `name.mov` token with no website cue is now treated as a file name. It used to be
  checked as a link (B2).
- "Yes, send me the code" and similar openers are T1-CODE. They were quiet before R3, and A5
  keeps it that way on purpose.

## Still open

- National phone formats without `+` (`020 7946 0958`) are not extracted.
- T1-CALLBACK still needs a U.S. digit number.
- Lettered numbers on area codes that are not toll-free are not read.
- Other state `*.gov` two-part names (`ny.gov` and so on) are not in the suffix list.
- The USPS policy (F25), store reviews, and the Tier 1 calibration for crypto or AnyDesk
  requests without urgency were out of scope.
