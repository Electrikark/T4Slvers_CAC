# Tech for Silvers

A local text-only workshop prototype. Plain HTML, CSS, and JavaScript; no package install, build step, account, backend, analytics, or external request is needed. This is the active build base for frozen spec v1.2.

The app compares contacts with a stored list and checks fixed English risk patterns. It does not authenticate a sender, read images, follow links, or run AI extraction. Some legacy reference and parsing paths still need repair before release. Matching contact details do not establish that a message is real.

## Run and test

Open `index.html` in a modern browser, or serve this folder locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit `http://localhost:8000`. Visit `/tests/run.html` on that server for browser test results; the page fetches the checked-in JSON fixture over HTTP. With Node installed:

```sh
npm test
# Without npm, run the same dependency-free checks:
node tests/page-scripts.cjs
node scripts/build-assessment.cjs --check
node tests/app-elements.cjs
node tests/run-node.cjs
node tests/eval-tests.cjs
```

Phase 2 adds 58 shared checks in five groups (trusted view A1-A11, sender attribution B1-B11, tier rules C13-C22 with N1, S1-S3, L1-L2, policy records D1-D11, annotations E1-E9), for 301 shared checks. Reporting-scope checks (RS1–RS37), 768 generated matrix rows and 42 hand-written rows, plus seven Tier 2/policy guards, plus eight [reviewed next-step advice checks](docs/decisions/reviewed-next-steps.md), plus two gift-card back-photo checks, bring the total to 1165; see the [reporting-scope decision and execution checklist](docs/decisions/reporting-scope.md). The matrix covers 32 sentence templates in 11 surface variants plus record states, not 768 independent messages. It reads its checked-in JSON; it never generates expectations during tests. Run `node scripts/run-reporting-scope.cjs` for the suite pass rate by context, family and hand-row group. The Node runner also checks all 47 app element IDs against index.html before running the engine suite. There is also a Node-only boundary group: no engine file reads a raw record file, and no file that draws results uses `innerHTML`. Before Phase 2, the recorded eac1229 baseline passed all 111 checks, and there were 243 shared checks, including 14 for the self-check step (S1–S14), 38 for login requests (L1–L38) and 3 for review status (I18–I20): the original 111 (with contract updates), 33 gate and integration checks (U1–U15, E1, I1–I17), and 44 step-1 additions: input robustness and wording (N1–N10), T1-DOMAIN scope (D1–D8), T1-CODE scope (K1–K15), T1-CALLBACK scope (B1–B8), one unresolved card-number case, and two checks that a real website cannot outweigh a Tier 1 request in the same message. The Node runner also runs the 36 gate checks with the source gate and compares its assessment and trace with the browser wrapper. GitHub Actions (`.github/workflows/test.yml`) runs `npm test` on Node 22 and 24 for every pull request and every push to `main`. They test decisions, not field accuracy. The focused group exercises the real engine for C13, C17, C19 and related negative cases. It is not the full C01–C40 conformance pack.

## Field evaluation

The tests above check that rules behave as written; they cannot measure real-world accuracy. `npm run eval` runs a spreadsheet of **real, labeled messages** through the same engine and reference list and reports the false-reassurance count (fraud given Details Match, which must be 0), the catch rate, the "at least paused" rate and the false-alarm rate, each with a 95% Wilson range, plus the rules that fired, results by category, and every miss and false alarm. Messages are split into `dev` (tune rules here) and `test` (report this). See [`eval/README.md`](eval/README.md) for how to collect and label messages. `eval/data/` and `eval/results/` are ignored by git because real messages can contain private details.

## Analysis contract

```js
window.TfsEngine.analyze(text, store, { declaredChannel: 'text' });
// declaredChannel must be 'text', 'email', or 'unknown'.
```

Missing or invalid channel choice is rejected. The form uses large Text / Email / Not sure buttons with none chosen by default. Not sure is valid. The result has engine version 0.4.0 and schema version 3.

- `suspicious`: established Tier 1 takes priority over contact support, missing contacts, and uncertainty.
- `details_match`: an explicit recognized sender, at least one contact verified for that sender, all contacts verified for that sender, and no findings or uncertainty. The adapter preserves legacy contact-verification semantics; this is not full v1.2 conformance.
- `insufficient_evidence`: neither threshold passes. Every finding blocks a match, including Tier 2 and unresolved Tier 1.

**Login requests** ("Log in at…", "please sign in to your account", "click here to log in", "verify your account by signing in") are a Tier 2 finding (`login_request`), so they always block Details Match. Extra spaces, hyphens and line breaks ("Log  in", "Log-in", "Log⏎in") do not hide it. A negation clears it only when nothing between the negation and the login starts a new instruction ("You do not need to visit a branch because you must log in" is still a request). "By/after signing in" counts only inside an instruction ("Verify your account by signing in"), not in a notice ("You last accessed your account by signing in"). "Before/when signing in" frames safety advice ("Please check the address before signing in") and never counts by itself. Signing in through a route the person already trusts ("only through the official app", "a website you already know") is advice; "only through this secure link" is still a request. Sign-in notices ("a new sign-in", "sign-in attempt", "sign in successful"), negated advice ("no need to sign in", "do not click links to log in"), reported examples and signing in at a front desk or office on arrival stay quiet; "the office portal" or "the Office app" is still a login request.

**Review status (stopgap until the trusted reference view).** A reference record supports a contact only when it has `humanReview: { reviewer, date }`: a non-empty reviewer and a real calendar date (`YYYY-MM-DD`, from 2020 up to today; `2026-02-30` or a future date does not count). An automated check alone, which is what every record in `data/store.js` has today, gives `reference_needs_review` instead. Until records are reviewed by a person, Details Match cannot be reached on the real list; that is the intended safe failure. Conflicts and T1-DOMAIN still work, because they do not depend on a record supporting anything. Test fixtures are marked as reviewed by a fictional test fixture.

The gate holds a closed list of Tier 1 rules (`TIER1_RULES`): T1-GIFT, T1-WIRE, T1-REMOTE, T1-DOMAIN, T1-CODE and T1-CALLBACK. A Tier 1 finding with any other rule ID throws instead of winning.

- **T1-DOMAIN** covers address tricks with no innocent reading: text before `@` in a link, an official domain glued to another site (`usps.com-redelivery.top`), lookalike letters (`paypa1.com`, a Cyrillic `а`), and a brand name beside a lure word as separate parts of an address (`chase-secure-login.net`, `fastrak-ca-tolls.com`). Other conflicts stay Tier 2: a brand name alone, the same name with another ending, one-letter differences, and another listed organization's address. Measured against about 70 real domains that listed organizations use but the list lacks, those codes fired 128 times across runs with and without a named sender (`wellsfargoemail.com`, `paypal-prepaid.com`, `facebookmail.com`, `amazon.co.uk`, `uspis.gov`); the T1-DOMAIN subset fired zero times. Country forms such as `amazon.com.au` are no longer read as the glued-domain trick.
- **T1-CODE** covers a direct, unnegated, unreported demand to give a code, PIN, OTP, passcode or password to the requester, including "read it back to me" after a named code. Entering a code yourself, codes with no named requester, promo, confirmation, tracking and gift-card codes (T1-GIFT judges those), codes handed to a driver or cashier, and household codes such as the wifi password stay outside it.
- **T1-CALLBACK** covers the tech-support pattern: a device alarm (infected, hacked, locked, "virus detected") anywhere outside a reporting frame, plus a direct demand to call a phone number, "us", or a named support line. Real security warnings do not include a number to call. A call request with no device alarm, a health "virus", and calling a number you already trust (the back of your card) stay outside it.

`assessment` is the sole verdict. `trace` is returned unchanged by `assess(evidence)`; it holds winning rule IDs or blocker codes. There is no separate `state` or `decision` field. Only `js/app.js` maps canonical values to visible labels, symbols, and existing CSS classes. Risk severity can decorate advice but cannot change the label.

`evidence` retains sender identity, contacts with organization IDs and original supporting checks, normalized findings, and uncertainty. Findings preserve rule support and existing raw spans. Contact extraction supplies no offsets, so conflict spans stay `null` with explicit uncertainty. Missing contacts stay empty. Inferred senders have a null sender ID and `inferred_sender` uncertainty. `requestRisk` and rendered `checks` preserve existing explanations.

`validateResult` checks the assessment enum, evidence shape, display/evidence consistency, and the same gate's output. It is a wiring check, not independent proof of policy. U1–U14 have hand-written expected assessments and trace codes. E1 runs the real engine and already establishes T1-GIFT; it must remain Suspicious.

`src/assessment.js` holds the assessment rules. Run `npm run build:gate` (or `node scripts/build-assessment.cjs`) after editing it. This creates `js/assessment-gate.js` for the browser. `npm test` rejects an outdated generated file. Both browser and Node use the same detector and adapter; the broader frozen-spec grounding port is still open work.

## How one check works

Start reading at `analyze()` in `js/engine/aggregate.js`. It calls the other files in this order:

1. `normalize.js` cleans the text and caps its length.
2. `extract.js` finds contacts and masks them before `sender.js` looks for a sender name. A name inside a link must not count as the sender.
3. `domain.js` compares contacts with `data/store.js`. The first matching rule decides each contact check, and only the trusted view from `trusted.js` can turn a listed contact into support.
4. `risk.js` checks what the message asks the person to do. It distinguishes a direct request from negation or quoted advice.
5. `policy.js` checks reviewed organization policies (T1-POLICY). Drafts never reach it.
6. `evidence.js` groups the contact checks, risk and policy findings, and uncertainty.
7. `src/assessment.js` chooses one result. Established Tier 1 risk wins; otherwise a match needs an explicit sender, matching contacts, and no risk or uncertainty. Everything else is insufficient evidence.
8. `copy.js` writes the explanations. `app.js` displays them, with `annotate.js` marking the findings in the pasted message, and handles the form, examples, focus, and reset.

Contacts use cleaned text, but the request rules read the original text through `riskView`, so every quote points at the exact characters the person pasted. `validateResult()` also rebuilds the evidence and repeats the assessment to check that the displayed result agrees with its evidence. This repeat is a wiring check, not a second policy.

In the JavaScript, `find()` returns the first match, `some()` asks whether any item matches, and `every()` asks whether all items match. In `domain.js`, `check(status, code, extra)` builds `{ status, code, ...extra }`: the shared fields plus the fields for that rule.

## Main files

In the order a message passes through them:

| File | What it does |
| --- | --- |
| `index.html`, `css/styles.css` | The page: message box, Text / Email / Not sure, result view |
| `js/app.js` | Reads the form, shows the result, runs the "I checked it myself" step; decides nothing |
| `js/engine/normalize.js` | Cleans the text; `riskView` keeps a map back to the original so quotes stay exact |
| `js/engine/extract.js` | Finds links, email addresses and phone numbers; asks `sender.js` who the message names |
| `js/engine/sender.js` | Sender attribution from labels, direct statements, affirmative "from" and sign-offs |
| `js/engine/trusted.js` | Trusted reference view: only reviewed, unexpired, complete, unambiguous, conflict-free records can support a contact |
| `js/engine/domain.js` | Checks each address against the organization list (a fixed rule table, first match wins) |
| `js/engine/risk.js` | What the message asks for: one function per Tier 1 rule, then the Tier 2 wording flags |
| `js/engine/policy.js`, `data/policies.js` | Policy view and `TFS.evaluatePolicies` (T1-POLICY); the one record is a draft |
| `js/engine/evidence.js` | Puts all readings into one standard form; sorts conflicts into T1-DOMAIN or Tier 2 |
| `src/assessment.js` | **The only place a result is decided**; `js/assessment-gate.js` is its generated browser copy |
| `js/engine/aggregate.js` | Runs every stage (`analyze`) and refuses inconsistent results (`validateResult`) |
| `js/engine/copy.js` | Every sentence the person reads |
| `js/annotate.js` | The pasted message with each finding marked, labeled and explained by a numbered note |
| `js/selfCheck.js` | "I checked it myself" outcomes; never changes the result |
| `data/store.js` | The organization list: 46 organizations, none human-reviewed yet |
| `js/mockData.js` | The seven demo examples |
| `tests/` | `npm test` runs everything here; `tests/run.html` shows the same checks in a browser |
| `eval/` | Field evaluation on real messages (`npm run eval`); `tests/eval-tests.cjs` checks the tool itself |

## I checked it myself

Below every result, the person can record a check they made themselves. They pick how they checked, and if that check was independent, what they were told. The step never changes the assessment, and the app never claims to confirm a sender.

- A number they already had, the official app or a website they knew before the message arrived, or a number they already know for a family member counts as independent. A number, link or address from the message never counts, even if they typed it in themselves; that choice names the message's own addresses so the difference is concrete.
- "They did not send it" says to report first (7726 for texts, reportfraud.ftc.gov), then delete, since a deleted text can no longer be forwarded.
- "They said they sent it" says the confirmation came from the person's own check. If the message made an established Tier 1 request (gift cards, codes, wire or crypto, remote access, a device-alarm callback), it warns instead: no real organization makes that request, so whoever "confirmed" it may be the fraudster. A T1-DOMAIN link stays flagged even when the message itself is confirmed.

## Input and reset

Paste directly from original digital text. Risk rules read a folded view of the input: invisible characters are skipped, curly apostrophes and fullwidth letters read as plain ones, and Cyrillic or Greek lookalike letters inside an English word read as Latin. Every quoted span still points at the original characters. The form rejects more than 20,000 characters. The engine caps input at 20,000 characters, target tokens at 2,048, and targets at 30; skipped input blocks a full match. Established risk in the inspected portion survives incomplete input.

No screenshot controls or scripted image results remain. Demo examples state a channel but leave its selection to the person. Reset clears input, channel, rendered result, and active example. Nothing is stored in app storage. Pasted markup is rendered as text.

## Release boundaries

Phase 2 (sections A to E) is described under "Phase 2" below. Before it, this checkpoint covered Step 1 only. The earlier channel controls and screenshot removal are preserved; it does not finish the broader frozen-spec implementation.

The app has not passed full v1.2 conformance or locked field evaluation. No record in the real list is reviewed by a person yet, so none can support a contact and the real list cannot produce Details Match; phone lists are empty. Legacy contact normalization and sender-role checks remain open work. T1-DOMAIN depends on the list naming each organization's main domains; the lure-word list was checked against a hand-built sample, not a field corpus. The parser uses a limited suffix list and character map.

Policy evaluation is built, but no sourced organization policy is active yet: the USPS record stays a draft until two people review it against the live page. Targeted first-contact questions are not built; a policy with a mandatory predicate stays quiet until an answer exists. The no-link USPS tracking policy must be independent of initiation. Follow-up answers may satisfy policy context but never verify who contacted the person. Reputation lookup and OCR remain outside v1. The Python package is a logic/test reference for a Node port, not a dependency.

## Phase 2

**A. Trusted reference view.** `TFS.buildTrustedView(store, today)` turns each organization into contact records and keeps only those that are reviewed, have a source, a check date, a review-due date and a reviewer, are not past their review-due date, have an unambiguous scope (a whole registrable domain, an exact host, or a path on a shared platform), and are not claimed by a second organization. Every other record is listed with its reason (`not_reviewed`, `missing:<field>`, `expired`, `ambiguous_scope`, `conflict`, and date errors). Only this view can turn a listed contact into support. Lookalike and conflict rules still read the full list, since they can only raise a warning. The result reports `referenceView` counts. Today every record in `data/store.js` is excluded as `not_reviewed`.

**B. Sender attribution.** `TFS.attributeSender(text, orgs)` names a sender only from a label at the start of a line (`USPS:`, `Chase Alert:`), a direct statement (`This is Medicare`), an affirmative "from" (`a notice from the IRS`), or a sign-off on the last non-empty line (`- Chase`, `Sincerely, Wells Fargo`). A name inside a negation, a reporting frame or a payment phrase is not a claim, a phone number or address is never a claim, and two surviving organizations give `competing_claims`. The result carries `senderAttribution` with a span into the pasted text. An organization implied only by an address keeps `explicit: false`. Names are read from the whole list, not only reviewed records: a sender still reaches Details Match only together with a trusted contact for that same organization, and claim-dependent lookalike warnings (such as `usps-redelivery.top` under a USPS label) need the name.

**C. Tier rules.** `tests/tier-cases.js` runs the exact C13 to C22 spec messages through the real engine. Secrecy cues now qualify a wire or remote-access demand only in the demand's own clause or the clause right after it. The spec row "Never share your code, but send me the code." expected a Tier 2 code request; since Step 2 it is T1-CODE, and it is still never T1-GIFT.

**D. Policy records.** `TFS.buildPolicyView(policies, today)` admits a policy only when two different people reviewed it, it is in date, its action is on the fixed list, its channels are `sms` or `email`, and its predicates and exceptions are well formed. `TFS.evaluatePolicies` then requires, in order: the attributed sender is the policy's organization, the declared channel is Text or Email and in scope (Not sure gives `channel_unknown`), a service cue is present, every mandatory predicate has an answer, no recorded exception applies, and the forbidden action is detected. The result's `policy.trace` lists every skip with its reason. T1-POLICY is in the closed Tier 1 list.

**E. Annotations.** `TFS.annotate(raw, result, store)` marks Tier 1 requests with their context and antecedent under one note, policy breaks (sender and action), Tier 2 signals, and every checked contact. Labels are words plus a symbol: "Strong warning: don't act on this" (!), "Needs an independent check" (?), "On our reviewed list" (=). Notes come from fixed templates. Overlapping spans merge into one mark listing every note number. The page builds the view with text nodes and `textContent` only, marks are reachable with Tab and point to their notes with `aria-describedby`, and message text is 18px.
