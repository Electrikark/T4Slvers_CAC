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

No sender-attribution, trusted-reference or organization-policy changes are
part of this row family.
