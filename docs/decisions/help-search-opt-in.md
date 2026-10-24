# Decision: smarter search as an opt-in button

Status: **done on `final-site`, Oct 23, 2026. Chosen by Naman.**

## What changed

The recovery page's search now has a button: **"Try smarter search (experimental · about 50 MB
download)"**. Pressing it downloads the all-MiniLM-L6-v2 model from this site (`vendor/minilm`,
about 51 MB) and uses the ML search (`mlSearch` in `js/help-search.js`) for the rest of that visit.
Nothing is stored, so the next visit starts with keyword search again.

- **Default unchanged.** The page still uses keyword search (`SEARCH = 'keyword'` in
  `js/help-ui.js`). Nothing downloads unless the button is pressed. Focusing or using the search
  box does not start it either.
- **Never waits on the model.** While it downloads, or if it fails, keyword search answers. The
  status line says which is happening, including when it could not load.
- **Outside the verdict.** This search only suggests recovery topics. Every topic is always listed
  below it and works without JavaScript. A wrong suggestion costs the reader a less useful topic,
  never a wrong scam verdict.
- The old `?search=ml` test link is gone. The button replaces it.

## Why opt-in, not the default

The decision rule in [help-search.md](help-search.md) still holds. The ML search becomes the
default only if it beats keyword search on fresh volunteer descriptions. That test has not been run.
What exists so far is development data that the settings were tuned on: ML 59/81 vs keyword 55/81
on the card examples, and 24/28 vs 23/28 on the challenge set. That gap is too small, and too
exposed, to be evidence.

The download is the other reason. About 50 MB is a real cost for someone on a phone right after a
scam. So the reader chooses it, and the button says the size and that it is experimental.

## What this does not change

- `js/help-search.js`, its settings, `experiments/help-search/` and `help-search.md` are untouched,
  so the freeze for the volunteer test still holds.
- When the ML search is mentioned anywhere, it must be described as experimental and not yet tested
  on fresh descriptions.
