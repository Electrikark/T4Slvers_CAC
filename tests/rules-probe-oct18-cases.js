/* Independent probe written Oct 18 without reading the F1-F5 tests.
   Not a held-out test set: written by someone who knew the rules. */
window.TFS_PHASE2.add('Independent rule probe (Oct 18)', function (t) {
  var engine = window.TfsEngine, store = window.TFS_STORE;
  [['S','Download AnyDesk and read me the 9-digit number so I can fix the refund.'],
   ['S','Please open QuickSupport and accept the connection from our technician.'],
   ['S','Amazon: Your order of iPhone 15 for $1,299 has been placed. If you did not place this order call 1-888-555-0177 immediately.'],
   ['S','Geek Squad: your annual renewal of $399.99 was charged today. To cancel and get a refund call 1-805-555-0133.'],
   ['S','I’m in a meeting, can you grab 3 Google Play cards for a client? Will reimburse you today.'],
   ['S','This is Pastor Mike. I can’t talk right now. Please buy four $100 Apple gift cards for the hospital patients.'],
   ['S','Grandpa it’s Josh, I got arrested and need $3000 for bail right now. Please don’t tell my parents.'],
   ['S','USPS: your package is on hold. Pay the $1.99 fee at https://usps-redelivery.top/pay'],
   ['S','Chase: unusual sign-in detected. Verify your account at https://chase-secure-login.com'],
   ['S','Amazon: confirm your payment details at http://amazon.account-verify.info/login'],
   ['N','We will never ask you to install AnyDesk.'],
   ['N','Scammers may ask you to install TeamViewer. Hang up if they do.'],
   ['N','Wells Fargo will never ask you to download this type of software or ask you to screen share with them.'],
   ['N','Your telehealth visit with Dr. Lee starts at 3pm. Join at https://zoom.us/j/123456'],
   ['N','Chase: Did you attempt a $45.00 purchase at Target? If you did not, call the number on the back of your card.'],
   ['N','Your appointment is confirmed. Call 916-555-0100 to reschedule.'],
   ['N','Chase Fraud Alert: unusual charge of $89.99. If this was not you, call us at 1-800-935-9935.'],
   ['N','Your prescription is ready for pickup. Questions? Call 916-555-0199.'],
   ['N','Your SMUD bill of $82.10 is due Nov 3. Questions about your bill? Call 1-888-555-0142.'],
   ['N','Your payment of $82.10 was received. Thank you. Questions? Call 1-888-555-0142.'],
   ['N','Happy birthday! I got you an Amazon gift card, check your email.'],
   ['N','Reminder: pay your Apple Card bill by the 30th in the Wallet app.'],
   ['N','Our church is collecting gift cards for the food drive. Drop them in the box Sunday.'],
   ['N','Can you pick up a Target gift card for Grandma’s birthday? I’ll pay you back Sunday.'],
   ['N','Don’t tell Mom about the surprise party, can you send $20 for the cake?'],
   ['N','Grandma I’m in trouble with my homework lol, can you call me?'],
   ['N','Keep this between us, but Dad’s birthday is coming. Can you chip in $30 for his gift? Need it by Friday!'],
   ['N','Chase: your statement is ready at https://secure.chase.com/statements'],
   ['N','USPS: track your package at https://tools.usps.com/go/TrackConfirmAction?tLabels=9400'],
   ['N','Fresh fruit this week, order at https://pineapple-farm.com/order'],
   ['N','Your Amazon order shipped. View it at https://www.amazon.com/gp/your-account/order-history'],
   ['N','Wells Fargo: sign on to review this alert at https://connect.secure.wellsfargo.com/auth/login'],
   ['N','USPS Informed Delivery: see today’s mail at https://informeddelivery.usps.com'],
   ['N','Royal Mail: track your item at https://www.royalmail.com/track-your-item'],
   ['N','HSBC: log on to review your statement at https://www.hsbc.co.uk'],
   ['N','E-ZPass NY: your statement is ready. Pay at https://www.e-zpassny.com'],
   ['N','E-ZPass: pay your toll balance at https://www.ezpassnj.com'],
   ['N','Learn how to spot fake USPS texts: https://www.consumer.ftc.gov/articles/usps-scams']
  ].forEach(function (c) {
    t.test('probe ' + c[0] + ': ' + c[1], function () {
      var r = engine.analyze(c[1], store, { declaredChannel: 'text', today: '2026-10-18' });
      t.assert(engine.validateResult(r), 'invalid result');
      if (c[0] === 'S') t.same(r.assessment, 'suspicious', 'scam not caught');
      else t.assert(r.assessment !== 'suspicious', 'legitimate message became suspicious');
      t.assert(r.assessment !== 'details_match' || c[0] === 'N', 'scam reassured');
    });
  });
});
