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

The recorded eac1229 baseline passes all 111 checks. Step 1 now has 139 shared checks: the original 111 (with contract updates), plus 28 gate and integration checks. The Node runner also runs those 28 checks with the source gate and compares its assessment and trace with the browser wrapper. They test decisions, not field accuracy. The focused group exercises the real engine for C13, C17, C19 and related negative cases. It is not the full C01–C40 conformance pack.

## Analysis contract

```js
window.TfsEngine.analyze(text, store, { declaredChannel: 'text' });
// declaredChannel must be 'text', 'email', or 'unknown'.
```

Missing or invalid channel choice is rejected. The form uses large Text / Email / Not sure buttons with none chosen by default. Not sure is valid. The result has engine version 0.4.0 and schema version 3.

- `suspicious`: established Tier 1 takes priority over contact support, missing contacts, and uncertainty.
- `details_match`: an explicit recognized sender, at least one contact verified for that sender, all contacts verified for that sender, and no findings or uncertainty. The adapter preserves legacy contact-verification semantics; this is not full v1.2 conformance.
- `insufficient_evidence`: neither threshold passes. Every finding blocks a match, including Tier 2 and unresolved Tier 1. Legacy contact conflicts are Tier 2 until the reference prerequisites for T1-DOMAIN exist.

`assessment` is the sole verdict. `trace` is returned unchanged by `assess(evidence)`; it holds winning rule IDs or blocker codes. There is no separate `state` or `decision` field. Only `js/app.js` maps canonical values to visible labels, symbols, and existing CSS classes. Risk severity can decorate advice but cannot change the label.

`evidence` retains sender identity, contacts with organization IDs and original supporting checks, normalized findings, and uncertainty. Findings preserve rule support and existing raw spans. Contact extraction supplies no offsets, so conflict spans stay `null` with explicit uncertainty. Missing contacts stay empty. Inferred senders have a null sender ID and `inferred_sender` uncertainty. `requestRisk` and rendered `checks` preserve existing explanations.

`validateResult` checks the assessment enum, evidence shape, display/evidence consistency, and the same gate's output. It is a wiring check, not independent proof of policy. U1–U10 have hand-written expected assessments and trace codes. E1 runs the real engine and already establishes T1-GIFT; it must remain Suspicious.

`src/assessment.js` holds the assessment rules. Run `npm run build:gate` (or `node scripts/build-assessment.cjs`) after editing it. This creates `js/assessment-gate.js` for the browser. `npm test` rejects an outdated generated file. Both browser and Node use the same detector and adapter; the broader frozen-spec grounding port is still open work.

## How one check works

Start reading at `analyze()` in `js/engine/aggregate.js`. It calls the other files in this order:

1. `normalize.js` cleans the text and caps its length.
2. `extract.js` finds contacts and masks them before looking for a sender name. A name inside a link must not count as the sender.
3. `domain.js` compares contacts with `data/store.js`. The first matching rule decides each contact check.
4. `risk.js` checks what the message asks the person to do. It distinguishes a direct request from negation or quoted advice.
5. `evidence.js` groups the contact checks, risk findings, and uncertainty.
6. `src/assessment.js` chooses one result. Established Tier 1 risk wins; otherwise a match needs an explicit sender, matching contacts, and no risk or uncertainty. Everything else is insufficient evidence.
7. `copy.js` writes the explanations. `app.js` displays them and handles the form, examples, focus, and reset.

Contacts use cleaned text, but risk quotes use the original text so their positions stay accurate. This is why extraction runs twice. `validateResult()` also rebuilds the evidence and repeats the assessment to check that the displayed result agrees with its evidence. These repeated steps serve different purposes.

In the JavaScript, `find()` returns the first match, `some()` asks whether any item matches, and `every()` asks whether all items match. In `domain.js`, `{ ...base, ...extra }` copies the shared contact fields and adds the fields for that rule.

## Main files

| File | Role |
| --- | --- |
| `index.html`, `css/styles.css` | Text input, required channel, responsive result view |
| `js/app.js` | Validation, rendering, focus, reset |
| `js/mockData.js` | Seven text examples; each runs through the real engine |
| `js/engine/risk.js` | Contextual gift-card, wire/crypto, remote-access rules and caution flags |
| `src/assessment.js`, `scripts/build-assessment.cjs` | Sole assessment gate and generated browser wrapper |
| `js/engine/evidence.js` | Legacy evidence adapter; no verdict logic |
| `js/engine/aggregate.js` | Public analysis boundary and result validation |
| `js/engine/copy.js` | Evidence explanations and shared protective advice |
| `js/engine/normalize.js`, `extract.js`, `domain.js` | Legacy contact paths still being brought into conformance |
| `data/store.js` | Legacy records: 46 organizations and 61 website names |
| `tests/step1-cases.js`, `tests/suite.js` | Focused step-1 checks and shared invariants |

## Input and reset

Paste directly from original digital text. The form rejects more than 20,000 characters. The engine caps input at 20,000 characters, target tokens at 2,048, and targets at 30; skipped input blocks a full match. Established risk in the inspected portion survives incomplete input.

No screenshot controls or scripted image results remain. Demo examples state a channel but leave its selection to the person. Reset clears input, channel, rendered result, and active example. Nothing is stored in app storage. Pasted markup is rendered as text.

## Release boundaries

This checkpoint covers Step 1 only. The earlier channel controls and screenshot removal are preserved; it does not finish the broader frozen-spec implementation.

The app has not passed full v1.2 conformance or locked field evaluation. Some unreviewed legacy records can still support contacts; phone lists are empty. Legacy contact normalization, sender-role checks, and domain rules remain open work. The parser uses a limited suffix list and character map.

Policy records and targeted first-contact questions are planned next; no sourced organization policy is active yet. The no-link USPS tracking policy must be independent of initiation. Follow-up answers may satisfy policy context but never verify who contacted the person. Reputation lookup and OCR remain outside v1. The Python package is a logic/test reference for a Node port, not a dependency.
