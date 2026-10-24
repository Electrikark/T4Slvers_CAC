# Reviewing reference records (a person's job)

No record in `data/store.js` has complete human approval metadata, so the real list cannot yet give
**Details Match**. Demo 7 (the real USPS tracking link) shows Insufficient Evidence with
"its source record still needs review". That is the safe default, not a bug. This guide is the
part the code cannot do for you: a person checks each record against a primary source and signs it.

Don't add a review you did not do. A fixture or placeholder reviewer in the real list would make
Details Match claim something nobody checked.

## Approval preparation recorded October 22, 2026

Naman Raichura states that he already checked the original 46 organizations. His name is
prefilled in each `humanReviewDraft`. The dates and approval source pages stay null because
his notes are not available. `attestedOn` records his statement date, not a new check date.
The engine ignores these drafts, so they do not approve contacts or enable Details Match.
HSBC, Royal Mail and E-ZPass stay outside this scope.

See [the preparation list](testing/human-review-preparation.md) for all 46 records, stored
source candidates and the fields still needed. Existing source dates are research dates;
do not reuse them as human check dates without a basis. Once the evidence is complete,
use `humanReview` or contact-level approval as described below and run validation.

## Which records to start with

Start with the organizations whose real addresses appear in the demos:

| Organization | `id` in store.js | Used by |
| --- | --- | --- |
| USPS | `usps` | Demo 7, the only demo that can show Details Match |
| Chase | `chase` | Demo 2: its real chase.com link then shows "On our reviewed list", and the result stays Suspicious because of the code request |
| Microsoft | `microsoft` | Demo 4: same idea, with a remote-access request |

Demos 1 and 5 use lookalike addresses, which are caught whether or not the real record is
reviewed. Add a few organizations your workshop participants hear from most. Five to eight
records are enough for the submission; more records mean more re-reviews later.

## How to review one record

1. Find a **primary source**: a page on the organization's own website that says which
   web addresses it uses or sends messages from (for example, a "how to recognize our emails"
   or security page). A page that merely loads is not enough. The existing `sources` entries
   only record that the site loaded.
2. Check every domain in that organization's `officialDomains` against the source. Remove a domain
   the source does not support instead of reviewing it.
3. Add this to the organization in `data/store.js`, with your own name and the actual day you checked it:

   ```json
   "humanReview": {
     "reviewer": "<your name>",
     "date": "YYYY-MM-DD",
     "reviewDue": "YYYY-MM-DD",
     "sourceUrl": "<the primary source page>"
   }
   ```

   Eight organizations (`hsbc`, `royalmail`, `ezpass`, `chase`, `wellsfargo`, `amazon`, `usps`,
   `ssa`) also have a `"contacts"` list. A `humanReview` on one of them reviews every contact in
   that list that is still `"draft"`, **including its phone numbers** (Chase, Wells Fargo, USPS and
   SSA list one each). Only add it if your source page backs every contact in the list; otherwise
   delete the contact you could not confirm, or mark that one contact `"status": "rejected"`.
   A contact you mark `"reviewed"` yourself keeps its own reviewer, dates and source page.
4. **Review-due date.** The store's rule is 90 days after the review. After that date the record
   stops counting and the page says "the review of that record has expired". Use the actual check
   date. If it will expire before judges try the app, plan to check it again before then.
5. A few sources say `"check": "needs review: site refused the automated check"` (PNC, Golden 1,
   Best Buy/Geek Squad, DHL). Those domains stay in draft even with a `humanReview`. After you
   check one by hand, change that `check` text to say how you checked it.
6. Some domains can never count on their own, by design: `icloud.com`, `live.com`, `forms.gle`,
   `facebook.com` and `instagram.com` are places where anyone can have an address or a page.

## Check your work

```bash
npm test
```

Then open `check.html`, load demo 7, choose Text and press "Check this". With USPS reviewed it
should say **Details Match**, with "Contact details only · The sender is not confirmed" under it.
Demos 1, 2, 4, 5 and 6 should still say Suspicious, and demo 3 Insufficient Evidence.

## Decisions still waiting on you

These were left alone on purpose, because each one changes what the app claims:

- **USPS policy** (`data/policies.js`, still a draft). If it were switched on, a real USPS
  tracking text with a link would become Suspicious when the person chooses Text or Email, but
  not when they choose Not sure. Decide whether "USPS texts never contain a link" is true for
  people who signed up for tracking texts, then have two people review it.
- **Crypto and remote-access requests without urgency words.** "Send $500 in bitcoin…" or
  "Install AnyDesk so our technician can fix your account" get Insufficient Evidence with a strong
  warning, not Suspicious. The rules require pressure words (today, keep this secret…) before
  those two count as Tier 1. Either keep that and describe Suspicious more narrowly in the pitch,
  or decide they are always Tier 1.
- **Competition rules.** Check the official Congressional App Challenge rules for video length,
  eligibility and how to disclose development assistance. They were not available during the review.
- **What judges see on GitHub.** The default branch `main` is behind `release-v1`. Merge
  the finished work through a pull request when you are ready. Nothing has been pushed for you.
