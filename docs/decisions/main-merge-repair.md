# Repair the merged main tree

Checked on 2026-10-21 against main at `d8b02f95e4b514a2311cf3cc3117160694f97f0a`.

## Cause and scope

The failed PR #11 job (`116835205320`, workflow run `38858491358`) stops at
`extract.js:86` because `start` is declared twice. A local run fails at the same
line. Parsing all scripts used by the app and browser suite reveals ten broken
files, including the page, engine, verdict gate and two fixture files. Earlier
overlapping merges kept both implementations in these files.

This repair uses the resolved Phase 2 integration at `0f2c1af` and the evaluation
loader repair at `b514900`. It preserves the trusted view, sender attribution,
policy evaluation, T1-POLICY and exact source spans. It also removes repeated
styles, page text and Finder metadata. Later release and rule changes remain
outside this focused repair.

## Regression checks

- `tests/page-scripts.cjs` parses all 31 scripts referenced by the app and browser
  suite and rejects repeated HTML IDs. Against the original main tree, it reports
  all ten syntax failures, including `app.js`.
- The existing page-element contract check is reused to check all 47 IDs that
  page logic selects. Both checks run through `npm test` and the existing CI.
- The evaluation test checks that its loader uses the page's engine files in
  exactly the same order and retains the trusted-view count and sender result.

## Validation

- `npm test` passes on Node 22.23.3, 24.22.0 and the local Node 26.11.1.
- Shared suite: 301/301; source gate parity: 36/36; evaluation tool: 12/12;
  boundary checks: 2/2. Generated gate freshness passes.
- Browser suite: 301/301. A gift-card code demand displays Suspicious with
  annotations; reset clears the input, channel and result.
- No private message corpus or held-out evaluation was run. These checks show
  integration behavior, not field accuracy or release readiness.

Historical failed workflow runs retain their original results. This branch is
prepared for review through a draft PR; it does not deploy or merge a release.
