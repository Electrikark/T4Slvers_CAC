# Tech for Silvers

A local text-only workshop prototype. Plain HTML, CSS, and JavaScript; no package install, build step, account, backend, analytics, or external request is needed. This is the active build base for frozen spec v1.2.

The app compares contacts with a stored list and checks fixed English risk patterns. It does not authenticate a sender, read images, follow links, or run AI extraction. Some legacy reference and parsing paths still need repair before release. Matching contact details do not establish that a message is real.

## Run and test

Open `index.html` in a modern browser, or serve this folder locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit `http://localhost:8000`. Open `tests/run.html` for browser test results. With Node installed:

```sh
npm test
# Without npm, run the same dependency-free checks:
node scripts/build-assessment.cjs --check
node tests/run-node.cjs
```

The recorded eac1229 baseline passes all 111 checks. There are now 186 shared checks: the original 111 (with contract updates), 33 gate and integration checks (U1–U15, E1, I1–I17), and 42 step-1 additions: input robustness and wording (N1–N10), T1-DOMAIN scope (D1–D8), T1-CODE scope (K1–K15), T1-CALLBACK scope (B1–B8), and one unresolved card-number case. The Node runner also runs the 33 gate checks with the source gate and compares its assessment and trace with the browser wrapper. They test decisions, not field accuracy. The focused group exercises the real engine for C13, C17, C19 and related negative cases. It is not the full C01–C40 conformance pack.

## Analysis contract

```js
window.TfsEngine.analyze(text, store, { declaredChannel: 'text' });
// declaredChannel must be 'text', 'email', or 'unknown'.
```

Missing or invalid channel choice is rejected. The form uses large Text / Email / Not sure buttons with none chosen by default. Not sure is valid. The result has engine version 0.4.0 and schema version 3.

- `suspicious`: established Tier 1 takes priority over contact support, missing contacts, and uncertainty.
- `details_match`: an explicit recognized sender, at least one contact verified for that sender, all contacts verified for that sender, and no findings or uncertainty. The adapter preserves legacy contact-verification semantics; this is not full v1.2 conformance.
- `insufficient_evidence`: neither threshold passes. Every finding blocks a match, including Tier 2 and unresolved Tier 1.

The gate holds a closed list of Tier 1 rules (`TIER1_RULES`): T1-GIFT, T1-WIRE, T1-REMOTE, T1-DOMAIN, T1-CODE and T1-CALLBACK. A Tier 1 finding with any other rule ID throws instead of winning.

- **T1-DOMAIN** covers address tricks with no innocent reading: text before `@` in a link, an official domain glued to another site (`usps.com-redelivery.top`), lookalike letters (`paypa1.com`, a Cyrillic `а`), and a brand name beside a lure word as separate parts of an address (`chase-secure-login.net`, `fastrak-ca-tolls.com`). Other conflicts stay Tier 2: a brand name alone, the same name with another ending, one-letter differences, and another listed organization's address. Measured against about 70 real domains that listed organizations use but the list lacks, those codes fired 128 times across runs with and without a named sender (`wellsfargoemail.com`, `paypal-prepaid.com`, `facebookmail.com`, `amazon.co.uk`, `uspis.gov`); the T1-DOMAIN subset fired zero times. Country forms such as `amazon.com.au` are no longer read as the glued-domain trick.
- **T1-CODE** covers a direct, unnegated, unreported demand to give a code, PIN, OTP, passcode or password to the requester, including "read it back to me" after a named code. Entering a code yourself, codes with no named requester, promo, confirmation, tracking and gift-card codes (T1-GIFT judges those), codes handed to a driver or cashier, and household codes such as the wifi password stay outside it.
- **T1-CALLBACK** covers the tech-support pattern: a device alarm (infected, hacked, locked, "virus detected") anywhere outside a reporting frame, plus a direct demand to call a phone number, "us", or a named support line. Real security warnings do not include a number to call. A call request with no device alarm, a health "virus", and calling a number you already trust (the back of your card) stay outside it.

`assessment` is the sole verdict. `trace` is returned unchanged by `assess(evidence)`; it holds winning rule IDs or blocker codes. There is no separate `state` or `decision` field. Only `js/app.js` maps canonical values to visible labels, symbols, and existing CSS classes. Risk severity can decorate advice but cannot change the label.

`evidence` retains sender identity, contacts with organization IDs and original supporting checks, normalized findings, and uncertainty. Findings preserve rule support and existing raw spans. Contact extraction supplies no offsets, so conflict spans stay `null` with explicit uncertainty. Missing contacts stay empty. Inferred senders have a null sender ID and `inferred_sender` uncertainty. `requestRisk` and rendered `checks` preserve existing explanations.

`validateResult` checks the assessment enum, evidence shape, display/evidence consistency, and the same gate's output. It is a wiring check, not independent proof of policy. U1–U14 have hand-written expected assessments and trace codes. E1 runs the real engine and already establishes T1-GIFT; it must remain Suspicious.

`src/assessment.js` is the supplied gate verbatim. Run `npm run build:gate` (or `node scripts/build-assessment.cjs`) after editing it. The classic-script browser artifact is checked for freshness by `npm test`; stale output fails instead of silently using old policy. No packages are required. Both browser and Node load the same detector and adapter. There is no separate browser-only grounding path here; the broader frozen-spec grounding port is still open work.

## Main files

| File | Role |
| --- | --- |
| `index.html`, `css/styles.css` | Text input, required channel, responsive result view |
| `js/app.js` | Validation, rendering, focus, reset |
| `js/mockData.js` | Seven text examples; each runs through the real engine |
| `js/engine/risk.js` | Contextual gift-card, wire/crypto, remote-access rules and caution flags (including the "new number" family opening) |
| `src/assessment.js`, `scripts/build-assessment.cjs` | Sole assessment gate and generated browser wrapper |
| `js/engine/evidence.js` | Legacy evidence adapter; no verdict logic |
| `js/engine/aggregate.js` | Public analysis boundary and result validation |
| `js/engine/copy.js` | Evidence explanations and shared protective advice |
| `js/engine/normalize.js`, `extract.js`, `domain.js` | Legacy contact paths still being brought into conformance |
| `data/store.js` | Legacy records: 46 organizations and 61 website names |
| `tests/step1-cases.js`, `tests/suite.js` | Focused step-1 checks and shared invariants |

## Input and reset

Paste directly from original digital text. Risk rules read a folded view of the input: invisible characters are skipped, curly apostrophes and fullwidth letters read as plain ones, and Cyrillic or Greek lookalike letters inside an English word read as Latin. Every quoted span still points at the original characters. The form rejects more than 20,000 characters. The engine caps input at 20,000 characters, target tokens at 2,048, and targets at 30; skipped input blocks a full match. Established risk in the inspected portion survives incomplete input.

No screenshot controls or scripted image results remain. Demo examples state a channel but leave its selection to the person. Reset clears input, channel, rendered result, and active example. Nothing is stored in app storage. Pasted markup is rendered as text.

## Release boundaries

This checkpoint covers Step 1 only. The earlier channel controls and screenshot removal are preserved; it does not finish the broader frozen-spec implementation.

The app has not passed full v1.2 conformance or locked field evaluation. Some unreviewed legacy records can still support contacts; phone lists are empty. Legacy contact normalization and sender-role checks remain open work. T1-DOMAIN depends on the list naming each organization's main domains; the lure-word list was checked against a hand-built sample, not a field corpus. The parser uses a limited suffix list and character map.

Policy records and targeted first-contact questions are planned next; no sourced organization policy is active yet. The no-link USPS tracking policy must be independent of initiation. Follow-up answers may satisfy policy context but never verify who contacted the person. Reputation lookup and OCR remain outside v1. The Python package is a logic/test reference for a Node port, not a dependency.
