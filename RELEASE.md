# Human review and pilot release gate

Automated source research and passing tests do not constitute human approval.

## Two-volunteer review

Before any contact is approved for a pilot or release, **two distinct trained human volunteers must independently open its exact official source URL and confirm its value, purpose, scope and surrounding source wording**. Neither reviewer may use the other's completed check as their evidence. A repeated check by one person is not an independent second review.

Record both reviewers' real names, actual review dates, source URLs, decisions and limitations for each contact. Use workbook column L for the first reviewer and column M (Notes), or a linked contact-level review log, for the second reviewer. A row containing a domain and phone must show that both volunteers reviewed each contact separately. Leave unsupported fields blank.

Until both reviews are documented and any disagreement is resolved, keep workbook status Draft and contact `status: "draft"`. After both approve, the workbook may say Approved and the contact may use `status: "reviewed"`. Set `reviewedBy` to the documented first reviewer, preserve the second review in the linked review log, set `checkedOn` to the actual completed review date, and set `reviewDue` to 90 calendar days later. A due date is inclusive; the next day is expired. Recheck on source changes and after expiry.

The current contact matcher requires one nonempty `reviewedBy` field; **it does not automatically enforce this two-person release gate**. The release owner must check both documented reviews before changing contact status or approving a build. Detection-policy records separately require distinct `reviewed_by` and `second_reviewer` fields in the existing policy engine. Approving contact records does not approve an organization detection policy.

## Release checklist

- Confirm `data/store.js`, the source ledger and `docs/testing/five-organization-review.xlsx` agree on values, dates, reviewer fields, status and 90-day expiry. Check the workbook's expiry explanation and Eligibility Results dates too.
- Run `npm test` and save the complete output. Run `python3 tests/review-artifact-consistency.py` to check the workbook against the source ledger and real contact records. Passing engine checks alone does not validate an exported or uploaded workbook.
- Use the repository workbook as the authoritative export. Compare copied export bytes before handing it off; do not use an old output or Downloads copy.
- Check the clean Chase scenario on the selected build. Actual Draft records must return Insufficient Evidence. Details Match requires an eligible contact and every other gate condition; separate suspicious findings must still win.
- Keep Amazon's phone blank unless an official number is verified. Its eligible domain can satisfy the contact requirement without a phone.
- Keep the USPS tracking quote as documentation with its source conditions. Do not turn it into a broader detection rule or activate the existing draft policy.
- Record the tested build/commit and the complete human review log for the exact pilot build. A build with pending review is not approved for live-record Details Match.

## October 19, 2026 pilot

All five organizations currently remain Draft, with no recorded human approvals. Hypothetical approved fixtures test software behavior only; label them as simulated data and keep them separate from live-record validation.

If both volunteers' reviews cannot be completed before the pilot, keep the records Draft and record: **"Details Match was not evaluated with approved real-organization records; those records remained Draft."** If a separately labeled simulated three-outcome usability exercise is run, report it separately.

Do not create a release tag, merge, push or deploy until the review and build checks are complete and that action is authorized. The user authorized a local commit of the reconciliation changes on October 18, 2026; this does not approve the contact records or authorize a push.
