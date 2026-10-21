/* Paired safety regressions with fictional reviews and a fixed date. */
window.TFS_PHASE2.add('Session safety repairs', function (t) {
  var T = window.TFS, engine = window.TfsEngine;
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function run(text, options, store) {
    var settings = Object.assign({ declaredChannel: 'text', today: '2026-10-12' }, options);
    var r = engine.analyze(text, store || window.TFS_FIXTURE_STORE, settings);
    t.assert(engine.validateResult(r), 'invalid result: ' + text);
    r.evidence.findings.forEach(function (f) {
      if (f.span) t.same(text.slice(f.span.start, f.span.end), f.span.quote, 'original evidence');
    });
    return r;
  }
  function expect(text, assessment, flags, rules) {
    var r = run(text);
    t.same(r.assessment, assessment, text);
    t.same(r.requestRisk.flags.map(function (f) { return f.id; }).sort(), flags.slice().sort(), 'all wording flags');
    t.same(Array.from(new Set(r.trace.rules)).sort(), rules.slice().sort(), 'winning rules');
    return r;
  }
  function policy(extra) {
    return Object.assign({ id: 'FICTIONAL-POLICY', orgId: 'chase', channels: ['sms', 'email'],
      forbidden_action: 'any_contact_on_channel', predicates: [], exceptions: [],
      quote: 'Fictional policy for a regression test.', source_url: 'https://example.invalid/policy',
      checked_on: '2026-10-01', review_due: '2026-12-31', reviewed_by: 'Fictional reviewer A',
      second_reviewer: 'Fictional reviewer B', status: 'reviewed' }, extra);
  }
  function policies(p) { return { version: 'fictional-session-policy', records: [p] }; }
  var statement = 'Chase: Your statement is ready. https://chase.com';

  t.test('FIX01 Checkout cannot clear a gift-code demand to the requester', function () {
    expect('Chase: Send me your gift card codes before checkout. https://chase.com',
      'suspicious', ['gift_card_disclosure'], ['T1-GIFT']);
  });
  t.test('FIX02 An incidental driver cannot clear a bank-password demand', function () {
    expect('Chase: Give me your online banking password before the driver arrives. https://chase.com',
      'suspicious', ['share_code'], ['T1-CODE']);
  });
  t.test('FIX03 Negated and reported gift-code requests stay quiet', function () {
    ['Never send me your gift card codes before checkout.',
      'Fraudsters may ask you to send me your gift card codes before checkout.'].forEach(function (body) {
      expect('Chase: ' + body + ' https://chase.com', 'details_match', [], ['DM_ALL_CONDITIONS']);
    });
  });
  t.test('FIX04 Neutral event words do not erase a transfer deadline', function () {
    ['Wire $500 today.', 'Wire $500 today before lunch.', 'Wire $500 today before the meeting.',
      'Wire $500 today for the birthday.'].forEach(function (text) {
      expect(text, 'suspicious', ['crypto_or_wire'], ['T1-WIRE']);
    });
    expect('Please wire $500. Your meeting is today.', 'insufficient_evidence', ['crypto_or_wire'], []);
  });
  t.test('FIX05 Website wording cannot clear a demand to call the sender', function () {
    var r = run('Microsoft: Your computer is infected. Call us before visiting the official website.');
    t.same(r.assessment, 'suspicious', 'callback assessment');
    t.assert(r.trace.rules.includes('T1-CALLBACK'), 'callback rule absent');
    t.assert(!run('Chase: Your device may be compromised. Call the number on your card. https://chase.com')
      .trace.rules.includes('T1-CALLBACK'), 'independent number was treated as the callback');
  });
  t.test('FIX06 Delivery, promo and household codes have no secret-sharing warning', function () {
    expect('Amazon: Your delivery code is 0000. Share this code with the driver. https://amazon.com',
      'details_match', [], ['DM_ALL_CONDITIONS']);
    expect('Chase: Give me your promo code. https://chase.com', 'details_match', [], ['DM_ALL_CONDITIONS']);
    expect('Chase: Tell me the wifi password. https://chase.com', 'details_match', [], ['DM_ALL_CONDITIONS']);
  });
  t.test('FIX07 Protective advice stays quiet but a new credential request warns', function () {
    expect('Chase: Do not enter your password through a link in a text message. https://chase.com',
      'details_match', [], ['DM_ALL_CONDITIONS']);
    expect('Chase: Enter your password here. https://chase.com', 'insufficient_evidence', ['credential_request'], []);
    expect('Chase: Do not enter your name, but enter your password here. https://chase.com',
      'insufficient_evidence', ['credential_request'], []);
  });
  t.test('FIX08 Unknown policy context blocks a match without proving a violation', function () {
    var p = policy({ predicates: [{ name: 'customer_requested', mandatory: true, value: false }] });
    var options = { policies: policies(p), declaredChannel: 'email' };
    var unknown = run(statement, options);
    t.same(unknown.assessment, 'insufficient_evidence', 'unknown initiation');
    t.same(unknown.policy.findings, [], 'unknown is not a violation');
    t.assert(unknown.evidence.uncertainty.length > 0, 'missing policy uncertainty');
    t.assert(unknown.checks.some(function (c) { return c.code === 'policy_unresolved'; }), 'unresolved check is not displayed');
    var hidden = clone(unknown);
    hidden.checks = hidden.checks.filter(function (c) { return c.code !== 'policy_unresolved'; });
    t.assert(!engine.validateResult(hidden), 'hidden policy uncertainty passed validation');
    t.same(run(statement, Object.assign({}, options, { answers: { customer_requested: true } })).assessment,
      'details_match', 'known out-of-scope context');
    t.same(run(statement, Object.assign({}, options, { answers: { customer_requested: false } })).assessment,
      'suspicious', 'known forbidden contact');
    t.same(run(statement, { policies: policies(p), declaredChannel: 'unknown' }).assessment,
      'insufficient_evidence', 'unknown channel');
  });
  t.test('FIX09 A policy with no detected action does not demand irrelevant context', function () {
    var p = policy({ forbidden_action: 'request_personal_data',
      predicates: [{ name: 'customer_requested', mandatory: true, value: false }] });
    t.same(run(statement, { policies: policies(p) }).assessment, 'details_match', 'no relevant action');
  });
  t.test('FIX10 Unsupported policy actions are rejected at eligibility', function () {
    var view = T.buildPolicyView(policies(policy({ forbidden_action: 'request_move_money' })), '2026-10-12');
    t.same(view.trusted.length, 0, 'unsupported action was admitted');
    t.same(view.excluded[0].reason, 'unsupported_action', 'exclusion reason');
  });
  t.test('FIX11 Prior contact comes from a separate answer, never from message wording', function () {
    var p = policy({ forbidden_action: 'request_personal_data', exceptions: [
      { quote: 'unless you called first', cues: ['you called us'], answer: { name: 'customer_called', value: true } }
    ] });
    var text = 'Chase: Since you called us, please confirm your bank details here. https://chase.com';
    var options = { policies: policies(p) };
    t.same(run(text, options).assessment, 'insufficient_evidence', 'claim is unknown context');
    var denied = run(text, Object.assign({}, options, { answers: { customer_called: false } }));
    t.assert(denied.trace.rules.includes('T1-POLICY'), 'sender claim bypassed policy');
    var allowed = run(text, Object.assign({}, options, { answers: { customer_called: true } }));
    t.assert(!allowed.trace.rules.includes('T1-POLICY'), 'known exception was ignored');
    t.same(allowed.requestRisk.flags.map(function (f) { return f.id; }), ['credential_request'], 'other warning survives');
    t.assert(run(text, Object.assign({}, options, { answers: { customer_called: 'true' } })).policy.uncertainty.length > 0,
      'text was accepted as a boolean answer');
  });
  t.test('FIX12 Text-only policy exceptions cannot count as established context', function () {
    var p = policy({ exceptions: [{ quote: 'unless you called first', cues: ['you called us'] }] });
    t.same(T.buildPolicyView(policies(p), '2026-10-12').trusted.length, 0, 'message-only exception admitted');
  });
  t.test('FIX13 Family verification survives a bank-like link', function () {
    var r = run("Grandma, I'm in trouble. Please buy gift cards and send me the codes. https://chase.com.account-verify.top",
      null, window.TFS_STORE);
    t.same(r.assessment, 'suspicious', 'risk remains');
    t.assert(r.nextSteps[0].includes('Call the family member'), 'family route lost');
    t.assert(!r.nextSteps.some(function (step) { return step.startsWith('Contact Chase'); }), 'inferred bank displaced family');
  });
  t.test('FIX14 Unsupported shared-platform scopes do not inflate trusted coverage', function () {
    var s = window.TFS_SCOPE_SETUP.storeFor('approved');
    s.orgs[0].userContentHosts = ['chase.com'];
    s.orgs[0].contacts[0].scope.pathPrefix = '/reviewed-area';
    var view = T.buildTrustedView(s, '2026-10-12');
    t.same(view.trusted.length, 0, 'unusable record counted as trusted');
    t.same(view.excluded[0].reason, 'unsupported_shared_scope', 'scope exclusion');
  });
  t.test('FIX15 Explicit contact reviews supersede legacy pending notes', function () {
    var s = window.TFS_SCOPE_SETUP.storeFor('approved');
    s.orgs[0].sources = [{ domain: 'chase.com', check: 'needs review: old note' }];
    t.same(run(statement, null, s).assessment, 'details_match', 'eligible explicit contact ignored');
    s.orgs[0].contacts[0].status = 'draft';
    t.same(run(statement, null, s).assessment, 'insufficient_evidence', 'draft contact supported');
  });
  t.test('FIX16 Attached email labels preserve every contact and its source span', function () {
    ['Email:help@unlisted.example', 'Email: help@unlisted.example', 'Other:help@unlisted.example'].forEach(function (address) {
      var text = statement + ' ' + address, r = run(text);
      t.same(r.assessment, 'insufficient_evidence', 'second contact disappeared');
      t.same(r.evidence.contacts.length, 2, 'both contacts accounted for');
      T.sourceTargets(text).forEach(function (c) { t.same(text.slice(c.start, c.end), c.quote, 'contact span'); });
    });
  });
  t.test('FIX17 Same-host paths stay distinct and path-prefix boundaries are respected', function () {
    var s = window.TFS_SCOPE_SETUP.storeFor('approved');
    s.orgs[0].contacts[0].scope.pathPrefix = '/bank';
    t.same(run('Chase: https://chase.com/bank/help', null, s).assessment, 'details_match', 'inside path');
    ['https://chase.com/other', 'https://chase.com/bank-other'].forEach(function (outside) {
      [outside + ' https://chase.com/bank/help', 'https://chase.com/bank/help ' + outside].forEach(function (links) {
        var text = 'Chase: ' + links, r = run(text, null, s);
        t.same(r.assessment, 'insufficient_evidence', 'outside path supported');
        t.same(r.evidence.contacts.length, 2, 'distinct paths collapsed');
        t.same(T.annotate(text, r, s).notes.filter(function (n) { return n.ruleId.indexOf('contact:') === 0; }).length,
          2, 'path notes collapsed');
      });
    });
    s.orgs[0].contacts[0].scope.pathPrefix = '/bank/';
    t.same(run('Chase: https://chase.com/bank', null, s).assessment, 'insufficient_evidence', 'trailing-slash scope widened');
  });
  t.test('FIX18 Family instruction openers retain gift-card antecedents and negation', function () {
    ['Grandma, buy me gift cards for my birthday and text me the codes',
      'Grandpa, purchase gift cards and send me the codes'].forEach(function (text) {
      expect(text, 'suspicious', ['gift_card_disclosure'], ['T1-GIFT']);
    });
    ['Grandma, do not buy gift cards and send me the codes.',
      'Fraudsters may say "Grandma, buy gift cards and send me the codes."'].forEach(function (text) {
      var r = run(text);
      t.assert(!r.trace.rules.includes('T1-GIFT'), 'negated or reported request was promoted');
    });
  });
});
