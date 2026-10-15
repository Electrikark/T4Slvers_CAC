// Hand-decided controls. These expectations never come from the engine.
const own = [
  ['OWN1', 'GC', 'We ask you to pay with gift cards.', 'gift_card_demand'],
  ['OWN2', 'GC', 'We need you to pay with gift cards.', 'gift_card_demand'],
  ['OWN3', 'GC', 'Chase requests that you pay with gift cards.', 'gift_card_demand'],
  ['OWN4', 'GC', 'We ask you to please pay with gift cards.', 'gift_card_demand'],
  ['OWN5', 'GC', 'Due to fraudsters we ask you to pay with gift cards today.', 'gift_card_demand'],
  ['OWN6', 'WT', 'Fraudsters are active and Chase asks you to send the fee by wire transfer today.', 'wire_demand'],
  ['OWN7', 'CD', 'We ask you to read us your verification code.', 'code_request'],
  ['OWN8', 'RA', 'We need you to install remote access software today.', 'remote_access']
];
const warnings = [
  ['W1', 'GC', 'Scammers posing as Chase may ask you to pay with gift cards.'],
  ['W2', 'WT', 'Fraudsters pretending to be the IRS may demand a wire transfer.'],
  ['W3', 'RA', 'Scam callers may ask you to install remote access software.'],
  ['W4', 'CD', 'Criminals often ask victims to read back verification codes.'],
  ['W5', 'GC', 'If someone asks you to pay with gift cards, hang up.'],
  ['W6', 'GC', 'Anyone who asks you to pay with gift cards is a scammer.'],
  ['W7', 'CD', 'Hang up if anyone asks you to read your verification code.'],
  ['W8', 'CD', 'Never trust a text that asks you to read a code.'],
  ['W9', 'GC', 'Imposters may ask you to pay with gift cards.'],
  ['W10', 'GC', 'Scammers posing as Chase Bank fraud team may ask you to pay with gift cards.']
];
const controls = [
  ['LEGIT-GC', 'GC', 'Target: Gift cards are 20% off this weekend.'],
  ['LEGIT-CD', 'CD', 'Chase: Your code is 482193. Don’t share it with anyone.'],
  ['LEGIT-WT', 'WT', 'Chase: Your wire transfer of $500 was completed.'],
  ['LEGIT-RA', 'RA', 'Chase will never ask you to install remote access software.'],
  ['NEG-REPORT', 'GC', 'Fraudsters may ask you to pay with gift cards.'],
  ['NEG-ASK', 'GC', 'We never ask you to pay with gift cards.']
];
function row([id, family, text, finding], group) {
  return { id, context: group, family, variant: 'hand', record_state: 'none', text,
    expected_findings: finding ? [finding] : [], expected_verdict: finding ? 'Suspicious' : 'Insufficient Evidence', known_limitation: null };
}
module.exports = own.map(c => row(c, 'OWN')).concat(warnings.map(c => row(c, 'W')), controls.map(c => row(c, 'LEGIT')));
