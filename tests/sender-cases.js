/* Phase 2 B: sender attribution (R03). Names come from the real list's aliases; no record
   needs review for a name to be read, but only a trusted contact can ever support a match. */
window.TFS_PHASE2.add('Sender attribution', function (t) {
  var T = window.TFS, engine = window.TfsEngine, orgs = window.TFS_STORE.orgs;
  function who(text) { return T.attributeSender(text, orgs); }
  function claimed(text, orgId, pattern) {
    var a = who(text);
    t.same([a.orgId, a.pattern], [orgId, pattern], 'attribution for "' + text + '"');
    t.same(text.slice(a.span.start, a.span.end), a.span.quote, 'span for "' + text + '"');
  }
  function unknown(text, reason) {
    var a = who(text);
    t.same([a.orgId, a.reason], [null, reason], 'attribution for "' + text + '"');
  }

  // The five rows of the Section B table, plus the payment-phrase row from the original spec.
  t.test('B1 "Chase: Your statement is ready." names Chase by its label', function () {
    claimed('Chase: Your statement is ready.', 'chase', 'label');
  });
  t.test('B2 "Pay with Zelle to finish." names no sender', function () {
    unknown('Pay with Zelle to finish.', 'payment_method');
  });
  t.test('B3 "This is not from Chase" names no sender', function () {
    unknown('This is not from Chase', 'negated');
  });
  t.test('B4 "Watch for texts pretending to be from Chase" names no sender', function () {
    unknown('Watch for texts pretending to be from Chase', 'reporting_frame');
  });
  t.test('B5 A USPS label plus a Chase sign-off names no sender', function () {
    unknown('USPS: Your package is on its way.\n- Chase', 'competing_claims');
    unknown('USPS: Your package is on its way. - Chase', 'competing_claims');
  });
  t.test('B6 A Chase phone number alone names no sender, and implicit never becomes explicit', function () {
    unknown('Call 800-935-9935 about your card.', 'no_claim');
    // Even when a reviewed record ties the number to Chase, the organization is only implied.
    var store = { version: 'sender-fixture', shorteners: [], orgs: [{ id: 'chase', displayName: 'Chase', aliases: ['chase bank'], strictAliases: ['chase'],
      officialDomains: ['chase.com'], officialPhones: ['+18009359935'], userContentHosts: [],
      humanReview: { reviewer: 'Test fixture (fictional record)', date: '2026-10-12', reviewDue: '2099-12-31', sourceUrl: 'https://example.invalid/fixture-record' } }] };
    var r = engine.analyze('Call 800-935-9935 about your card.', store, { declaredChannel: 'text', today: '2026-10-12' });
    t.assert(engine.validateResult(r), 'invalid result');
    t.same(r.claimSource, 'implicit', 'claim source');
    t.same(r.evidence.sender.explicit, false, 'explicit flag');
    t.same(r.evidence.sender.recognizedOrg, null, 'recognized org');
    t.assert(r.assessment !== 'details_match', 'an implied sender reached Details Match');
  });

  t.test('B7 Each allowed pattern names its sender', function () {
    claimed('Chase Alert: A payment was made.', 'chase', 'label');
    claimed('Wells Fargo Fraud Alert: Did you try a purchase?', 'wellsfargo', 'label');
    claimed('Hello.\nUSPS: Your package arrives today.', 'usps', 'label');
    claimed('This is Medicare calling about your card.', 'medicare', 'direct');
    claimed('This is a message from Social Security about your benefits.', 'ssa', 'direct');
    claimed('This alert is from Bank of America.', 'bankofamerica', 'from');
    claimed('You have a notice from the IRS.', 'irs', 'from');
    claimed('Your statement is ready.\n- Chase', 'chase', 'signoff');
    claimed('Your statement is ready.\nSincerely, Wells Fargo', 'wellsfargo', 'signoff');
    claimed('Your benefits letter is ready.\nThe SSA Team', 'ssa', 'signoff');
  });

  t.test('B8 Mentions that are not sender statements name no one', function () {
    unknown('Your Chase code is 482910.', 'no_claim');
    unknown('I paid my Chase bill yesterday.', 'no_claim');
    unknown('We will chase the bus tomorrow.', 'no_claim');
    unknown('Send $50 via Zelle today.', 'payment_method');
    unknown('Fraudsters pose as USPS: be careful.', 'reporting_frame');
    unknown('This isn’t from the IRS.', 'negated');
  });

  t.test('B9 A label is its own clause, so a warning after it does not cancel it', function () {
    claimed('Chase: Fraudsters may ask you to pay with gift cards.', 'chase', 'label');
  });

  t.test('B10 The same organization twice is one claim, not a competition', function () {
    claimed('Chase: Your statement is ready.\n- Chase', 'chase', 'label');
  });

  t.test('B11 Spans point at the pasted characters, even with invisible ones inside', function () {
    var text = 'C​hase: Your statement is ready. Visit https://chase.com.';
    var r = engine.analyze(text, window.TFS_STORE, { declaredChannel: 'text' });
    t.same(r.senderAttribution.orgId, 'chase', 'attributed');
    t.same(text.slice(r.senderAttribution.span.start, r.senderAttribution.span.end), r.senderAttribution.span.quote, 'raw span');
    t.same(r.senderAttribution.span.quote, 'C​hase', 'quote keeps the invisible character');
  });
});
