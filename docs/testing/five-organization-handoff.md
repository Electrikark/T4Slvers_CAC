# Five-Organization Review

Contacts for 5 organizations were checked against their official websites, with source URLs and a 90-day expiry.

Review date: **2026-10-17, America/Los_Angeles**. Reviewer: **ChatGPT (AI-assisted source review; human approval pending)**. Review due: **2027-01-15**, exactly 90 calendar days later. The existing engine treats reviewDue as inclusive: the record becomes expired on January 16. The five organizations contain nine sourced contact records: five domains and four US phone numbers. All remain **Draft**.

## What changed

`data/store.js` now records contact-level source URLs, reviewer, review date, expiry and draft status for Chase, Wells Fargo, USPS, Amazon and Social Security. The store retains the existing `contacts` schema. Supporting security excerpts and published sender-domain evidence are documented separately and do not enable new policy rules. Other organizations were not changed. No `humanReview` approval was added.

The source ledger is [five-organization-review.json](five-organization-review.json). The reconstructed workbook is [five-organization-review.xlsx](five-organization-review.xlsx). A human reviewer must recheck each contact before changing its status to `reviewed`. A valid domain match never authenticates a sender or clears a separate suspicious finding.

## Source findings and gaps

| Organization | Main domain | Phone reviewed and purpose | Missing fields or scope limits |
| --- | --- | --- | --- |
| Chase | chase.com | 1-800-935-9935; personal banking customer service | Sender domain blank. The published reporting inbox does not establish outbound senders. The independent card/account-statement instruction is preserved in the ledger. |
| Wells Fargo | wellsfargo.com | 1-800-869-3557; checking, savings, debit or ATM card fraud | Official security guidance explicitly identifies wellsfargo.com in legitimate email addresses. This is domain evidence, not sender authentication. Other specialized fraud numbers were not added. |
| USPS | usps.com | 1-800-275-8777; Customer Care Center | Sender domain blank. No-link wording was verified against the Postal Inspection Service and kept within its requested package-tracking notification context. The five-digit tracking short code was not treated as a callable phone. |
| Amazon | amazon.com | Blank | Official contact flow returned 503; no phone number was inferred. Sender domain blank. The published scam-report inbox is an inbound contact, not an outbound sender list. |
| Social Security | ssa.gov | 1-800-772-1213; National 800 Number | Sender domain blank. The personal-information prohibition is scoped to social media, email and text. |

Official contact sources: [Chase](https://www.chase.com/digital/customer-service), [Wells Fargo](https://www.wellsfargo.com/privacy-security/fraud/report/), [USPS](https://www.usps.com/help/contact-us.htm), [Amazon guidance and contact route](https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams), and [Social Security](https://www.ssa.gov/agency/contact/phone.html). Exact security excerpts and their URLs are in the ledger and workbook. USPS links to its Postal Inspectors from [its tracking FAQ](https://www.usps.com/text-tracking/welcome.htm); the [Inspection Service's smishing article](https://www.uspis.gov/news/scam-article/smishing-package-tracking-text-scams) supplies the no-link excerpt.

## Approval policy

The inspected [release README](../../README.md) and [reviewed-next-steps decision](../decisions/reviewed-next-steps.md) require human review and a reviewed, current, complete, conflict-free contact record. AI source research does not fulfill that human requirement. No explicit two-human rule was found in the inspected release policy; no human approval or independent second review is claimed. If the project applies a separate two-reviewer policy, both reviews remain outstanding. Approved is represented by `status: "reviewed"` in the engine, not by the literal word `Approved`.

Before approving: independently open each exact source URL, confirm value and service purpose, confirm scope, record the actual human reviewer and actual review date, recalculate the 90-day due date, and make a decision for each contact. Leave unsupported fields blank. Do not use `humanReview` to blanket-approve legacy lists. The separate security notes are not approved T1-POLICY records.

## Tests

`npm test` passes: **1,165 shared engine checks**, **36 source-gate parity checks**, **2 boundaries**, **12 evaluation-harness checks**, **1 app-element contract check**, and **36 new review checks**. Total: **1,252/1,252**. Generated gate freshness also passes. These are deterministic behavior checks, not measurements of field accuracy. No held-out evaluation messages were run.

The new command is `node tests/five-org-review.cjs --write-report`. It uses explicit dates and scenario-only copies of the five records. [Machine-readable results](five-organization-test-results.json) contain all 20 organization/state outcomes. Those hypothetical approvals never modify real stored draft statuses.

| Record state | Neutral official-link message | Trusted contacts from that organization | Specific website in next-step card |
| --- | --- | --- | --- |
| Approved and current | Details Match, with all other gate conditions met | Available | Shown |
| Expired | Insufficient Evidence | None | Hidden; generic fallback |
| Rejected | Insufficient Evidence | None | Hidden; generic fallback |
| Draft | Insufficient Evidence | None | Hidden; generic fallback |

Each state was exercised for all five organizations and each stored contact. Additional checks establish that an approved official link cannot clear a gift-card demand, a missing source blocks eligibility, due-day behavior is inclusive, and the actual store remains entirely unapproved. The existing card offers a reviewed website or a generic trusted-number instruction; it does not render stored phone numbers as a new phone card. Phone eligibility is tested through `trustedMatches`.

## Limitations and local handoff

The attached `reference-check-sheet.xlsx` could not be downloaded because the transfer host could not resolve, and the file reader exposed no cells. The delivered workbook is therefore a **reconstruction of the requested A–L fields**, with Notes, expiry, status and sender-source columns added. It is not an edit of the original. Original formatting, validations, hidden contents and worksheet instructions could not be verified. The original file was not overwritten.

Interactive browser startup failed. Official URLs were opened directly using web retrieval, with no search queries, search results, ads or third-party directories. Manual browser completion and ten-minute timing per organization are not claimed. No numbers were supplied from memory.

The original local working copy contained unrelated edits and was not changed. The isolated repository is `review-five-organizations`, branch `review/five-organizations-2026-10-17`. GitHub was read only. Nothing was pushed, published, merged or deployed. The local base snapshot reproduces the 26 files changed between local commit `24ec48834d2fe58d6255ef31460a480355487c48` and release-v1 commit `305cbdf3e7b66fc6e143fc6b29423a6fee8d0518`; that snapshot has its own local commit identity, not the remote commit's history. Apply only the review commit or review patch onto the current release when a later repository update is authorized.
