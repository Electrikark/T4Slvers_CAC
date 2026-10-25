# Clear actions and optional explanation

## Design standard

Show enough to understand the result and act safely. Let the user choose whether
to explore the explanation.

Build the visible result in this order:

1. Read the supported findings from the engine result.
2. Assign each finding its protective action.
3. Group findings only when one instruction fully addresses them.
4. Retain each distinct behavior in the brief visible explanation.
5. Put background and sources in optional, question-labeled disclosures.

There is no fixed limit on visible protective actions. Urgency and secrecy may
share one action, but both behaviors must remain named. Code sharing, payment,
and remote access retain their different protective steps.

## Result presentation

`js/result-view.js` produces a display model from the validated engine result.
It does not decide, mutate, or replace the assessment, evidence, or trace.
`js/app.js` renders that model using text nodes.

- Risk findings use “This message has warning signs.” The severity label retains
  the distinction between a strong warning and a check-before-acting result.
- A quiet unresolved result uses “There isn’t enough information.” It keeps a
  protective next step and does not certify safety.
- A match label names the actual kind and count of details: website address,
  email domain, phone number, or the specific combination. An email-domain
  comparison does not become a claim about a whole sender address.
- Sender uncertainty sits inside every result banner. Other contact gaps and
  unresolved checks remain visible below the actions.
- Screenshot uncertainty remains above the result. Screenshot review and the
  prohibition on a screenshot-derived match stay in the engine and OCR flow.
- Asking someone, background explanations, marked text, check details, reporting,
  and recording an independent check are optional disclosures. They start folded
  for every fresh result. Help requests still share only the fixed request.

## Other pages

The home page offers checking, recovery, and learning. Recovery keeps urgent
payment guidance visible, shows each topic's brief action in its closed row,
and retains full source-linked steps and six payment routes. The optional
meaning-search download is folded; keyword search stays available at once.
Learning keeps warning signs and protective steps together, with practice beside
them on desktop and the longer guide below. About shows capabilities, limits, and local processing
first, followed by optional background.

`css/ui.css` provides the shared visual hierarchy, phone layouts, large text,
focus styles, reduced motion, forced colors, and print adjustments. Existing
styles and local OCR assets are retained. Recovery and learning continue to
generate from their source data; do not edit their generated blocks by hand.

## Acceptance

With all panels closed, the user can explain what was found, what to do next,
and what remains unknown.

Code checks cover finding coverage, separate protective actions, exact match
labels, record-review limits, screenshot limits, and unchanged engine evidence.
Browser checks cover folded results, keyboard controls, local-only processing,
real OCR, recovery, practice, printing, phone reflow, and enlarged text.

These checks establish behavior and layout. Observed sessions with older adults
are still needed to establish that people understand the wording and choose an
appropriate action. They do not establish public-message detection accuracy.

The [balanced layout](balanced-layout.md) defines the page priorities after the
style audit. The [visual identity](visual-identity.md) defines the current type,
color roles, mark, and surfaces. The result standard above still applies.
