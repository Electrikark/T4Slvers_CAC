# Reviewing reference records (a person's job)

No record in `data/store.js` has been reviewed by a person, so the real list can never give
**Details Match**. Demo 7 (the real USPS tracking link) shows Insufficient Evidence with
"its source record still needs review". That is the safe default, not a bug. This guide is the
part the code cannot do for you: a person checks each record against a primary source and signs it.

Don't add a review you did not do. A fixture or placeholder reviewer in the real list would make
Details Match claim something nobody checked.

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
3. Add this to the organization in `data/store.js`, with your own name and today's date:

   ```json
   "humanReview": {
     "reviewer": "<your name>",
     "date": "YYYY-MM-DD",
     "reviewDue": "YYYY-MM-DD",
     "sourceUrl": "<the primary source page>"
   }
   ```

4. **Review-due date.** The store's rule is 90 days after the review. After that date the record
   stops counting and the page says "the review of that record has expired". Pick your review
   date so the record is still in date on the day judges try the app, or plan to review again
   before then.
5. A few sources say `"check": "needs review: site refused the automated check"` (PNC, Golden 1,
   Best Buy/Geek Squad, DHL). Those domains stay in draft even with a `humanReview`. After you
   check one by hand, change that `check` text to say how you checked it.
6. Some domains can never count on their own, by design: `icloud.com`, `live.com`, `forms.gle`,
   `facebook.com` and `instagram.com` are places where anyone can have an address or a page.

## Check your work

```bash
npm test
```

Then open `index.html`, load demo 7, choose Text and press "Check this". With USPS reviewed it
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
  eligibility and how to disclose AI help with code. They were not available during the review.
- **What judges see on GitHub.** The default branch `main` is behind `release-v1`. Merge
  the finished work through a pull request when you are ready. Nothing has been pushed for you.
