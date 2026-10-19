/* Constructed F2 regression cases, not the unavailable field corpus. */
window.TFS_PHASE2.add('F2 rule fixes', function (t) {
  var engine = window.TfsEngine, T = window.TFS, store = window.TFS_STORE;
  function analyze(text, s) {
    var r = engine.analyze(text, s || store, { declaredChannel: 'text', today: '2026-10-18' });
    t.assert(engine.validateResult(r), 'invalid result: ' + text);
    r.requestRisk.established.forEach(function (f) {
      ['action', 'object', 'clause', 'context', 'antecedent'].forEach(function (key) {
        if (f[key]) t.same(text.slice(f[key].start, f[key].end), f[key].quote, key + ' exact source');
      });
    });
    return r;
  }
  function has(r, rule) { return r.evidence.findings.some(function (f) { return f.ruleId === rule && f.tier === 1 && f.status === 'established'; }); }
  function positive(rule, text) {
    t.test(rule + ' catches: ' + text, function () {
      var r = analyze(text);
      t.assert(has(r, rule), 'missing ' + rule);
      t.same(r.assessment, 'suspicious', 'assessment');
    });
  }
  function negative(rule, text) {
    t.test(rule + ' excludes: ' + text, function () {
      var r = analyze(text);
      t.assert(!has(r, rule), 'unexpected ' + rule);
      t.assert(r.assessment !== 'suspicious', 'legitimate control became suspicious');
    });
  }

  ['A charge of $499 was approved. Call 888-555-0199 to cancel.',
    'A payment was attempted. Ring 888-555-0199.',
    'Your debit is queued. Phone (888) 555-0199.',
    'Your refund is ready. Dial +1 888 555 0199.',
    'To dispute the charge, call 888-555-0199.',
    'Your account is locked. Call this number: 888-555-0199.',
    'Account suspension notice. Call us at 888-555-0199.',
    'Chase: A charge was approved. If you did not authorize it, call 888-555-0199.',
    'Refund notice. Our number is 888-555-0199. Please call this number.',
    'A payment was approved. Please phone 888.555.0199.',
    'Payment of $499.99 was approved. Call 888-555-0199.',
    'Refund notice. Call 888-555-0199 or use the official app.'].forEach(function (text) { positive('T1-CALLBACK', text); });
  ['If you didn’t make this purchase, call the number on the back of your card',
    'Call 916-555-0100 to reschedule your appointment',
    'A payment was approved. Do not call 888-555-0199.',
    'Scammers may ask you to call 888-555-0199 about a refund.',
    'Your refund is ready. Call your bank.',
    'Your refund is ready. Appointment desk: 916-555-0100. Call the number on the back of your card.'].forEach(function (text) { negative('T1-CALLBACK', text); });

  function phoneStore(status, legacy) {
    var s = JSON.parse(JSON.stringify(store)), chase = s.orgs.filter(function (o) { return o.id === 'chase'; })[0];
    if (legacy) { delete chase.contacts; chase.officialPhones = ['1-800-935-9935']; }
    else chase.contacts = [{ kind: 'phone', value: '+18009359935', status: status, scope: { type: 'host' },
      sourceUrl: 'https://example.invalid/test-fixture', checkedOn: '2026-10-01', reviewDue: '2099-12-31', reviewedBy: 'Fictional test fixture' }];
    return s;
  }
  ['draft', 'reviewed', 'legacy'].forEach(function (status) {
    t.test('F2 ' + status + ' Chase number stays Tier 2', function () {
      var r = analyze('Chase: A charge was approved. Call 1-800-935-9935 to dispute it.', phoneStore(status, status === 'legacy'));
      t.assert(!has(r, 'T1-CALLBACK'), 'listed number became Tier 1');
      t.same(r.assessment, 'insufficient_evidence', 'must never be Details Match');
      t.assert(r.evidence.findings.some(function (f) { return f.ruleId === 'financial_callback' && f.tier === 2; }), 'missing Tier 2 blocker');
    });
  });
  t.test('F2 user-supplied Chase Draft number is active in the real store', function () {
    var r = analyze('Chase: A charge was approved. Call 1-800-935-9935.');
    t.assert(!has(r, 'T1-CALLBACK'), 'real store missed exception');
    t.same(r.assessment, 'insufficient_evidence', 'real store assessment');
  });
  t.test('F2 device and account alarms cannot bypass the stored-number exception', function () {
    var r = analyze('Chase: Your device is compromised and your account is locked. Call 1-800-935-9935.', phoneStore('reviewed'));
    t.assert(!has(r, 'T1-CALLBACK'), 'device branch bypassed exception');
    t.same(r.assessment, 'insufficient_evidence', 'assessment');
  });
  t.test('F2 another brand’s number cannot downgrade the callback', function () {
    var r = analyze('Wells Fargo: A charge was approved. Call 1-800-935-9935.', phoneStore('draft'));
    t.assert(has(r, 'T1-CALLBACK'), 'wrong-brand exception');
  });
  t.test('F2 a stored number cannot hide a second unknown callback number', function () {
    var r = analyze('Chase: A charge was approved. Call 1-800-935-9935 or 888-555-0199.', phoneStore('draft'));
    t.assert(has(r, 'T1-CALLBACK'), 'unknown second number lost');
  });
  t.test('F2 the exception cannot cancel an independent Tier 1 rule', function () {
    var r = analyze('Chase: A charge was approved. Call 1-800-935-9935. Install AnyDesk.', phoneStore('reviewed'));
    t.assert(!has(r, 'T1-CALLBACK') && has(r, 'T1-REMOTE'), 'wrong rule priority');
    t.same(r.assessment, 'suspicious', 'assessment');
  });


  negative('T1-CALLBACK', 'No charge was made. Call 916-555-0100 to reschedule your appointment.');

});
