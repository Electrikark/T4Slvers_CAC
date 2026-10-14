# Task 3: instruction recognition matrix

## Sender's own request — open

`directAction` currently misses first- and third-person requests unless a
recognized instruction such as “please” immediately precedes the action.
These are follow-up acceptance targets, not passing-test claims. They must
be fixed separately from reporting scope.

| Row | Message | Current behavior | Required finding and verdict |
| --- | --- | --- | --- |
| OWN1 | We ask you to pay with gift cards. | No flags; Insufficient Evidence | `gift_card_payment`, `T1-GIFT`; Suspicious |
| OWN2 | We need you to pay with gift cards. | No flags; Insufficient Evidence | `gift_card_payment`, `T1-GIFT`; Suspicious |
| OWN3 | Chase requests that you pay with gift cards. | No flags; Insufficient Evidence | `gift_card_payment`, `T1-GIFT`; Suspicious |
| OWN4 | We ask you to please pay with gift cards. | `T1-GIFT`; Suspicious | Preserve `gift_card_payment`, `T1-GIFT`; Suspicious |
| OWN5 | Due to fraudsters we ask you to pay with gift cards today. | No flags; Insufficient Evidence | `gift_card_payment`, `T1-GIFT`; Suspicious |
| OWN6 | Fraudsters are active and Chase asks you to send the fee by wire transfer today. | No flags; Insufficient Evidence | `crypto_or_wire`, `T1-WIRE`; Suspicious |
| OWN7 | Fraudsters may ask you to pay with gift cards. | No flags; Insufficient Evidence | Preserve no findings; Insufficient Evidence |
| OWN8 | We never ask you to pay with gift cards. | No flags; Insufficient Evidence | Preserve no findings; Insufficient Evidence |

Implement and test reporting subjects first, then expand recognition of the
sender's own request. The reporting-scope repair supplies that prerequisite.
Add failing tests for OWN1–OWN3 and OWN5–OWN6 before changing `directAction`;
retain OWN4, OWN7 and OWN8 as controls. Test both findings and verdicts in the
shared Node/browser harness, and retain the existing wire-pressure threshold.

## Real warning wording — required controls

W1–W4 must stay quiet when task 3 widens instruction recognition. Today the
plain versions produce no flags because `directAction` does not recognize the
embedded request. Adding “please” immediately before “pay” exposes the separate
reporting weakness: all four then produce `gift_card_payment`, `T1-GIFT` and
Suspicious. Current quiet behavior is therefore not evidence that reporting
scope recognizes these warnings.

| Row | Message | Required finding and verdict |
| --- | --- | --- |
| W1 | Scammers posing as Chase may ask you to pay with gift cards. | No request-risk findings; Insufficient Evidence |
| W2 | Fraudsters pretending to be the IRS may demand that you pay with gift cards. | No request-risk findings; Insufficient Evidence |
| W3 | Scam callers may ask you to pay with gift cards. | No request-risk findings; Insufficient Evidence |
| W4 | Criminals often ask victims to pay with gift cards. | No request-risk findings; Insufficient Evidence |

Add failing controls for the versions with “please,” as well as the plain
versions, before widening `directAction`. Task 3 cannot ship until both forms
of W1–W4 stay quiet and the OWN rows reach their required results in the shared
Node/browser harness. Quiet does not authenticate a sender; these messages
have no supporting contact and therefore remain Insufficient Evidence.

Likely reporting changes to investigate first:

- Allow a bounded description of the reporting subject: “posing as,”
  “pretending to be,” “claiming to be,” or “impersonating,” followed by a short
  name. Keep the existing new-subject regressions: the description must not
  swallow “and we,” “Chase asks,” or another independent asker.
- Recognize “scam callers/texts/emails/messages” as reporting subjects.
- Accept a small set of recipient nouns in `ASKING`, including “victims,”
  “seniors,” and “customers.”

No sender-attribution, trusted-reference or organization-policy changes are
part of these row families.
