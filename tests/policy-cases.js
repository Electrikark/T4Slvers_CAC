/* Phase 2 D: organization policy records (T1-POLICY).
   Real records stay drafts until two people review them, so these checks run reviewed copies
   marked as fictional test reviews. Every record in data/policies.js needs its three fixtures here. */
window.TFS_PHASE2.add('Policy records', function (t) {
  var T = window.TFS, engine = window.TfsEngine;
  var DAY = '2026-10-12';
  var REVIEW = { reviewed_by: 'Test fixture reviewer A (fictional)', second_reviewer: 'Test fixture reviewer B (fictional)', status: 'reviewed' };
  var FIXTURE_REVIEW = { reviewer: 'Test fixture (fictional record)', date: '2026-10-12', reviewDue: '2099-12-31', sourceUrl: 'https://example.invalid/fixture-record' };

  function copy(o, extra) {
    var out = JSON.parse(JSON.stringify(o));
    for (var k in extra || {}) out[k] = extra[k];
    return out;
  }
  function realRecord(id) { return window.TFS_POLICIES.records.filter(function (r) { return r.id === id; })[0]; }
  var store = { version: 'policy-fixture', shorteners: [], orgs: [
    { id: 'usps', displayName: 'USPS', aliases: ['usps', 'postal service', 'u.s. postal service'], officialDomains: ['usps.com'], officialPhones: [], userContentHosts: [], humanReview: FIXTURE_REVIEW },
    { id: 'example-bank', displayName: 'Example Bank', aliases: ['example bank'], officialDomains: ['example.com'], officialPhones: [], userContentHosts: [], humanReview: FIXTURE_REVIEW },
    { id: 'chase', displayName: 'Chase', aliases: ['chase bank'], strictAliases: ['chase'], officialDomains: ['chase.com'], officialPhones: [], userContentHosts: [], humanReview: FIXTURE_REVIEW }
  ] };
  var bankCode = { id: 'EXAMPLE-BANK-CODE-001', organization: 'Example Bank', orgId: 'example-bank', channels: ['sms', 'email'],
    forbidden_action: 'request_code_disclosure', predicates: [], exceptions: [],
    quote: 'Example Bank will never ask you to send us a one-time code. (Fictional fixture.)',
    source_url: 'https://example.invalid/policy', checked_on: '2026-10-01', review_due: '2099-12-31' };
  var policies = { version: 'policy-fixture', records: [
    copy(realRecord('USPS-TRACKING-NOLINK-001'), REVIEW),
    copy(bankCode, REVIEW),
    copy(bankCode, { id: 'EXAMPLE-BANK-EXCEPTION-001', forbidden_action: 'request_personal_data', quote: 'Fictional: we never ask for account details, unless you called us first.',
      exceptions: [{ quote: 'unless you called us first', cues: ['you called us'] }], reviewed_by: REVIEW.reviewed_by, second_reviewer: REVIEW.second_reviewer, status: 'reviewed' }),
    copy(bankCode, { id: 'EXAMPLE-BANK-UNSOLICITED-001', forbidden_action: 'any_contact_on_channel', channels: ['email'], quote: 'Fictional: we never email you unless you asked us to.',
      predicates: [{ name: 'customer_requested', mandatory: true, value: false, needs_question: 'Did you ask Example Bank to email you?' }], reviewed_by: REVIEW.reviewed_by, second_reviewer: REVIEW.second_reviewer, status: 'reviewed' })
  ] };

  function run(text, channel, extra) {
    var options = { declaredChannel: channel, policies: policies, today: DAY };
    for (var k in extra || {}) options[k] = extra[k];
    var r = engine.analyze(text, store, options);
    t.assert(engine.validateResult(r), 'invalid result for "' + text + '"');
    r.policy.findings.forEach(function (f) {
      if (f.spans.action) t.same(text.slice(f.spans.action.start, f.spans.action.end), f.spans.action.quote, 'action span');
      if (f.spans.sender) t.same(text.slice(f.spans.sender.start, f.spans.sender.end), f.spans.sender.quote, 'sender span');
    });
    return r;
  }
  function fired(r, id) { return r.policy.findings.some(function (f) { return f.policyId === id && f.status === 'established'; }); }
  function traceOf(r, id) { return r.policy.trace.filter(function (x) { return x.policyId === id; })[0] || {}; }
  function rules(r) { return r.trace.rules; }

  // Three fixtures per record: fires / legitimate or exception / unknown prerequisite.
  var FIXTURES = {
    'USPS-TRACKING-NOLINK-001': {
      fires: ['USPS: Your package is held. Update your address at usps-redelivery.top', 'text'],
      legitimate: ['USPS: Your package was delivered at 2:14 pm.', 'text'],
      unknown: ['USPS: Your package is held. Update your address at usps-redelivery.top', 'unknown']
    },
    'EXAMPLE-BANK-CODE-001': {
      fires: ['Example Bank: Send us the code we just texted you.', 'text'],
      legitimate: ['Example Bank: Your code is 482910. Never share it with anyone.', 'text'],
      unknown: ['Example Bank: Send us the code we just texted you.', 'unknown']
    },
    'EXAMPLE-BANK-EXCEPTION-001': {
      fires: ['Example Bank: Please confirm your bank details here.', 'text'],
      legitimate: ['Example Bank: Since you called us, please confirm your bank details here.', 'text'],
      unknown: ['Example Bank: Please confirm your bank details here.', 'unknown']
    },
    'EXAMPLE-BANK-UNSOLICITED-001': {
      fires: ['Example Bank: Here is your monthly update.', 'email', { customer_requested: false }],
      legitimate: ['Example Bank: Here is your monthly update.', 'email', { customer_requested: true }],
      unknown: ['Example Bank: Here is your monthly update.', 'email', null]
    }
  };

  t.test('D1 Every record in data/policies.js has its three fixtures', function () {
    window.TFS_POLICIES.records.forEach(function (r) {
      var f = FIXTURES[r.id];
      t.assert(f && f.fires && f.legitimate && f.unknown, 'missing fixtures for ' + r.id);
    });
  });

  t.test('D2 Each record fires on its fixture and stays quiet on the other two', function () {
    Object.keys(FIXTURES).forEach(function (id) {
      var f = FIXTURES[id];
      function go(row) { return run(row[0], row[1], row[2] ? { answers: row[2] } : null); }
      var yes = go(f.fires);
      t.assert(fired(yes, id), id + ' did not fire: ' + JSON.stringify(traceOf(yes, id)));
      t.assert(rules(yes).indexOf('T1-POLICY') >= 0 && yes.assessment === 'suspicious', id + ' fired without Suspicious');
      t.assert(!fired(go(f.legitimate), id), id + ' fired on its legitimate fixture');
      var unknown = go(f.unknown);
      t.assert(!fired(unknown, id), id + ' fired with an unknown prerequisite');
      t.assert(/^(?:channel_unknown|predicate_unknown:)/.test(traceOf(unknown, id).reason), id + ' unknown reason: ' + traceOf(unknown, id).reason);
    });
  });

  t.test('D3 A USPS link text fires with channel Text and not with Not sure', function () {
    var text = 'USPS: Your package is held. Update your address at usps-redelivery.top';
    var yes = run(text, 'text');
    t.same(traceOf(yes, 'USPS-TRACKING-NOLINK-001'), { policyId: 'USPS-TRACKING-NOLINK-001', outcome: 'fired', reason: 'link_present' }, 'Text trace');
    t.same(yes.policy.findings[0].spans.action.quote, 'usps-redelivery.top', 'the link is the action');
    t.same(yes.policy.findings[0].spans.sender.quote, 'USPS', 'the label is the sender');
    var no = run(text, 'unknown');
    t.same(traceOf(no, 'USPS-TRACKING-NOLINK-001').reason, 'channel_unknown', 'Not sure trace');
    t.assert(rules(no).indexOf('T1-POLICY') < 0, 'T1-POLICY with Not sure');
  });

  t.test('D4 With no other warning, Not sure gives Insufficient Evidence and protective advice', function () {
    // A link with no brand name in it, so T1-DOMAIN cannot decide the result.
    var text = 'USPS: Your package is held. Update your address at https://redelivery-help.top';
    var yes = run(text, 'text');
    t.same(rules(yes), ['T1-POLICY'], 'Text rules');
    t.assert(yes.actionWarnings.some(function (w) { return w.indexOf('USPS says its tracking texts and emails never contain a link. This one does.') === 0; }), 'policy note missing from advice');
    t.assert(yes.description.indexOf('has said it never does') >= 0, 'description');
    var no = run(text, 'unknown');
    t.same(no.assessment, 'insufficient_evidence', 'Not sure assessment');
    t.assert(no.actionWarnings[0].indexOf("Don't use any contact information") === 0, 'protective advice missing');
  });

  t.test('D5 A real USPS delivery notice does not fire', function () {
    ['USPS: Your package was delivered at 2:14 pm.', 'USPS: Your package will arrive today by 8 pm.'].forEach(function (text) {
      var r = run(text, 'text');
      t.assert(!fired(r, 'USPS-TRACKING-NOLINK-001'), 'fired on ' + text);
      t.same(traceOf(r, 'USPS-TRACKING-NOLINK-001').reason, 'action_not_found', 'reason for ' + text);
    });
  });

  t.test('D6 The sender must be the policy\'s own organization, named by the message', function () {
    t.same(traceOf(run('Chase: Your package is held. Update your address at https://redelivery-help.top', 'text'), 'USPS-TRACKING-NOLINK-001').reason, 'sender_mismatch', 'other sender');
    t.same(traceOf(run('Your package is held. Update your address at https://redelivery-help.top', 'text'), 'USPS-TRACKING-NOLINK-001').reason, 'no_sender:no_claim', 'no sender');
    t.same(traceOf(run('Fraudsters pose as USPS: your package is held at https://redelivery-help.top', 'text'), 'USPS-TRACKING-NOLINK-001').reason, 'no_sender:reporting_frame', 'reported');
  });

  t.test('D7 Service scope, exceptions and predicates each explain their skip', function () {
    t.same(traceOf(run('USPS: See our holiday hours at https://redelivery-help.top', 'text'), 'USPS-TRACKING-NOLINK-001').reason, 'service_out_of_scope', 'service');
    t.same(traceOf(run(FIXTURES['EXAMPLE-BANK-EXCEPTION-001'].legitimate[0], 'text'), 'EXAMPLE-BANK-EXCEPTION-001').reason, 'exception:0', 'exception');
    t.same(traceOf(run('Example Bank: Here is your monthly update.', 'email'), 'EXAMPLE-BANK-UNSOLICITED-001').reason, 'predicate_unknown:customer_requested', 'unknown predicate');
    t.same(traceOf(run('Example Bank: Here is your monthly update.', 'email', { answers: { customer_requested: true } }), 'EXAMPLE-BANK-UNSOLICITED-001').reason, 'predicate_not_met:customer_requested', 'answered predicate');
    t.same(traceOf(run('Example Bank: Here is your monthly update.', 'text', { answers: { customer_requested: false } }), 'EXAMPLE-BANK-UNSOLICITED-001').reason, 'channel_out_of_scope', 'channel');
  });

  t.test('D8 A real bank message that supplies a code does not fire; a demand does', function () {
    t.assert(!fired(run('Example Bank: Your code is 482910. Never share it with anyone.', 'text'), 'EXAMPLE-BANK-CODE-001'), 'supplied code fired');
    t.assert(fired(run('Example Bank: Read me the code we sent you.', 'email'), 'EXAMPLE-BANK-CODE-001'), 'demand did not fire');
  });

  t.test('D9 Unreviewed, incomplete or malformed policies never reach the evaluator', function () {
    var base = copy(bankCode, REVIEW);
    var bad = { version: 'bad', records: [
      copy(base, { id: 'draft', status: 'draft' }),
      copy(base, { id: 'one-reviewer', second_reviewer: null }),
      copy(base, { id: 'same-person', second_reviewer: base.reviewed_by }),
      copy(base, { id: 'expired', review_due: '2026-10-11' }),
      copy(base, { id: 'made-up-action', forbidden_action: 'request_anything' }),
      copy(base, { id: 'bad-channel', channels: ['social'] }),
      copy(base, { id: 'loose-predicate', predicates: [{ name: 'asked' }] }),
      copy(base, { id: 'loose-exception', exceptions: [{ quote: 'unless' }] })
    ] };
    var view = T.buildPolicyView(bad, DAY);
    t.same(view.trusted.length, 0, 'nothing trusted');
    t.same(view.excluded.map(function (x) { return x.id + '=' + x.reason; }), ['draft=not_reviewed', 'one-reviewer=missing:second_reviewer',
      'same-person=same_reviewer_twice', 'expired=expired', 'made-up-action=unsupported_action', 'bad-channel=invalid_channels',
      'loose-predicate=invalid_predicates', 'loose-exception=invalid_exceptions'], 'reasons');
    var r = engine.analyze('Example Bank: Send us the code we just texted you.', store, { declaredChannel: 'text', policies: bad, today: DAY });
    t.same([r.policy.findings.length, r.policy.trace.length, r.policy.excluded.length], [0, 0, 8], 'excluded policies stay out');
  });

  t.test('D10 The real draft record is excluded with its reason and never fires', function () {
    var r = engine.analyze('USPS: Your package is held. Update your address at https://redelivery-help.top', window.TFS_STORE, { declaredChannel: 'text', policies: window.TFS_POLICIES });
    t.same(r.policy.findings, [], 'draft fired');
    t.same(r.policy.excluded, [{ id: 'USPS-TRACKING-NOLINK-001', reason: 'not_reviewed' }], 'exclusion');
  });

  t.test('D11 A gift-card policy turns an unresolved gift request into an unresolved policy finding', function () {
    var gift = { version: 'gift', records: [copy(bankCode, { id: 'EXAMPLE-BANK-GIFT-001', forbidden_action: 'request_payment_gift_card', reviewed_by: REVIEW.reviewed_by, second_reviewer: REVIEW.second_reviewer, status: 'reviewed' })] };
    var r = engine.analyze('Example Bank: Buy gift cards and send me the numbers on your debit card.', store, { declaredChannel: 'text', policies: gift, today: DAY });
    t.same(r.policy.trace, [{ policyId: 'EXAMPLE-BANK-GIFT-001', outcome: 'unresolved', reason: 'request_payment_gift_card' }], 'trace');
    t.assert(r.evidence.uncertainty.indexOf('policy_unresolved:EXAMPLE-BANK-GIFT-001') >= 0, 'uncertainty');
    t.same(r.assessment, 'insufficient_evidence', 'an unresolved policy blocks without deciding');
  });
});
