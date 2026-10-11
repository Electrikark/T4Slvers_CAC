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
node tests/run-node.cjs
```

There are 111 engine checks: 20 legacy baseline, 41 reference/regression, 37 focused step-1 cases, and 13 invariants. They test decisions, not field accuracy. The focused group exercises the real engine for C13, C17, C19 and related negative cases. It is not the full C01–C40 conformance pack.

## Analysis contract

```js
window.TfsEngine.analyze(text, store, { declaredChannel: 'text' });
// declaredChannel must be 'text', 'email', or 'unknown'.
```

Missing or invalid channel choice is rejected. The form uses large Text / Email / Not sure buttons with none chosen by default. Not sure is valid. The result has engine version 0.3.0 and schema version 2.

- Suspicious: an established contextual risk or existing contact contradiction takes priority.
- Details Match: all contact checks support a named claim, with no detected risk, unresolved risk, or incomplete input. The trusted-reference gate still needs repair, so this is not full v1.2 conformance.
- Insufficient Evidence: neither result threshold passes. Risk or uncertainty cannot retain a match.

Internal state values remain `mismatch`, `match`, and `unknown`. `assessment` provides the visible spec label. `requestRisk.established` retains rule IDs and raw evidence spans. `requestRisk.unresolved` and `decision.matchBlockers` retain uncertainty. Contact comparisons cannot erase a qualifying risk demand.

## Main files

| File | Role |
| --- | --- |
| `index.html`, `css/styles.css` | Text input, required channel, responsive result view |
| `js/app.js` | Validation, rendering, focus, reset |
| `js/mockData.js` | Seven text examples; each runs through the real engine |
| `js/engine/risk.js` | Contextual gift-card, wire/crypto, remote-access rules and caution flags |
| `js/engine/aggregate.js` | Assessment priority, risk gate, public analysis boundary, result validation |
| `js/engine/copy.js` | Evidence explanations and shared protective advice |
| `js/engine/normalize.js`, `extract.js`, `domain.js` | Legacy contact paths still being brought into conformance |
| `data/store.js` | Legacy records: 46 organizations and 61 website names |
| `tests/step1-cases.js`, `tests/suite.js` | Focused step-1 checks and shared invariants |

## Input and reset

Paste directly from original digital text. The form rejects more than 20,000 characters. The engine caps input at 20,000 characters, target tokens at 2,048, and targets at 30; skipped input blocks a full match. Established risk in the inspected portion survives incomplete input.

No screenshot controls or scripted image results remain. Demo examples state a channel but leave its selection to the person. Reset clears input, channel, rendered result, and active example. Nothing is stored in app storage. Pasted markup is rendered as text.

## Release boundaries

The app has not passed full v1.2 conformance or locked field evaluation. Some unreviewed legacy records can still support contacts; phone lists are empty. Legacy contact normalization, sender-role checks, and domain rules remain open work. The parser uses a limited suffix list and character map.

Policy records and targeted first-contact questions are planned next; no sourced organization policy is active yet. The no-link USPS tracking policy must be independent of initiation. Follow-up answers may satisfy policy context but never verify who contacted the person. Reputation lookup and OCR remain outside v1. The Python package is a logic/test reference for a Node port, not a dependency.
