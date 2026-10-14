// Layer 1: hand-decided contract. No engine imports, observations or inferred labels.
const SPEC = Object.freeze({ WF: true, PC: true, RD: false, TW: true });
const FINDING = Object.freeze({ GC: 'gift_card_demand', CD: 'code_request', WT: 'wire_demand', RA: 'remote_access' });
const decisions = [
  ['WF', 'GC', true, 'A warning before the sender asks for gift-card payment does not report that payment.'],
  ['WF', 'CD', true, 'A warning before the sender asks for a verification code does not report that disclosure.'],
  ['WF', 'WT', true, 'A warning before the sender demands a wire transfer today does not cancel the pressured transfer.'],
  ['WF', 'RA', true, 'A warning before the sender demands remote-access installation today does not cancel that demand.'],
  ['PC', 'GC', true, 'Avoiding fraudsters is the stated purpose of the sender’s gift-card demand, not an asking subject.'],
  ['PC', 'CD', true, 'Avoiding fraudsters is background; the sender still asks the reader to disclose a code.'],
  ['PC', 'WT', true, 'The purpose phrase does not change who asks for the wire transfer today.'],
  ['PC', 'RA', true, 'The purpose phrase does not change who asks for remote-access installation today.'],
  ['RD', 'GC', false, 'Fraudsters are the subject of the reported gift-card request; the sender makes no demand.'],
  ['RD', 'CD', false, 'Fraudsters are the subject of the reported code request; the sender makes no demand.'],
  ['RD', 'WT', false, 'The wire transfer and its timing are both inside the reported request, not the sender’s demand.'],
  ['RD', 'RA', false, 'The installation and its timing are both inside the reported request, not the sender’s demand.'],
  ['TW', 'GC', true, 'A warning after the sender’s gift-card request cannot retroactively report it.'],
  ['TW', 'CD', true, 'A warning after the sender’s disclosure request cannot retroactively report it.'],
  ['TW', 'WT', true, 'A trailing warning cannot erase the sender’s pressured wire-transfer demand.'],
  ['TW', 'RA', true, 'A trailing warning cannot erase the sender’s pressured remote-access demand.']
].map(([context, family, senderDemand, reason]) => ({ context, family, senderDemand, reason }));

function expectation(decision, recordState) {
  return {
    expected_findings: decision.senderDemand ? [FINDING[decision.family]] : [],
    expected_verdict: decision.senderDemand ? 'Suspicious' : recordState === 'approved' ? 'Details Match' : 'Insufficient Evidence'
  };
}
module.exports = { SPEC, FINDING, decisions, expectation, evaluationDate: '2026-10-12' };
