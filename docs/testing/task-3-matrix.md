# Task 3: instruction recognition matrix

The checked-in reporting-scope fixture contains these hand-decided rows in
addition to the 384 generated cases. Every hand row uses record state `none`
and the shared frozen evaluation date 2026-10-12. Findings below use the
[documented family IDs](../decisions/reporting-scope.md#frozen-three-layer-matrix).
Expected results are specification decisions, never engine-generated labels.

## Sender's own requests

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| OWN1 | We ask you to pay with gift cards. | `gift_card_demand` | Suspicious |
| OWN2 | We need you to pay with gift cards. | `gift_card_demand` | Suspicious |
| OWN3 | Chase requests that you pay with gift cards. | `gift_card_demand` | Suspicious |
| OWN4 | We ask you to please pay with gift cards. | `gift_card_demand` | Suspicious |
| OWN5 | Due to fraudsters we ask you to pay with gift cards today. | `gift_card_demand` | Suspicious |
| OWN6 | Fraudsters are active and Chase asks you to send the fee by wire transfer today. | `wire_demand` | Suspicious |
| OWN7 | We ask you to read us your verification code. | `code_request` | Suspicious |
| OWN8 | We need you to install remote access software today. | `remote_access` | Suspicious |

OWN7–8 previously held quiet reporting and negation controls. Those exact texts
and quiet expectations are preserved below as NEG-REPORT and NEG-ASK: neither
is a sender demand. OWN7–8 now supply genuine code and remote-access requests,
so all eight OWN rows have the requested positive meaning. No old expectation
was changed to follow observed output.

## Real warning controls

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| W1 | Scammers posing as Chase may ask you to pay with gift cards. | None | Insufficient Evidence |
| W2 | Fraudsters pretending to be the IRS may demand a wire transfer. | None | Insufficient Evidence |
| W3 | Scam callers may ask you to install remote access software. | None | Insufficient Evidence |
| W4 | Criminals often ask victims to read back verification codes. | None | Insufficient Evidence |

W1–W4 retain the requested wording verbatim. Quiet does not authenticate a
sender; without supporting contact evidence, these remain Insufficient Evidence.
The separate RS34 guard also tests described subjects and noun recipients with
“please,” including the earlier gift-card warning forms. RS35 ensures a
subject description cannot swallow a new asker.

## Legitimate and negation controls

| Row | Message | Expected finding | Verdict |
| --- | --- | --- | --- |
| LEGIT-GC | Target: Gift cards are 20% off this weekend. | None | Insufficient Evidence |
| LEGIT-CD | Chase: Your code is 482193. Don’t share it with anyone. | None | Insufficient Evidence |
| LEGIT-WT | Chase: Your wire transfer of $500 was completed. | None | Insufficient Evidence |
| LEGIT-RA | Chase will never ask you to install remote access software. | None | Insufficient Evidence |
| NEG-REPORT | Fraudsters may ask you to pay with gift cards. | None | Insufficient Evidence |
| NEG-ASK | We never ask you to pay with gift cards. | None | Insufficient Evidence |

The four family controls retain the requested wording verbatim. NEG-REPORT and
NEG-ASK preserve the former OWN7–8 expectations.

## Execution and results

The required order is subject recognition first, then widening `directAction`.
The baseline was captured with the unchanged release engine before using the
new recognition logic. The completed suite checks both findings and verdicts;
any failing W or legitimate control is a regression, with no expected-failure
exemptions. No sender-attribution, trusted-reference or policy data was changed.

Run `node scripts/run-reporting-scope.cjs` for the **suite pass rate** by cell and
hand-row group, and `npm test` for all shared checks, parity, boundary and eval
checks. The execution checklist, 16 decisions, limitations and saved baseline
and final results are in the [reporting-scope decision](../decisions/reporting-scope.md).
