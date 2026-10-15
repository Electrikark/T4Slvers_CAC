# Task 3: instruction recognition matrix

All hand rows use record state `none` and the frozen date 2026-10-12. Their
expectations are hand-decided, not read from app output. They accompany 768
generated rows (32 sentence templates in 11 surface variants plus record states).

## Sender's own requests

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| OWN1 | We ask you to pay with gift cards. | gift_card_demand | Suspicious |
| OWN2 | We need you to pay with gift cards. | gift_card_demand | Suspicious |
| OWN3 | Chase requests that you pay with gift cards. | gift_card_demand | Suspicious |
| OWN4 | We ask you to please pay with gift cards. | gift_card_demand | Suspicious |
| OWN5 | Due to fraudsters we ask you to pay with gift cards today. | gift_card_demand | Suspicious |
| OWN6 | Fraudsters are active and Chase asks you to send the fee by wire transfer today. | wire_demand | Suspicious |
| OWN7 | We ask you to read us your verification code. | code_request | Suspicious |
| OWN8 | We need you to install remote access software today. | remote_access | Suspicious |

OWN7–8's former quiet texts remain below as NEG-REPORT/NEG-ASK. Their replacement
texts are genuine sender requests; the old expectations were preserved.

## Warning controls

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| W1 | Scammers posing as Chase may ask you to pay with gift cards. | None | Insufficient Evidence |
| W2 | Fraudsters pretending to be the IRS may demand a wire transfer. | None | Insufficient Evidence |
| W3 | Scam callers may ask you to install remote access software. | None | Insufficient Evidence |
| W4 | Criminals often ask victims to read back verification codes. | None | Insufficient Evidence |
| W5 | If someone asks you to pay with gift cards, hang up. | None | Insufficient Evidence |
| W6 | Anyone who asks you to pay with gift cards is a scammer. | None | Insufficient Evidence |
| W7 | Hang up if anyone asks you to read your verification code. | None | Insufficient Evidence |
| W8 | Never trust a text that asks you to read a code. | None | Insufficient Evidence |
| W9 | Imposters may ask you to pay with gift cards. | None | Insufficient Evidence |
| W10 | Scammers posing as Chase Bank fraud team may ask you to pay with gift cards. | None | Insufficient Evidence |

W5–W10 all failed before the sender allowlist and now pass. W10 completes the
reviewer's ellipsis with “pay with gift cards.” Quiet does not verify a sender.
RS37 additionally tests I, our team, Chase, a named sender label, unknown subjects
with “please,” and an independent demand following a warning. RS25's unfamiliar
asking subject is now quiet under the revised contract; its reason is documented.

## Legitimate, reporting and negation controls

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| LEGIT-GC | Target: Gift cards are 20% off this weekend. | None | Insufficient Evidence |
| LEGIT-CD | Chase: Your code is 482193. Don’t share it with anyone. | None | Insufficient Evidence |
| LEGIT-WT | Chase: Your wire transfer of $500 was completed. | None | Insufficient Evidence |
| LEGIT-RA | Chase will never ask you to install remote access software. | None | Insufficient Evidence |
| NEG-REPORT | Fraudsters may ask you to pay with gift cards. | None | Insufficient Evidence |
| NEG-ASK | We never ask you to pay with gift cards. | None | Insufficient Evidence |

## Evidence and execution

Subject recognition precedes widening request recognition. Tests read the
checked-in fixture and compare both findings and verdicts. W and legitimate
failures are regressions, never expected failures. See the [decision and
checklist](../decisions/reporting-scope.md) and [results](reporting-scope-results/README.md).
The results separate the original scope repair from sender-request recognition
and the new short-preface recognition; the old OWN-heavy table does not prove
that the original scope bug was fixed. Sender attribution remains unchanged.
