# Dev failure analysis (dev split only)
Run: 2026-10-18 (baseline counts; fixed? checked after rerun) · engine 0.4.0 · 194 dev messages (95 fraud, 99 legit) · 0 companies reviewed
## Counts
| Kind | Count |
|---|---|
| A. Fraud reassured | 0 |
| B. Fraud missed | 59 |
| C. Right verdict, wrong reason | 0 |
| D. False alarm | 0 |
| E. Legit with a Tier 2 warning | 7 |
## By cause
| Cause | Count |
|---|---|
| wording | 0 |
| scope | 0 |
| missing record | 7 |
| overly broad warning | 4 |
| other | 55 |
## Every failure
| id | group | kind | expected | got | cause | fix idea | fixed? |
|---|---|---|---|---|---|---|---|
| pub_0001 | F2-pub_bank_account_suspended | B | T1-DOMAIN | T1: none; T2: none | other | The supplied domain expectation lacks the specific hostname-deception evidence required by the gate. | no |
| pub_0002 | F2-pub_bank_followup_call | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0041 | F2-pub_gift_boss_request | B | none | T1: none; T2: urgency | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0042 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: none | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | yes |
| pub_0043 | F2-pub_gift_boss_request | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0044 | F2-pub_gift_boss_request | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0056 | F2-pub_gift_boss_request | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0057 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: none | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | no |
| pub_0058 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: none | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | no |
| pub_0059 | F2-pub_gift_boss_request | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0060 | F2-pub_gift_boss_request | B | none | T1: none; T2: none | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0061 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: none | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | no |
| pub_0064 | F2-pub_delivery_reschedule | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | no |
| pub_0065 | F2-pub_delivery_reschedule | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0066 | F2-pub_delivery_customs | B | none | T1: none; T2: pay_fee | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0068 | F2-pub_bank_account_suspended | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0070 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: secrecy family_emergency | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | yes |
| pub_0071 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: secrecy family_emergency | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | no |
| pub_0073 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: family_emergency | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | no |
| pub_0074 | F2-pub_toll_account_billing | B | none | T1: none; T2: pay_fee | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0075 | F2-pub_toll_account_billing | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0076 | F2-pub_toll_account_billing | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0077 | F2-pub_delivery_customs | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0078 | F2-pub_delivery_customs | B | none | T1: none; T2: pay_fee | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0079 | F2-pub_delivery_customs | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | yes |
| pub_0080 | F2-pub_delivery_customs | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0081 | F2-pub_delivery_customs | B | T1-DOMAIN | T1: none; T2: none | other | The supplied domain expectation lacks the specific hostname-deception evidence required by the gate. | no |
| pub_0082 | F2-pub_bank_account_suspended | B | none | T1: none; T2: account_locked | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0083 | F2-pub_bank_account_suspended | B | T1-DOMAIN | T1: none; T2: none | other | The supplied domain expectation lacks the specific hostname-deception evidence required by the gate. | no |
| pub_0084 | F2-pub_bank_account_suspended | B | T1-DOMAIN | T1: none; T2: urgency | missing record | No Maybank record exists, so the brand-in-foreign-host check has no official domain to compare; volunteer verification of official contact facts is needed before adding it. | no |
| pub_0085 | F2-pub_bank_account_suspended | B | none | T1: none; T2: urgency | other | The isolated opener has no Tier 1 action or destination; keep pause and review the annotation contract. | no |
| pub_0086 | F2-pub_bank_account_suspended | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0088 | F2-pub_bank_account_suspended | B | none | T1: none; T2: urgency account_locked | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| pub_0089 | F2-pub_bank_account_suspended | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | yes |
| pub_0090 | F2-pub_bank_charge_callback | B | T1-CALLBACK | T1: none; T2: none | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | no |
| pub_0092 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: family_emergency | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | no |
| pub_0093 | F2-pub_delivery_customs | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | yes |
| pub_0094 | F2-pub_toll_account_billing | B | none | T1: none; T2: none | other | The destination is replaced by a placeholder; the missing hostname cannot establish domain deception. | no |
| syn_0001 | F2-pub_delivery_customs | B | T1-DOMAIN | T1: none; T2: legacy_contact:brand_in_foreign_domain | other | The foreign-brand host lacks a qualifying lure token under the current domain rule; retain Tier 2. | no |
| syn_0002 | F2-pub_delivery_customs | B | T1-DOMAIN | T1: none; T2: legacy_contact:brand_in_foreign_domain | other | The foreign-brand host lacks a qualifying lure token under the current domain rule; retain Tier 2. | no |
| syn_0007 | F2-syn_delivery_remote_install | B | T1-REMOTE | T1: none; T2: remote_access | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| syn_0008 | F2-syn_delivery_remote_install | B | T1-REMOTE | T1: none; T2: none | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| syn_0009 | F2-syn_delivery_callback | B | T1-CALLBACK | T1: none; T2: none | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0010 | F2-syn_delivery_callback | B | T1-CALLBACK | T1: none; T2: none | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0015 | F2-syn_bank_remote_helper | B | T1-REMOTE | T1: none; T2: remote_access | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| syn_0016 | F2-syn_bank_remote_helper | B | T1-REMOTE | T1: none; T2: none | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| syn_0017 | F2-pub_bank_charge_callback | B | T1-CALLBACK | T1: none; T2: callback_now | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0018 | F2-pub_bank_charge_callback | B | T1-CALLBACK | T1: none; T2: none | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0021 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: gift_card_payment | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | yes |
| syn_0022 | F2-pub_gift_boss_request | B | T1-GIFT | T1: none; T2: none | other | A card purchase alone lacks a payment purpose or redemption-secret disclosure; retain pause. | yes |
| syn_0032 | F2-syn_grandchild_bail_wire | B | T1-WIRE | T1: none; T2: none | other | An indirect third-party need is outside the positive sender-demand contract; review policy before expanding it. | no |
| syn_0039 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: secrecy | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | no |
| syn_0040 | F2-pub_grandchild_secrecy | B | none | T1: none; T2: secrecy | other | A general money appeal has no specified Tier 1 payment method; preserve the fraud label and pause. | no |
| syn_0041 | F2-pub_toll_account_billing | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | yes |
| syn_0042 | F2-pub_toll_account_billing | B | T1-DOMAIN | T1: none; T2: none | missing record | The sender reference is absent; volunteer verification of official contact facts is needed before adding it. | yes |
| syn_0045 | F2-syn_toll_callback | B | T1-CALLBACK | T1: none; T2: callback_now | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0046 | F2-syn_toll_callback | B | T1-CALLBACK | T1: none; T2: none | other | The supplied callback expectation lacks the device alarm required by the current Tier 1 contract. | yes |
| syn_0049 | F2-syn_toll_remote_access | B | T1-REMOTE | T1: none; T2: remote_access | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| syn_0050 | F2-syn_toll_remote_access | B | T1-REMOTE | T1: none; T2: none | other | The remote-access expectation lacks the qualifying pressure required by the current Tier 1 contract. | yes |
| pub_0023 | F2-pub_appt_confirm | E | none | T1: none; T2: callback_now | overly broad warning | Routine appointment callbacks trigger broad call vocabulary; a separate warning-scope repair remains open. | no |
| pub_0027 | F2-pub_bank_balance | E | none | T1: none; T2: login_request | other | A login instruction intentionally remains Tier 2 because a legit source label does not authenticate this sender. | no |
| pub_0048 | F2-pub_bank_debit | E | none | T1: none; T2: login_request | other | A login instruction intentionally remains Tier 2 because a legit source label does not authenticate this sender. | no |
| syn_0064 | F2-syn_legit_delivery_customs | E | none | T1: none; T2: login_request | other | A login instruction intentionally remains Tier 2 because a legit source label does not authenticate this sender. | no |
| syn_0073 | F2-pub_appt_confirm | E | none | T1: none; T2: urgency | overly broad warning | Clinical urgency triggers broad pressure vocabulary; a separate warning-scope repair remains open. | no |
| syn_0074 | F2-pub_appt_confirm | E | none | T1: none; T2: urgency | overly broad warning | Clinical urgency triggers broad pressure vocabulary; a separate warning-scope repair remains open. | no |
| syn_0097 | F2-syn_legit_pharmacy_recall | E | none | T1: none; T2: urgency | overly broad warning | Clinical urgency triggers broad pressure vocabulary; a separate warning-scope repair remains open. | no |
