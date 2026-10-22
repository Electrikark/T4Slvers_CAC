# Page and GitHub workflow

- Keep `index.html` aligned with the engine and input features. Check result
  explanations, screenshot limits, script order and required element IDs when
  changing related behavior. Update supporting scripts and styles together.
- Preserve original message text, screenshot review, input-source tracking and
  the rule that screenshot text cannot produce Details Match. Do not treat
  draft reference records as human reviewed.
- Run `npm test` and `npm run check:ocr-assets` for app changes. Run
  `npm run test:ocr-browser` when changing the page, browser flow or OCR. These
  checks use authored fixtures; do not run a held-out evaluation without a
  separate request and its dataset gates.
- Inspect Git status before saving work. Record and push the intended changes
  on a working branch after validation, unless the user requests local-only
  work. Include the HTML and all files it needs in the same update. Preserve
  unrelated local edits, use the existing Git identity, and never force-push.
- Report the pushed branch, saved revision and actual check status. Saving a
  file alone does not upload it. GitHub Actions checks every push and pull
  request; a green local run does not establish a green GitHub run.
- Publishing, merging into a release branch and changing the GitHub Pages
  source require authorization for that step. A branch push alone does not
  establish that the live site changed.
