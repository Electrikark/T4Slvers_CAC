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
const gaps = [
  ['GAP1', 'GC', 'Chase Fraud Dept: we need you to purchase gift cards to secure your account. Visit https://chase.com', 'gift_card_demand'],
  ['GAP2', 'WT', 'Chase: Scammers are watching your account, so you must move your money into Bitcoin now. https://chase.com', 'wire_demand'],
  ['GAP3', 'RA', 'Chase: Our technician will need you to install AnyDesk so we can fix your account. https://chase.com', 'remote_access']
];
function gapRow([id, family, text, finding]) {
  return { id, context: 'GAP', family, variant: 'hand', record_state: 'approved', text,
    expected_findings: [finding], expected_verdict: 'Insufficient Evidence', known_limitation: null };
}
// Five wording variations per repair, with one fixed approved contact.
const reviewCases = [
  ['STAFF1', 'RA', 'Chase: Our technician needs you to install AnyDesk.', 'remote_access'],
  ['STAFF2', 'RA', 'Chase: Our security team will need you to download TeamViewer.', 'remote_access'],
  ['STAFF3', 'RA', 'Chase: Our fraud specialist will need you to install AnyDesk.', 'remote_access'],
  ['STAFF4', 'RA', 'Chase: The technician needed you to install AnyDesk.', 'remote_access'],
  ['STAFF5', 'RA', 'Chase: Your account manager needs you to install AnyDesk.', 'remote_access'],
  ['ATM1', 'WT', 'Chase: Go to a Bitcoin ATM and deposit $2,000 right now to secure your account.', 'wire_demand'],
  ['ATM2', 'WT', 'Chase: Go to a Bitcoin ATM and put $2,000 into the machine.', 'wire_demand'],
  ['ATM3', 'WT', 'Chase: Go to a Bitcoin ATM and move your cash into the machine.', 'wire_demand'],
  ['ATM4', 'WT', 'Chase: Withdraw $3,000 and put it in a crypto wallet.', 'wire_demand'],
  ['ATM5', 'WT', 'Chase: Deposit $2,000 into a Bitcoin ATM.', 'wire_demand'],
  ['BIRTH1', 'GC', 'Chase: Please buy gift cards for your birthday.', 'gift_card_demand'],
  ['BIRTH2', 'GC', 'Chase: Please buy a gift card for her birthday.', 'gift_card_demand'],
  ['BIRTH3', 'GC', 'Chase: Please purchase gift cards for his birthday.', 'gift_card_demand'],
  ['BIRTH4', 'GC', 'Chase: We need you to buy gift cards for their birthday.', 'gift_card_demand'],
  ['BIRTH5', 'GC', 'Chase: Buy two Google Play cards for my birthday.', 'gift_card_demand']
];
function reviewRow([id, family, text, finding]) {
  return { id, context: 'T2_REVIEW', family, variant: 'hand', record_state: 'approved', text: text + ' Visit https://chase.com.',
    expected_findings: [finding], expected_verdict: 'Insufficient Evidence', known_limitation: null };
}
module.exports = own.map(c => row(c, 'OWN')).concat(warnings.map(c => row(c, 'W')), controls.map(c => row(c, 'LEGIT')), gaps.map(gapRow), reviewCases.map(reviewRow));
