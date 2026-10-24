/* Seed messages for the robustness run.

   These are written for this test. They are NOT the evaluation dataset and they are not
   real collected messages. They live here, outside eval/data, on purpose:

     - the held-out test split must stay untouched, and anything read here would be read
       many thousands of times;
     - a robustness number is about the rules' reach, not about real-world accuracy, so
       mixing the two corpora would invite the wrong reading of both.

   Each fraud seed states the Tier 1 code it is written to trigger. If the engine does not
   produce that code on the plain seed, the harness reports the seed as a baseline miss and
   does not count its rewrites: a rule that never fired cannot be evaded.

   Legitimate seeds are the controls. They catch the opposite failure, where a harmless
   rewrite turns an honest message into a false alarm. */
'use strict';

const fraud = [
  { id: 'F-GIFT-1', expect: 'T1-GIFT', category: 'gift_card',
    text: 'Chase: Your account is on hold. Buy two Apple gift cards today and send us the codes to restore access. Visit https://chase-secure-verify.net.' },
  { id: 'F-GIFT-2', expect: 'T1-GIFT', category: 'gift_card',
    text: 'I am in a meeting and cannot talk. Please pick up four gift cards for the clients and text me photos of the backs.' },
  { id: 'F-CODE-1', expect: 'T1-CODE', category: 'code',
    text: 'Wells Fargo security: we are sending a verification code to your phone. Read us that code to confirm you are the account holder.' },
  { id: 'F-CODE-2', expect: 'T1-CODE', category: 'code',
    text: 'This is Amazon support. Share the one-time passcode we just sent you so we can cancel the order.' },
  { id: 'F-WIRE-1', expect: 'T1-WIRE', category: 'bank_login',
    text: 'IRS final notice: your tax debt is overdue. Send the payment by wire transfer today to avoid arrest.' },
  { id: 'F-WIRE-2', expect: 'T1-WIRE', category: 'bank_login',
    text: 'Your account will be frozen. To release the funds you must convert the balance to bitcoin and send it to the recovery wallet.' },
  { id: 'F-REMOTE-1', expect: 'T1-REMOTE', category: 'tech_support',
    text: 'Microsoft alert: your computer is infected. Install AnyDesk and share your session ID with our technician right away.' },
  { id: 'F-REMOTE-2', expect: 'T1-REMOTE', category: 'tech_support',
    text: 'Our specialist needs you to download TeamViewer so we can take remote access and clean the virus.' },
  { id: 'F-CALLBACK-1', expect: 'T1-CALLBACK', category: 'tech_support',
    text: 'Warning: your device has been locked by Windows Defender. Call this toll-free number 1-888-555-0142 now for support.' },
  { id: 'F-COMBO-1', expect: 'T1-COMBO', category: 'family',
    text: 'Grandma it is me. I am in trouble and I need money for bail right now. Please do not tell mom about this.' }
];

const legit = [
  { id: 'L-PHARM-1', category: 'appointment',
    text: 'CVS Pharmacy: your prescription is ready for pick up at the front desk. Reply STOP to end texts.' },
  { id: 'L-BANK-1', category: 'bank_login',
    text: 'Chase: a deposit of $500 by wire transfer was received on October 20. No action is needed.' },
  { id: 'L-GIFT-1', category: 'gift_card',
    text: 'Hi Mom, could you buy a gift card for Ellie for her birthday on Saturday? I will pay you back when I visit.' },
  { id: 'L-DELIVERY-1', category: 'delivery',
    text: 'USPS: your package is out for delivery today. Give the delivery code to the driver when he arrives.' },
  { id: 'L-SUPPORT-1', category: 'tech_support',
    text: 'Our office uses AnyDesk for scheduled training sessions. Please share your phone number so we can book a time.' },
  { id: 'L-APPT-1', category: 'appointment',
    text: 'Sutter Health: your appointment is Tuesday at 10:15. Please sign in at the front desk when you arrive.' },
  { id: 'L-WARN-1', category: 'bank_login',
    text: 'Chase fraud education: scammers posing as Chase may ask you to pay with gift cards. We never will. Call the number on the back of your card.' },
  { id: 'L-CODE-1', category: 'code',
    text: 'The wifi code for the guest network is on the fridge. Share it with the visitors if they ask.' }
];

module.exports = { fraud, legit };
