# Restore the page before phone checks

The `24ec488` update made `app.js` request `checking`, `checking-title` and
`paste-link`, none of which existed in `index.html`. The page could throw before
showing results even when every engine test passed. The update was reverted;
`app.js` is byte-for-byte the working `5d655f6` version.

The reviewed branches were merged in order: `fix-tier2-warnings`, then
`fix-reviewed-next-steps`. Their README conflict was resolved with the combined
count: **1,163 shared checks**, rather than either branch's smaller count.
The website fallback now says “type a website address you already know, or use
their official app.” The existing trusted-number advice remains unchanged.

## Regression check

`tests/app-elements.cjs` reads the actual app and HTML. It checks literal IDs,
the declared channel variants, loop-selected IDs and screen/result mappings.
Unrecognized lookup expressions fail with an explanation instead of being
silently ignored. Before the revert it reported all three missing IDs; after
the revert all **47 referenced IDs** exist. It runs first in `npm test`, after
the generated assessment wrapper check, so the existing PR workflow includes it.

This static contract catches missing elements; it does not prove all event
handlers, rendering or accessibility behavior. A real-page browser check is
still needed when changing `app.js` or `index.html`.

## Verification

Node 22 and 24 each pass **1,214 checks**: 1,163 shared, 36 source-gate parity,
2 boundaries, 12 evaluation-harness and 1 app-element contract. Chromium also
passes all 1,163 shared checks.

The actual `index.html` was served over HTTP and exercised in Chromium with
375 × 844 and 390 × 844 mobile viewports. At each width, text was entered,
a channel selected and the real “Check this” button clicked:

| Message / record | Expected and observed |
| --- | --- |
| USPS package fee with `usps.com.delivery-check.top` | Suspicious, result visible, website/app fallback shown |
| Official USPS tracking link with the real awaiting-review store | Insufficient Evidence, result visible, website/app fallback shown |
| Chase statement with a fictional approved Chase record | Details Match, result visible, type chase.com advice shown |

The fictional record was injected only into the browser test tab; the real
store was not edited. Both widths had no JavaScript exceptions, no horizontal
overflow and no undefined/null advice. Result headings received focus. Back
preserved the message; Reset cleared it and the previous results. The small
screen result was also inspected visually. These are desktop browser mobile
emulations, not tests on a physical phone or Safari.

## Release and main

The repaired release is the source for the proposed `release-v1` → `main`
repair. Preserve its complete tree when reconciling history: main's duplicated
engine code and unrelated files must not be reintroduced. Main should change
through the requested pull request, not a force push.

GitHub's API denied access to branch-protection settings. No protection rule
was changed. In Settings → Branches, protect `main`, require status checks
`test (22)` and `test (24)` before merging, and require the branch to be up to
date before merging. Both jobs run the full `npm test`, including the app
element check. Confirm their displayed names in the PR checks list when saving
the rule. Local passing results do not replace that GitHub merge requirement.

No public deployment or participant link was created by this repair. Deploy
from the repaired release only after verifying which revision the host serves.
