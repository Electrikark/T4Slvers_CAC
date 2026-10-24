# Human review preparation

Recorded October 22, 2026, in America/Los_Angeles.

Naman Raichura states that he checked all 46 original organizations and authorizes his name on the review fields. His prior notes are on an old laptop and are not available here. This records his statement; it does not claim a new source check by the agent.

Each of the 46 records in `data/store.js` now has `humanReviewDraft` with his name, `status: "evidence_pending"`, and `attestedOn: "2026-10-22"`. The actual check date, due date and approval source page stay null. The engine reads `humanReview`, not `humanReviewDraft`, so these drafts do not enable Details Match. HSBC, Royal Mail and E-ZPass are outside this approval scope and stay unchanged.

## What remains

Supply the real check date and official source evidence for the exact listed domains and phones. A shared date can be applied in one edit if it is the real date for all 46. The due date is that check date plus 90 days. Existing retrieval dates and candidate links below are research notes, not proof of what Naman checked.

Once those fields are complete, replace each draft with a complete `humanReview` (reviewer, date, reviewDue, sourceUrl), remove the preparation status and attestation-only fields from the active object, and update `verifiedBy` to `Reviewed by Naman Raichura`. If one page does not support every contact, approve contacts separately with their own sources. Retain the attestation history in this file.

Do not remove a blocked-domain note until its manual check date and source are known. PNC, Golden 1, Best Buy, Geek Squad and DHL retain those blocks. Do not mark existing draft phone records reviewed using a domain-only source. No extra phone numbers were added.

After completing the evidence, run the required app checks, the seven demos and the strict dev evaluation with a reference date on or after the check dates. Preserve the before-review report. Tag the final build only after validation. No held-out evaluation is part of this preparation.

## Existing source candidates

These URLs are copied from stored research. They were not fetched or revalidated during this preparation. Every listed contact remains pending; a link alone is not approval.

| Organization | ID | Listed domains | Listed phones | Stored source candidates |
| --- | --- | --- | --- | --- |
| Chase | `chase` | chase.com | 1-800-935-9935 | [Source 1](https://www.chase.com/digital/resources/privacy-security); [Source 2](https://www.chase.com/digital/customer-service) |
| Bank of America | `bankofamerica` | bankofamerica.com | None listed | [Source 1](https://www.bankofamerica.com/) |
| Wells Fargo | `wellsfargo` | wellsfargo.com | 1-800-869-3557 | [Source 1](https://www.wellsfargo.com/); [Source 2](https://www.wellsfargo.com/privacy-security/fraud/report/) |
| Citi | `citi` | citi.com, citibank.com | None listed | [Source 1](https://www.citi.com/) |
| U.S. Bank | `usbank` | usbank.com | None listed | [Source 1](https://www.usbank.com/index.html) |
| Capital One | `capitalone` | capitalone.com | None listed | [Source 1](https://www.capitalone.com/) |
| PNC Bank | `pnc` | pnc.com | None listed | [Source 1](https://pnc.com/) |
| Navy Federal Credit Union | `navyfederal` | navyfederal.org | None listed | [Source 1](https://www.navyfederal.org/) |
| Golden 1 Credit Union | `golden1` | golden1.com | None listed | [Source 1](https://golden1.com/) |
| American Express | `amex` | americanexpress.com | None listed | [Source 1](https://www.americanexpress.com/) |
| PayPal | `paypal` | paypal.com | None listed | [Source 1](https://www.paypal.com/us/home) |
| Venmo | `venmo` | venmo.com | None listed | [Source 1](https://venmo.com/) |
| Zelle | `zelle` | zellepay.com, zelle.com | None listed | [Source 1](https://www.zelle.com/) |
| Cash App | `cashapp` | cash.app | None listed | [Source 1](https://cash.app/) |
| Amazon | `amazon` | amazon.com | None listed | [Source 1](https://www.aboutamazon.com/news/retail/how-to-avoid-amazon-scams) |
| Apple | `apple` | apple.com, icloud.com | None listed | [Source 1](https://www.apple.com/); [Source 2](https://www.icloud.com/) |
| Microsoft | `microsoft` | microsoft.com, microsoftonline.com, live.com, office.com, cloud.microsoft | None listed | [Source 1](https://www.microsoft.com/); [Source 2](https://login.microsoftonline.com/); [Source 3](https://outlook.live.com/mail/); [Source 4](https://m365.cloud.microsoft/) |
| Google | `google` | google.com, forms.gle | None listed | [Source 1](https://www.google.com/); [Source 2](https://forms.gle/) |
| Meta (Facebook, Instagram, WhatsApp) | `meta` | meta.com, facebook.com, instagram.com, whatsapp.com | None listed | [Source 1](https://www.meta.com/); [Source 2](https://www.facebook.com/); [Source 3](https://www.instagram.com/); [Source 4](https://www.whatsapp.com/) |
| Netflix | `netflix` | netflix.com | None listed | [Source 1](https://www.netflix.com/unsupportedbrowser) |
| Geek Squad (Best Buy) | `geeksquad` | bestbuy.com, geeksquad.com | None listed | [Source 1](https://bestbuy.com/); [Source 2](https://geeksquad.com/) |
| Norton | `norton` | norton.com | None listed | [Source 1](https://us.norton.com/) |
| McAfee | `mcafee` | mcafee.com | None listed | [Source 1](https://www.mcafee.com:443/) |
| DocuSign | `docusign` | docusign.com, docusign.net | None listed | [Source 1](https://www.docusign.com/); [Source 2](https://na2.docusign.net/) |
| Walmart | `walmart` | walmart.com | None listed | [Source 1](https://www.walmart.com/) |
| Costco | `costco` | costco.com | None listed | [Source 1](https://www.costco.com/) |
| AT&T | `att` | att.com | None listed | [Source 1](https://www.att.com/) |
| Verizon | `verizon` | verizon.com | None listed | [Source 1](https://www.verizon.com/) |
| T-Mobile | `tmobile` | t-mobile.com | None listed | [Source 1](https://www.t-mobile.com/) |
| Xfinity (Comcast) | `xfinity` | xfinity.com, comcast.com | None listed | [Source 1](https://www.xfinity.com/) |
| PG&E | `pge` | pge.com | None listed | [Source 1](https://www.pge.com/) |
| SMUD | `smud` | smud.org | None listed | [Source 1](https://www.smud.org/) |
| USPS | `usps` | usps.com | 1-800-275-8777 | [Source 1](https://www.usps.com/); [Source 2](https://www.usps.com/help/contact-us.htm) |
| UPS | `ups` | ups.com | None listed | [Source 1](https://www.ups.com/) |
| FedEx | `fedex` | fedex.com | None listed | [Source 1](https://www.fedex.com/) |
| DHL | `dhl` | dhl.com | None listed | [Source 1](https://dhl.com/) |
| IRS | `irs` | irs.gov | None listed | [Source 1](https://www.irs.gov/) |
| Social Security Administration | `ssa` | ssa.gov | 1-800-772-1213 | [Source 1](https://www.ssa.gov/); [Source 2](https://www.ssa.gov/agency/contact/phone.html) |
| Medicare | `medicare` | medicare.gov, cms.gov | None listed | [Source 1](https://www.medicare.gov/); [Source 2](https://www.cms.gov/) |
| Federal Trade Commission | `ftc` | ftc.gov | None listed | [Source 1](https://www.ftc.gov/) |
| California DMV | `cadmv` | dmv.ca.gov | None listed | [Source 1](https://www.dmv.ca.gov/) |
| California EDD | `caedd` | edd.ca.gov | None listed | [Source 1](https://edd.ca.gov/) |
| FasTrak (Bay Area) | `fastrak` | bayareafastrak.org | None listed | [Source 1](https://www.bayareafastrak.org/en/home/index.shtml) |
| The Toll Roads (Orange County) | `tollroads` | thetollroads.com | None listed | [Source 1](https://thetollroads.com/) |
| AARP | `aarp` | aarp.org | None listed | [Source 1](https://www.aarp.org/) |
| Publishers Clearing House | `pch` | pch.com | None listed | [Source 1](https://www.pch.com/) |
