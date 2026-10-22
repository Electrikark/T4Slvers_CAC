# A simpler site with useful next steps

## Scope

The prior start page asked one screen to explain the project, collect input,
teach the checking process, present results, and host workshop tools. This
revision separates those jobs. It adds no detection rules, reference approvals,
accounts, analytics, message storage, or new dependencies.

- **Home:** choose a task. On phones, the three task cards follow the short
  introduction; the secondary pause panel is shown only on wider screens.
- **Check a message:** channel, message, Check. Screenshot reading stays optional,
  requires full-text review, and retains the screenshot provenance gate. Result
  warnings and next steps stay visible. Evidence and the optional independent
  self-check can be opened when wanted. Recovery is linked beside next steps.
- **Get help after a scam:** urgent payment guidance, four short recovery paths,
  the U.S. National Elder Fraud Hotline, reporting links, and a printable plan.
  Several paths can be opened because one incident can involve several actions.
- **Learn the signs:** four short warning signs and one fixed made-up example.
  Loading it does not run analysis or choose the channel for the reader.
- **About & privacy:** full result definitions, limitations, privacy, and the
  real reference list's pending human review.

## Design choices

Use familiar page links with visible current-page state. Keep four main links;
About is in the footer. Use 18px body text, main navigation and primary controls at least 48px tall, explicit
labels, visible focus, and generous spacing. Headings use the existing serif
face; controls keep the familiar sans-serif face. No remote fonts or images.
Native disclosure elements let the recovery guidance work without JavaScript.

The site styles are in `css/site.css`, separate from the existing checker and
OCR styles. Static HTML keeps content available without a router or hydration.
The header/footer is repeated in five files; if the navigation changes, update
all five and run the page-link browser check. A template build becomes useful
if the site grows past a handful of pages; it is unnecessary at this size.

`check.html` remains the page contract for `js/app.js`, OCR, and the evaluation
loader's script-order check. `tests/page-scripts.cjs` discovers every top-level
HTML page. The local preview server explicitly permits the five public pages
while keeping private and development paths blocked.

## Resource sources

Resource details checked October 21, 2026. These are public U.S. support
resources, separate from the checker's contact-matching reference records.
Recheck the exact official pages before release and when updating a resource.

- [DOJ / Office for Victims of Crime hotline](https://ovc.ojp.gov/program/stop-elder-fraud/providing-help-restoring-hope):
  833-372-8311, age 60 or older, weekday 10 a.m.–6 p.m. Eastern hours, languages,
  and reporting support. Pacific hours are the equivalent local time.
- [FTC recovery guidance](https://consumer.ftc.gov/articles/what-do-if-you-were-scammed):
  payment-provider, identity-exposure, and device-recovery actions.
- [FTC account recovery](https://consumer.ftc.gov/articles/how-recover-your-hacked-email-or-social-media-account):
  recovering access and protecting an affected account.
- [FTC warning signs](https://consumer.ftc.gov/articles/how-avoid-scam): learning content.
- [FTC recovery-scam warning](https://consumer.ftc.gov/articles/refund-and-recovery-scams):
  caution about a second request for a recovery fee.

The app does not place a call, send a report, or transfer message content to any
of these services. External links need internet access. It makes no promise of
fund recovery. Official-source content still needs the project's release review;
source checking by a coding tool does not replace its human review gate.

## Validation

- `npm test`: page syntax/IDs, source gate, engine fixtures, evaluator fixtures,
  reference eligibility, and OCR provenance.
- `npm run check:ocr-assets`: local vendor hashes.
- `npm run test:ocr-browser`: 12 existing screenshot checks and 8 site-flow checks.
  Covers Home → practice → check → recovery, result focus, original-text Back,
  reset, optional self-check folding, official contact hrefs, no automatic outside
  requests in the practice flow, no-JavaScript recovery, local links, and layouts
  at 320px, 390px and 1280px. A 640px viewport with doubled root text checks
  reflow. Screenshots of all pages are saved in ignored `test-results/`.
- The print check exercises opening every recovery section and restoring the
  reader's prior choices through print events. It does not certify a printer.

No held-out data is evaluated. No physical-phone, screen-reader, older-adult
usability session, or real-world classifier accuracy is established here. A
working branch push is separate from publishing or release approval.

## Expand next, in this order

More pages alone will not establish usefulness. First observe whether a person
can find the right action and complete it without help. Use made-up messages;
record the first chosen path, completion, confusion, and assistance needed.
Do not claim reduced fraud losses from a navigation test.

| Next addition | Why it earns space | Bounded first version | Ready when |
| --- | --- | --- | --- |
| Three short practice lessons | Gives a reason to return before a crisis | Gift cards, bank impersonation, and family urgency; one made-up message and one independent next step each | Readers can state the safer action; every example is labeled made-up |
| Printable trusted-person plan | Helps someone who wants human support | A paper sheet for a chosen helper and a check routine; no contact upload | A reader can use it without entering private details on this site |
| More recovery choices | Covers gaps found in use | Add one observed situation at a time, with an exact official source and a short first action | It reduces a specific navigation failure and source details are reviewed |
| A second language | Removes a real access barrier | Translate the static help and learning pages with a fluent human reviewer | Every safety instruction is checked; English-only detection remains explicit |

Avoid adding an open chatbot, a live scam feed, accounts, or cloud message
history to this first revision. They add upkeep and privacy demands before the
basic decision path has evidence of use.

To add one feature quickly:

1. Name the reader's task and its single useful outcome.
2. Put it under Check, Get help, or Learn; add a new top-level page only if none fits.
3. Reuse the shared styles and native HTML controls. Keep private text out of URLs.
4. Link the exact official source for safety advice and note when it was checked.
5. Run the three checks above and try the task with an older adult before claiming
   that it is easier to use.
