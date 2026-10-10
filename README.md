# Tech for Silvers

A local, accessible workshop prototype for taking a closer look at a suspicious message. Plain HTML, CSS, and JavaScript. No packages, build step, account, backend, analytics, or network calls are needed by the app.

Text is compared with a stored list of website names. Separate rules look for wording such as requests to share a code. These are experimental heuristics, not a validated scam detector. A matching website name does not prove who sent a message, whether a page is trustworthy, or whether a requested action is appropriate.

## Run and test

Open `index.html` directly in a modern browser. Or serve this folder locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Visit `http://localhost:8000`. Open `tests/run.html` for the browser test suite. If Node.js is installed, the same suite runs without packages:

```sh
node tests/run-node.cjs
```

The suite has 20 spec cases, 41 reference-list and regression cases, and 13 invariants. These verify intended behavior; they are not an estimate of detection accuracy. Browser tests also check all eight demo flows, text length limits, file selection and removal, empty input, reset, keyboard actions, and narrow-screen layout during review. Those UI checks are manual; the terminal runner only tests engine behavior and result shape.

## Structure

| File | Role |
| --- | --- |
| `index.html` | Input, loading, results, and demo controls |
| `css/styles.css` | Responsive layout, typography, focus, and evidence-state styling |
| `js/app.js` | Form validation, rendering, focus, and screen state |
| `js/mockData.js` | Eight workshop examples plus honest guidance for actual image selections |
| `data/store.js` | Local reference list: 46 organizations and 61 website names |
| `js/engine/normalize.js` | Text cleanup and bounded input |
| `js/engine/extract.js` | Address extraction and tentative sender inference |
| `js/engine/domain.js` | Stored-domain comparison, lookalike rules, and phone checks |
| `js/engine/risk.js` | Separate wording signals and negation handling |
| `js/engine/aggregate.js` | Evidence state, public analyzer, and result validation |
| `js/engine/copy.js` | Explanations, provenance labels, and action advice |
| `tests/suite.js` | Shared assertions and invariants |
| `tests/browser.js`, `tests/run-node.cjs` | Browser display and terminal runner |
| `tests/cases.js`, `tests/real-store-cases.js`, `tests/regression-cases.js` | Test inputs and expected decisions |

## Evidence and action are separate

`window.TfsEngine.analyze(text, store)` returns a versioned result. `checks` describe `SUPPORTS`, `CONTRADICTS`, or `UNKNOWN` evidence. `requestRisk`, `actionWarnings`, and `nextSteps` describe what the user should consider before acting.

- **Details match our list:** all extracted targets support the same named or inferred organization. This is a narrow address comparison.
- **Suspicious mismatch:** an address resembles a stored name but differs, or the claimed organization conflicts with a known listed owner. Lookalike rules can still cause false alarms.
- **Not enough evidence:** a check is unresolved, a reference needs review, input is incomplete, or there is nothing to compare. An unfamiliar address alone is not a contradiction.

Critical action advice appears directly below the result, including when address details match. Optional “About this check” disclosures expose source and review notes.

## Input boundaries

The form rejects text longer than 20,000 characters instead of silently cutting it. The engine also caps normalized text at 20,000 characters, individual tokens at 2,048 characters, and extracted targets at 30. Any skipped input adds an unresolved check, which prevents a full match. Explicit conflicting evidence may still yield a mismatch on partial input.

Host names ignore case. Malformed links do not become matches by dropping separators. Pasted content is rendered through `textContent`, never as HTML. The app does not open links or follow redirects.

Images are only selected locally. Their bytes are not read, previewed, or uploaded. PNG, JPG, and WebP files up to 10 MB are accepted. A real file gets “image not read” guidance with no inferred sender. The Chase screenshot facts appear only when that specific demo is loaded.

## Demo and reset

Open **Demo examples**, choose one, then select **Check this**. Seven text examples use the actual local rules; the screenshot example is scripted. Editing text or selecting a file clears the active example. Reset clears the input, selected file, and rendered result so the next participant starts fresh. Nothing is persisted in app storage.

## Future API boundary

`analyzeSubmission(input)` in `js/app.js` is the replacement point. It currently calls the local engine or returns image guidance, then validates the result. A later backend should return the same shape, with address evidence separate from action advice. Input validation and failure recovery belong at this boundary. Adding real image analysis requires an explicit file-processing path; choosing a file today does not send it anywhere.

## Accessibility choices

Labeled fields, semantic headings, a skip link, keyboard-operable disclosures, large controls, and visible focus. Invalid input receives focus and an alert. Results focus their heading; the next-steps link also moves focus. Text sizes use `rem`, long addresses wrap, and grids reflow on phones. State labels and symbols carry meaning independently of color. Reduced-motion and forced-color preferences have dedicated styles. A full screen-reader audit and participant testing are still needed.

## Reference data and limits

The existing source records were preserved. Their automated reachability notes are not proof of ownership or human review. All entries still need review; five website names explicitly marked `needs review` cannot yield a positive match: pnc.com, golden1.com, bestbuy.com, geeksquad.com, and dhl.com. Phone lists remain empty. Do not present the stored data as independently verified.

The parser uses a limited suffix list, a small character-lookalike map, and English wording patterns. It cannot read screenshots, authenticate senders, inspect email headers, resolve short links, assess page content, or uncover hidden destinations. File-like bare strings may be skipped; use a complete URL when possible. Name inference is tentative, and wording rules can flag harmless advice or miss unfamiliar phrasing. It also does not track third-party content hosted under every listed domain.

Before expanding the list or adding a backend, measure false alarms, missed risks, and whether participants understand a match versus unresolved evidence. Ask each participant to explain the result and choose a next action without coaching.
