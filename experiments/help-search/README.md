# Help search experiment

Does ML make it easier to find the right recovery steps than keyword search, or than the menu?
Decision and rule: [docs/decisions/help-search.md](../../docs/decisions/help-search.md).

- `dev-challenge.json`: development descriptions (negations, two incidents, ambiguous, unrelated).
- `evaluate.cjs dev`: scores both searches in Chromium through `js/help-search.js`, exactly as the page runs it.
- `freeze.json`: fingerprints of the search code and the cards' titles and examples (frozen Oct 22).
- `volunteer/`: instructions and templates for the blind volunteer test, which runs once.

The model (`vendor/minilm`, all-MiniLM-L6-v2, Apache-2.0, run with Transformers.js 4.3.0) loads only
from this site, only when someone starts typing a description, and only if the page's search method
is ML.
