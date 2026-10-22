# Verification and eligibility handoff

Contacts for 5 organizations were checked against their official websites, with source URLs and a 90-day expiry.

Source verification date: **2026-10-18, America/Los_Angeles**. All five rows have **K = 2026-10-18, L blank, N = 2027-01-16, O = Draft**. There are nine sourced contact records: five domains and four phone numbers. The reviewer fields remain blank for the user's later review. No human approval or independent two-reviewer verification is claimed. After that review, record the actual reviewer and date and recalculate expiry before approving each contact. The due date is inclusive; January 17 is expired.

**Reconciliation status:** Commit **acf26de** already existed before the user's commit hold. The repository workbook and the workbook bytes in that commit had the October 18 dates and blank reviewers. A separate local output copy still held the October 17 workbook. That stale export has been replaced from the repository workbook; subsequent edits add the two-volunteer release rule. The audit files capture the uncommitted reconciliation state. The user subsequently authorized a local commit on October 18, 2026. Nothing is pushed or merged, and no human contact approval is implied.

## Official-source verification

The exact recorded numbers and security excerpts were located on the cited pages and their surrounding context checked. Only the organization's own publications were used. Phone purposes and scope were checked separately from the numbers. G, J and P retain the exact source URLs; unsupported cells remain blank.

| Organization | Verified fields | Scope and gaps |
| --- | --- | --- |
| Chase | G: 1-800-935-9935 under Personal Banking Customer Service. I/J: the recorded sentence about moving money to resolve fraud. | Checking, savings and debit-card help; the security statement concerns a claimed fraud fix, not every transfer. Sender domain blank. |
| Wells Fargo | G: 1-800-869-3557 for personal accounts in the checking/savings/debit/ATM fraud section. H/P: wellsfargo.com explicitly appears in guidance about legitimate email addresses. I/J: the recorded software/screen-sharing sentence. | Does not authenticate an email or permit substring matching. The software sentence refers to remote-access/screen-sharing tools. Other specialized fraud numbers are outside this review. |
| USPS | G: 1-800-275-8777 under Customer Care Center. I/J: “and it will NOT contain a link.” | Preserve the paragraph's package-tracking service, registration or initiated text, and request with a tracking number, plus the next sentence about an unsolicited tracking message containing a link. Sender domain blank. |
| Amazon | I/J: the recorded gift-card-purchase excerpt. | Phone, phone purpose and phone-source cells remain blank because no official number was verified. Sender domain blank; a reporting mailbox does not establish outbound senders. |
| Social Security | G: 1-800-772-1213 on its phone page. I/J: the recorded sensitive/personal-information sentence. | The prohibition names social media, email and text. It is not a statement about every phone interaction. Sender domain blank. |

Exact citations and excerpts are retained in [the source ledger](five-organization-review.json) and [the workbook](five-organization-review.xlsx). Contact/security sources: [Chase contact](https://www.chase.com/digital/customer-service), [Chase security](https://www.chase.com/digital/resources/privacy-security/security/scam-stories), [Wells Fargo contact](https://www.wellsfargo.com/privacy-security/fraud/report/), [Wells Fargo security and email evidence](https://www.wellsfargo.com/privacy-security/fraud/bank-scams/bank-imposter/), [USPS contact](https://www.usps.com/help/contact-us.htm), [USPIS tracking guidance](https://www.uspis.gov/news/scam-article/smishing-package-tracking-text-scams), [Amazon guidance](https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams), [SSA phone](https://www.ssa.gov/agency/contact/phone.html), [SSA security](https://www.ssa.gov/scam/). USPS's contact page identifies Postal Inspectors as another USPS site.

## Confirmed decisions

**Amazon:** Keep the phone field blank until an official number is verified. An eligible domain alone can satisfy the contact requirement, provided every other assessment condition is met. When the trusted view supplies the unrestricted amazon.com record, the next-step card now says **“Open the Amazon app or type amazon.com yourself.”** Draft, expired, rejected, conflicting, incomplete or path-restricted records cannot supply that specific navigation advice. Existing generic fallback advice remains available.

**USPS:** Keep the quote as documentation only and preserve the source conditions. `data/policies.js`, the detector, and the assessment gate were not changed. The existing USPS detection-policy draft remains inactive and still requires its separate two-reviewer process. The new [release policy](../../RELEASE.md) also requires two distinct trained volunteers to independently review every contact before pilot approval. The contact engine currently checks one reviewer field, so this two-person release gate must be checked manually. Contact approval does not approve a detection policy.

## Audit and implementation

The earlier work was committed locally as **4142bac**, on **review/five-organizations-2026-10-17**. Its seven files were `data/store.js`, `package.json`, `tests/five-org-review.cjs`, and four files under `docs/testing/`: `five-organization-handoff.md`, `five-organization-review.json`, `five-organization-review.xlsx`, and `five-organization-test-results.json`. The executable tests and JSON results existed on disk and were committed; they were not inferred from the workbook's Eligibility Results tab. The earlier full-suite output was summarized in the handoff; a complete saved stdout log was not part of that commit.

The earlier snapshot commit **966a32b** approximated release **305cbdf**. Exact comparison found an extra trailing blank line in each of 26 files, including `js/engine/risk.js` and `tests/tier-cases.js`; it did not omit their gift-card fix. This pass verified the GitHub release ref and recovered the exact release commit and tree through read-only GitHub access because shell Git fetch could not resolve GitHub. The imported commit SHA and tree SHA were checked, and the release commit is a local shallow boundary; remote ancestry before it was not imported.

The implementation plan has been carried out:

1. Create **review/eligibility-workflow-2026-10-18** directly from actual **305cbdf3e7b66fc6e143fc6b29423a6fee8d0518**. Preserve the original working copy and previous review branch.
2. Carry the prior seven-file review onto that base as **fd8d0e2**. Update only the five source-documented organizations: source dates, 90-day expiry, blank reviewer fields, Draft statuses and scoped notes. No row has been promoted to approved.
3. Add the Amazon navigation wording in `js/engine/copy.js`. Reuse the 36 existing five-organization checks and NS1–NS8 rather than creating another overlapping suite. Enhance the existing report with input messages, verdict traces, next steps, named outcomes and the actual-store Chase result. Derive the next-day expiry test from the due date.
4. Update the existing workbook and handoff. Save full test output and summary, then commit locally. No push, merge, deployment or GitHub write is authorized by this handoff.

The current task additionally changes `js/engine/copy.js` and adds `docs/testing/five-organization-checks.log` and `docs/testing/five-organization-checks.json`. `package.json` already runs the reused review suite. Unrelated organizations retain their existing values and formatting. The workbook keeps its two sheets and source columns; its Eligibility Results tab is a reference view of actual saved results.

## Saved tests and Chase result

**npm test: 1,252/1,252 pass, exit 0.** This comprises 1,165 shared engine checks, 36 source-gate parity checks, 2 boundaries, 12 evaluation-harness checks, 1 app-element contract check and 36 five-organization checks. Generated-gate freshness and `git diff --check` also pass. These are deterministic checks, not field-accuracy measurements.

Full output: [five-organization-checks.log](five-organization-checks.log). Command, count, time and branch: [five-organization-checks.json](five-organization-checks.json). Actual outcomes and traces: [five-organization-test-results.json](five-organization-test-results.json). Executable source: [tests/five-org-review.cjs](../../tests/five-org-review.cjs); existing next-step checks: [tests/next-steps-cases.js](../../tests/next-steps-cases.js). No additional overlapping named cases were added.

| State, exercised for every organization | Result for the clean official-link message | That record's contact/navigation |
| --- | --- | --- |
| Approved and current, scenario copy only | Details Match | Available |
| Expired | Insufficient Evidence | Excluded |
| Rejected | Insufficient Evidence | Excluded |
| Draft | Insufficient Evidence | Excluded |

The exact clean message is **“Chase: Information is available at https://chase.com.”** With a hypothetical approved, current record it returns `details_match`, trace `DM_ALL_CONDITIONS`, two eligible contacts and the reviewed chase.com navigation line. The same message against the actual Draft store returns `insufficient_evidence`, with `NO_VERIFIED_CONTACT` and `UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT` blockers.

**“Chase: Pay with gift cards today. Visit https://chase.com.”** remains `suspicious`, trace `T1-GIFT`, even though the domain check returns SUPPORTS. The matching address does not cancel the warning. The real store remains Draft throughout these scenarios.

## Verification limits

Browser startup initially failed, but later recovered and loaded Chase's official contact page. Local app UI verification remained blocked: the browser disallowed file URLs and the workspace could not bind a localhost server. Direct official-URL retrieval and exact-text find were used for the original source pass; manual Cmd+F was not completed. The engine output was tested and `js/app.js` was inspected to confirm its `details_match` → “Details Match” label mapping. A live visual UI pass is not claimed.

The current workbook is the previously reconstructed review workbook; the original attached template had been unavailable. This pass edited that existing reconstruction, preserved its unrelated table cells and both tabs, rendered the changed views, and found no formula-error markers. Source limitations and pending human-review fields remain visible. The Cloud Environment skill was read, but no callable managed-environment status tool was exposed; all local implementation and Node checks used the current local workspace.

## Reconciliation checks and pilot boundary

The added `python3 tests/review-artifact-consistency.py` check compares the real store, source ledger, workbook K/L/N/O fields, security excerpts, expiry explanation, and all 20 Eligibility Results dates. It rejected the stale output workbook with `Chase: stale workbook date`, confirming that it catches this incident rather than merely repeating engine assertions. It must pass on both the repository workbook and the synchronized export; saved results are in `docs/testing/workbook-consistency.json`.

The requested Git status, five-commit log, branch and store grep output are saved in `docs/testing/reconciliation-audit.txt`. The latest full engine run is saved in `docs/testing/reconciliation-npm-test.log`. The workbook's Eligibility Results tab is a reference, not a replacement for these executable checks.

Before the October 19 pilot, both human volunteers must independently sign off on each contact and the exact selected build. Until then the real records stay Draft, and the clean Chase message correctly remains Insufficient Evidence. If the reviews are incomplete, pilot notes must say: **"Details Match was not evaluated with approved real-organization records; those records remained Draft."** Any simulated three-outcome usability work must be identified separately. No build has been newly tagged, released or deployed.
