# Automatic recovery search

Chosen by Naman on October 24, 2026. The user asked to remove the optional mode
and accepted the roughly 50 MB download as part of the Get Help page.

## Behavior

- The local language model starts loading when the recovery page opens. There
  is one search form, with no activation button or mode choice.
- Every submitted query gets keyword suggestions at once. The full topic menu
  stays available while the model loads and while language search runs.
- Once ready, the existing hybrid scorer checks related wording. It also checks
  the latest submitted query if that query arrived while the model was loading.
- Editing the query, submitting a new one, entering the suggestions by keyboard,
  or starting a pointer selection cancels any pending UI update from an older
  search. A late response cannot replace a topic choice or move focus away.
- Load or query failure leaves keyword search and every topic available. A short
  status line explains the fallback. No description leaves the device.
- Without JavaScript, the search form stays hidden and the topic menu still works.

This supersedes the activation policy in [help-search-opt-in.md](help-search-opt-in.md).
The app adds no persistent model or description storage. Model files may need to
be fetched again on later visits.

## Evidence boundary

Automatic loading is a product choice, not evidence that the model is more
accurate. The fresh-volunteer comparison described in the earlier frozen
[search plan](help-search.md) has not been run. Its accuracy gate has not been
met. The prior download-policy choice and that plan's default-method policy are
superseded; the proposed comparison remains useful for assessing benefit.

The scoring code, model, thresholds, card search text, frozen plan, and evaluation
receipts are preserved. No volunteer or held-out evaluation is run as part of
this interface change. UI lifecycle tests and a real local-model browser check
verify loading, fallback, and result delivery; they do not establish accuracy on
new user descriptions or real-world loss prevention.
