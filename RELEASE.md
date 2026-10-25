# Human review and pilot release gate

Automated source research and passing tests do not constitute human approval.

## Two-volunteer review

Before any contact is approved for a pilot or release, **two distinct trained human volunteers must independently open its exact official source URL and confirm its value, purpose, scope and surrounding source wording**. Neither reviewer may use the other's completed check as their evidence. A repeated check by one person is not an independent second review.

Record both reviewers' real names, actual review dates, source URLs, decisions and limitations for each contact. Use workbook column L for the first reviewer and column M (Notes), or a linked contact-level review log, for the second reviewer. A row containing a domain and phone must show that both volunteers reviewed each contact separately. Leave unsupported fields blank.

Until both reviews are documented and any disagreement is resolved, keep workbook status Draft and contact `status: "draft"`. After both approve, the workbook may say Approved and the contact may use `status: "reviewed"`. Set `reviewedBy` to the documented first reviewer, preserve the second review in the linked review log, set `checkedOn` to the actual completed review date, and set `reviewDue` to 90 calendar days later. A due date is inclusive; the next day is expired. Recheck on source changes and after expiry.

The current contact matcher requires one nonempty `reviewedBy` field and rejects template values such as `REVIEWER_NAME`; **it does not automatically enforce this two-person release gate**. `tests/review-placeholders.cjs`, part of `npm test`, checks that every reviewed contact names a reviewer, cites an https source page, carries a real check date and a 90-day due date that has not passed, and agrees with the review record and the saved test report. It checks one reviewer, not two. The release owner must check both documented reviews before changing contact status or approving a build. Detection-policy records separately require distinct `reviewed_by` and `second_reviewer` fields in the existing policy engine. Approving contact records does not approve an organization detection policy.

## Release checklist

- Confirm `data/store.js`, the source ledger and `docs/testing/five-organization-review.xlsx` agree on values, dates, reviewer fields, status and 90-day expiry. Check the workbook's expiry explanation and Eligibility Results dates too.
- Run `npm test` and save the complete output. Run `python3 tests/review-artifact-consistency.py` to check the workbook against the source ledger and real contact records. Passing engine checks alone does not validate an exported or uploaded workbook.
- Use the repository workbook as the authoritative export. Compare copied export bytes before handing it off; do not use an old output or Downloads copy.
- Check the clean Chase scenario on the selected build. Actual Draft records must return Insufficient Evidence. Details Match requires an eligible contact and every other gate condition; separate suspicious findings must still win.
- Keep Amazon's phone blank unless an official number is verified. Its eligible domain can satisfy the contact requirement without a phone.
- Keep the USPS tracking quote as documentation with its source conditions. Do not turn it into a broader detection rule or activate the existing draft policy.
- Record the tested build/commit and the complete human review log for the exact pilot build. A build with pending review is not approved for live-record Details Match.

## Single-reviewer exception (October 24, 2026)

On October 24, 2026 the release owner, Naman Raichura, approved one exception to the two-volunteer rule above.

- **Scope.** Only the nine contacts of the five organizations listed in `docs/testing/five-organization-review.json`: Chase, Wells Fargo, USPS, the Social Security Administration and Amazon. Every other organization, and every contact added later, follows the two-volunteer rule.
- **Reason.** A second trained volunteer could not complete an independent review before the Congressional App Challenge submission.
- **What the one review must still do.** One named trained volunteer opens each exact official source URL and confirms its value, purpose, scope and surrounding source wording, the same check this file asks of each of the two volunteers.
- **How it is recorded.** Run `python3 scripts/record-review.py --reviewer "<name>" --date <YYYY-MM-DD>` after the review. It writes the reviewer, the actual review date and the 90-day due date into `data/store.js`, the review record, workbook columns K, L, N and O, and the regenerated test report, then runs the review gate and `tests/review-artifact-consistency.py`. Workbook column M records no second review; none took place.
- **When it ends.** On the contacts' recorded `reviewDue` date, or as soon as a source page changes, whichever comes first. Re-review after that follows the two-volunteer rule.
- **What it does not approve.** No organization detection policy. Policies still require distinct `reviewed_by` and `second_reviewer` fields.

Public descriptions of the app, including the competition submission, say that these records were checked by one reviewer.

## October 19, 2026 pilot

At the time of this pilot, all five organizations remained Draft, with no recorded human approvals. The single-reviewer exception above changes that for later builds. Hypothetical approved fixtures test software behavior only; label them as simulated data and keep them separate from live-record validation.

If both volunteers' reviews cannot be completed before the pilot, keep the records Draft and record: **"Details Match was not evaluated with approved real-organization records; those records remained Draft."** If a separately labeled simulated three-outcome usability exercise is run, report it separately.

Do not create a release tag, merge, push or deploy until the review and build checks are complete and that action is authorized. The user authorized a local commit of the reconciliation changes on October 18, 2026; this does not approve the contact records or authorize a push.
