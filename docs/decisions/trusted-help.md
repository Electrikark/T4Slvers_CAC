# Decision: "You don't have to decide alone" under every result

Status: **done, Oct 24, 2026. Chosen by Naman.**

## What changed

A panel on `check.html`, directly after "Before you act" and before "What to do next":

- **Call someone you trust.** Open your phone's Contacts and use their saved number, not a new
  number from the message.
- **Ask for help by message.** A fixed request, "I received a message and want help checking it
  before I act. Can you call me?", with **Share this request** (the phone's own share menu) and
  **Copy this request**.
- **Support, not proof.** Someone you trust can help you think, but cannot confirm who sent the
  message. For a family emergency, reach the person on a number you already have; for a bank or
  company, use its official app or the number on your card or statement.
- **No one available? View other ways to get help.** Contact the organization through its own
  channel, AARP for guidance about a possible scam, or the National Elder Fraud Hotline for reporting support. Both show hours and service limits.

It is open under every Suspicious or Insufficient Evidence result, and folded (one tap away) under
Details Match. It never changes the result.

## Choices

- **A generic request, never the message.** Forwarding the original could pass on private details,
  a code or a harmful link, so neither the message nor a screenshot is ever shared or copied. If
  forwarding is offered later, it needs an editable preview that asks the reader to remove codes and
  private details first.
- **No saved numbers, no dialing.** A `tel:` link can hand a number to the phone, and some browsers
  can pick a contact, but this site does not know who the reader trusts and does not store anything.
  The reader uses the number already saved in their own phone.
- **Honest about sharing.** The site sends nothing. The app the reader picks sends the request and
  may keep a copy; the panel and the About page say so.
- **Fallbacks.** Share shows only where the browser has a share menu; Copy only where it can copy.
  If sharing fails, the reader is told to copy the request or read it out on the phone. With
  neither, the request is still on screen.
- **Hotline limits.** From the [Stop Elder Fraud FAQ](https://ovc.ojp.gov/program/stop-elder-fraud/faqs)
  (checked Oct 24, 2026): age 60 or older, suspected financial fraud, case managers who help report
  it and give resources and referrals; it does not investigate, and cannot promise money back.
  Monday–Friday, 10 a.m.–6 p.m. Eastern, closed on some holidays. The panel describes its reporting
  role without claiming that people must have confirmed losses before calling.

## Validation

- `npm test`, including `tests/trusted-help-node.cjs`: placement, wording, the request read only
  from its own element, no code path from sharing or copying to the result, and the hotline limits.
- `npm run test:ocr-browser`, including `tests/ocr-browser/trusted.spec.cjs`: with the share menu
  and clipboard replaced by stand-ins, only the request is handed over; the result and the message
  stay the same; Share hides without a share menu; a failed share says what else to do; with
  neither, the request is still readable; a new check clears the status.

Not established here: whether an older adult can find the panel, choose a trusted contact route
and ask for help without assistance. That needs a small usability test, and the panel alone does
not show that it prevents fraud.

## AARP addition: local preview, October 24, 2026

AARP appears first under "No one available?" and above the federal hotline on the recovery page.
Its call link uses `tel:+18779083360`; the federal link remains `tel:+18333728311`.
Both numbers stay visible on devices without a phone app. Each card links to its official service details.
No new JavaScript, stored contact details, or message sharing was added. Asking for help never changes the result.

AARP: free guidance for a possible scam, no membership needed, Monday–Friday, 8 a.m.–8 p.m. Eastern.
It does not investigate cases or recover money. Federal hotline: reporting support for suspected financial
fraud involving adults age 60 or older, with no claim that a loss must already be confirmed.
The panel provides guidance outside service hours and routes people who sent money to recovery steps.

Sources checked October 24, 2026:
- https://www.aarp.org/money/scams-fraud/helpline/
- https://www-cg.aarp.org/money/scams-fraud/helpline/?intcmp=fwn-scm-map-promo
- https://ovc.ojp.gov/program/stop-elder-fraud/faqs

The recovery topics remain drafts with `approvedBy` and `approvedOn` unchanged.
Their AARP text and source were updated in data/help-cards.js, then recover.html was regenerated.

Validation: `npm test` passed. The 12 existing trusted-help and site browser checks passed, including
share/copy fallbacks, result preservation, mobile page layouts, enlarged text, and recovery access
without JavaScript. The first browser run could not launch Chromium inside the sandbox; the rerun
outside that restriction passed. The checker was also rendered and inspected in the in-app browser.
No calls were placed. Actual phone dialer handoff and older-adult usability have not been tested.
Nothing has been pushed or deployed; this preview awaits the user's review.

### Readability pass

Shortened both helpline cards after user review. The first view keeps each service’s purpose,
number, hours, cost, and age eligibility visible. Native “Service details” disclosures hold
service limits, official links, languages, and source dates; they work without JavaScript.
Repeated headings and long explanations were removed. Payment and emergency routes remain visible.
