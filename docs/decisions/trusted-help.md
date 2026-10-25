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
  channel, or the National Elder Fraud Hotline with its real purpose and limits.

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
  Monday–Friday, 10 a.m.–6 p.m. Eastern, closed on some holidays. It is not a service that checks
  messages, and the panel says so.

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
