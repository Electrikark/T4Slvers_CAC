/* Fixed policy expectations, independent of the gate under test.
   New fixtures are fictional. Legacy inputs stay in their original files. */
window.TFS_GATE_STORE = {
  version: 'fictional-gate-fixture', shorteners: [],
  orgs: [
    { id: 'example-bank', displayName: 'Example Bank', aliases: ['example bank'],
      humanReview: { reviewer: 'Test fixture (fictional record)', date: '2026-10-12' },
      officialDomains: ['example.com'], officialPhones: ['+12025550123'], userContentHosts: [] },
    { id: 'sample-union', displayName: 'Sample Union', aliases: ['sample union'],
      humanReview: { reviewer: 'Test fixture (fictional record)', date: '2026-10-12' },
      officialDomains: ['example.org'], officialPhones: [], userContentHosts: [] }
  ]
};
window.assessmentParityEvidence = [];
window.runAssessmentTests = function (gate) {
  var rows = [];
  var engine = window.TfsEngine;
  function assert(ok, reason) { if (!ok) throw new Error(reason); }
  function same(a, b, reason) { assert(JSON.stringify(a) === JSON.stringify(b), reason + ': ' + JSON.stringify(a)); }
  function test(id, fn) {
    try { fn(); rows.push({ cells: [id, 'PASS', ''], passed: true }); }
    catch (err) { rows.push({ cells: [id, 'FAIL', err.message], passed: false }); }
  }
  function valid() {
    return { sender: { explicit: true, recognizedOrg: 'example-bank' },
      contacts: [{ org: 'example-bank', verification: 'verified' }], findings: [], uncertainty: [] };
  }
  function resultIs(e, assessment, rules, blockedBy) {
    var r = gate.assess(e);
    same(r, { assessment: assessment, trace: { rules: rules, blockedBy: blockedBy } }, 'assessment and trace');
    window.assessmentParityEvidence.push(e);
  }
  function run(text) {
    var r = engine.analyze(text, window.TFS_GATE_STORE, { declaredChannel: 'text' });
    assert(engine.validateResult(r), 'engine result is invalid');
    assert(!('state' in r) && !('decision' in r), 'parallel verdict remains');
    same(r.schemaVersion, 3, 'schema');
    r.evidence.findings.forEach(function (f) {
      if (f.span) same(text.slice(f.span.start, f.span.end), f.span.quote, 'source span');
      else assert(r.evidence.uncertainty.some(function (u) { return u.indexOf('finding_span_unavailable:' + f.ruleId + ':') === 0; }), 'missing-span uncertainty');
    });
    window.assessmentParityEvidence.push(r.evidence);
    return r;
  }
  function engineIs(text, assessment, rules, blockedBy) {
    var r = run(text);
    same(r.assessment, assessment, 'assessment');
    same(r.trace, { rules: rules, blockedBy: blockedBy }, 'trace');
    return r;
  }
  function finding(tier, status) { return { ruleId: 'T1-GIFT', tier: tier, status: status, span: null }; }
  test('U1 Established Tier 1 takes priority', function () {
    var e = valid(); e.findings = [finding(1, 'established')];
    resultIs(e, 'suspicious', ['T1-GIFT'], []);
  });
  test('U2 Tier 2 blocks Details Match', function () {
    var e = valid(); e.findings = [{ ruleId: 'urgency', tier: 2, status: 'established', span: null }];
    resultIs(e, 'insufficient_evidence', [], ['RISK_SIGNAL']);
  });
  test('U3 All gate conditions hold', function () {
    resultIs(valid(), 'details_match', ['DM_ALL_CONDITIONS'], []);
  });
  test('U4 Unresolved Tier 1 blocks Details Match', function () {
    var e = valid(); e.findings = [finding(1, 'unresolved')];
    resultIs(e, 'insufficient_evidence', [], ['RISK_SIGNAL']);
  });
  test('U5 Verified phone and unknown link', function () {
    var e = valid(); e.contacts.push({ org: null, verification: 'unresolved' });
    resultIs(e, 'insufficient_evidence', [], ['UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT']);
  });
  test('U6 No contacts cannot pass', function () {
    var e = valid(); e.contacts = [];
    resultIs(e, 'insufficient_evidence', [], ['NO_VERIFIED_CONTACT']);
  });
  test('U7 No explicit sender', function () {
    var e = valid(); e.sender = { explicit: false, recognizedOrg: null };
    resultIs(e, 'insufficient_evidence', [], ['NO_EXPLICIT_RECOGNIZED_SENDER', 'NO_VERIFIED_CONTACT', 'UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT']);
  });
  test('U8 Extraction uncertainty blocks', function () {
    var e = valid(); e.uncertainty = ['extraction_failed'];
    resultIs(e, 'insufficient_evidence', [], ['UNCERTAINTY']);
  });
  test('U9 Contact belongs to another organization', function () {
    var e = valid(); e.contacts[0].org = 'sample-union';
    resultIs(e, 'insufficient_evidence', [], ['NO_VERIFIED_CONTACT', 'UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT']);
  });
  test('U10 Legacy match is not a canonical assessment', function () {
    var threw = false;
    try { gate.assertAssessment('match'); } catch (err) { threw = true; }
    assert(threw, 'legacy match accepted');
  });
  test('U11 T1-DOMAIN takes priority over a verified contact', function () {
    var e = valid(); e.findings = [{ ruleId: 'T1-DOMAIN', tier: 1, status: 'established', span: null }];
    resultIs(e, 'suspicious', ['T1-DOMAIN'], []);
  });
  test('U12 T1-CODE takes priority over a verified contact', function () {
    var e = valid(); e.findings = [{ ruleId: 'T1-CODE', tier: 1, status: 'established', span: null }];
    resultIs(e, 'suspicious', ['T1-CODE'], []);
  });
  test('U15 T1-CALLBACK takes priority over a verified contact', function () {
    var e = valid(); e.findings = [{ ruleId: 'T1-CALLBACK', tier: 1, status: 'established', span: null }];
    resultIs(e, 'suspicious', ['T1-CALLBACK'], []);
  });
  test('U13 Unknown Tier 1 rule is rejected, not trusted', function () {
    var e = valid(); e.findings = [{ ruleId: 'T1-MADE-UP', tier: 1, status: 'established', span: null }];
    var threw = false;
    try { gate.assess(e); } catch (err) { threw = true; }
    assert(threw, 'unknown Tier 1 rule accepted');
  });
  test('U14 Closed Tier 1 list', function () {
    same(Array.prototype.slice.call(gate.TIER1_RULES), ['T1-GIFT', 'T1-WIRE', 'T1-REMOTE', 'T1-DOMAIN', 'T1-CODE', 'T1-CALLBACK'], 'Tier 1 rules');
  });
  test('E1 Gift-card demand through the real engine', function () {
    var r = engineIs('Example Bank: Buy gift cards to restore your account. Visit https://example.com.', 'suspicious', ['T1-GIFT'], []);
    assert(r.evidence.findings.some(function (f) { return f.ruleId === 'T1-GIFT' && f.tier === 1 && f.status === 'established'; }), 'gift rule lost');
    same(r.evidence.contacts[0].verification, 'verified', 'supporting contact');
    assert(r.actionWarnings[0].indexOf("Don't use any contact information") === 0, 'protective advice');
  });
  test('I1 Explicit sender keeps its stable organization ID', function () {
    var r = engineIs('Example Bank: Your statement is ready. Visit https://example.com.', 'details_match', ['DM_ALL_CONDITIONS'], []);
    same(r.evidence.sender, { explicit: true, recognizedOrg: 'example-bank' }, 'sender');
    same(r.evidence.contacts[0].org, 'example-bank', 'contact owner');
    same(r.evidence.uncertainty, [], 'unexpected uncertainty');
  });
  test('I2 Inferred sender has no sender ID and retains uncertainty', function () {
    var r = engineIs('Visit https://example.com.', 'insufficient_evidence', [], ['NO_EXPLICIT_RECOGNIZED_SENDER', 'NO_VERIFIED_CONTACT', 'UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT', 'UNCERTAINTY']);
    same(r.evidence.sender, { explicit: false, recognizedOrg: null }, 'inferred sender');
    same(r.evidence.uncertainty, ['inferred_sender'], 'inferred uncertainty');
  });
  test('I3 Missing contacts remain empty', function () {
    var r = engineIs('Example Bank: Your statement is ready.', 'insufficient_evidence', [], ['NO_VERIFIED_CONTACT']);
    same(r.evidence.contacts, [], 'synthetic contact');
  });
  test('I4 Verified phone plus unresolved link', function () {
    var r = engineIs('Example Bank: Call (202) 555-0123 or visit https://help-center.test.', 'insufficient_evidence', [], ['UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT']);
    same(r.evidence.contacts.map(function (c) { return c.verification; }).sort(), ['unresolved', 'verified'], 'contact states');
  });
  test('I5 Unknown phone stays unresolved', function () {
    engineIs('Example Bank: Call (202) 555-0199.', 'insufficient_evidence', [], ['NO_VERIFIED_CONTACT', 'UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT']);
  });
  test('I6 Partial input retains uncertainty', function () {
    var r = engineIs('Example Bank: https://example.com ' + 'x'.repeat(20000), 'insufficient_evidence', [], ['UNCERTAINTY']);
    assert(r.incomplete && r.evidence.uncertainty.indexOf('input_incomplete') >= 0, 'incomplete input lost');
  });
  test('I7 Established risk survives partial input and unresolved contact', function () {
    engineIs('Example Bank: Wire $800 right now. Visit https://help-center.test. ' + 'x'.repeat(20000), 'suspicious', ['T1-WIRE'], []);
  });
  test('I8 Low severity finding remains a blocker', function () {
    var r = engineIs('Example Bank: Your account is locked. Visit https://example.com.', 'insufficient_evidence', [], ['RISK_SIGNAL']);
    assert(r.evidence.findings.some(function (f) { return f.ruleId === 'account_locked' && f.tier === 2; }), 'low severity dropped');
  });
  test('I9 High severity alone never becomes Tier 1', function () {
    var r = engineIs('Example Bank: Keep this between us. Visit https://example.com.', 'insufficient_evidence', [], ['RISK_SIGNAL']);
    same(r.requestRisk.level, 'high', 'legacy severity');
    assert(r.evidence.findings.every(function (f) { return f.tier === 2; }), 'severity promoted');
  });
  test('I10 Unresolved gift candidate retains support', function () {
    var r = engineIs('Example Bank: Buy gift cards and send me the numbers on your debit card. Visit https://example.com.', 'insufficient_evidence', [], ['UNCERTAINTY', 'RISK_SIGNAL']);
    assert(r.evidence.findings.some(function (f) { return f.ruleId === 'T1-GIFT' && f.tier === 1 && f.status === 'unresolved' && f.support.id === 'competing_card_code_antecedent'; }), 'unresolved gift lost');
  });
  test('I11 Contact conflict stays visible as Tier 2, with no invented span', function () {
    var r = engineIs('Example Bank: https://example.com https://example.org', 'insufficient_evidence', [], ['UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT', 'UNCERTAINTY', 'RISK_SIGNAL']);
    var f = r.evidence.findings[0];
    same([f.ruleId, f.tier, f.status, f.span], ['legacy_contact:domain_belongs_to_other_org', 2, 'established', null], 'conflict classification');
    same(f.support.orgId, 'sample-union', 'conflicting owner');
    assert(r.checks.some(function (c) { return c.status === 'CONTRADICTS'; }), 'display conflict lost');
    assert(r.meaning.indexOf('conflict') >= 0, 'conflict explanation lost');
  });
  test('I12 Unreadable contact preserves extraction uncertainty', function () {
    var r = run('Example Bank: https://example.com|other.test');
    same(r.assessment, 'insufficient_evidence', 'unreadable assessment');
    same(r.trace.blockedBy, ['NO_VERIFIED_CONTACT', 'UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT', 'UNCERTAINTY'], 'unreadable blockers');
    assert(r.evidence.uncertainty.indexOf('extraction_failed:0') >= 0, 'extraction uncertainty lost');
  });
  test('I13 Risk spans survive original Unicode and whitespace', function () {
    var r = engineIs('🙂 Example Bank:\n  Buy gift cards to restore your account. Visit https://example.com.', 'suspicious', ['T1-GIFT'], []);
    assert(r.evidence.findings.every(function (f) { return f.span && f.span.start > 0; }), 'raw spans missing');
  });
  test('I14 Validator rejects assessment, trace, and evidence drift', function () {
    var good = run('Example Bank: Your statement is ready. Visit https://example.com.');
    var mutations = [
      function (r) { r.assessment = 'suspicious'; },
      function (r) { r.trace.rules = []; },
      function (r) { r.trace.blockedBy = ['RISK_SIGNAL']; },
      function (r) { r.evidence.contacts[0].verification = 'unresolved'; },
      function (r) { r.evidence.sender.recognizedOrg = null; },
      function (r) { r.evidence.contacts = []; },
      function (r) { r.evidence.findings = [null]; },
      function (r) { r.evidence.uncertainty = ['extraction_failed']; },
      function (r) { r.state = 'match'; },
      function (r) { r.decision = {}; },
      function (r) { r.checks[0].status = 'UNKNOWN'; }
    ];
    mutations.forEach(function (mutate, index) {
      var bad = JSON.parse(JSON.stringify(good)); mutate(bad);
      assert(!engine.validateResult(bad), 'drift accepted: ' + index);
    });
  });
  test('I15 Missing spans add uncertainty without erasing a finding', function () {
    var evidence = window.TFS.normalizeEvidence([], { explicit: true, recognizedOrg: 'example-bank' }, false,
      { established: [], unresolved: [], flags: [{ id: 'urgency', level: 'medium', words: 'today' }] }, false);
    same(evidence.findings[0].span, null, 'invented span');
    same(evidence.uncertainty, ['finding_span_unavailable:urgency:0'], 'span uncertainty');
    resultIs(evidence, 'insufficient_evidence', [], ['NO_VERIFIED_CONTACT', 'UNCERTAINTY', 'RISK_SIGNAL']);
  });
  test('I16 Declared channel never overrides the assessment', function () {
    ['text', 'email', 'unknown'].forEach(function (channel) {
      var r = engine.analyze('Example Bank: Buy gift cards to restore your account. Visit https://example.com.', window.TFS_GATE_STORE, { declaredChannel: channel });
      same(r.assessment, 'suspicious', 'channel changed risk');
      same(r.trace, { rules: ['T1-GIFT'], blockedBy: [] }, 'channel trace');
    });
  });
  test('I18 Unreviewed reference records cannot support a match', function () {
    // data/store.js records carry an automated check only; none is human-reviewed yet.
    var r = engine.analyze('USPS: Your package is out for delivery. Track it at https://tools.usps.com/go/TrackConfirmAction', window.TFS_STORE, { declaredChannel: 'text' });
    assert(engine.validateResult(r), 'invalid result');
    same(r.assessment, 'insufficient_evidence', 'assessment');
    same(r.checks.map(function (c) { return c.code; }), ['reference_needs_review'], 'codes');
    assert(r.evidence.contacts.every(function (c) { return c.verification !== 'verified'; }), 'unreviewed record verified a contact');
  });
  test('I19 Review status decides support, not the record alone', function () {
    var store = JSON.parse(JSON.stringify(window.TFS_GATE_STORE));
    delete store.orgs[0].humanReview;
    var r = engine.analyze('Example Bank: Your statement is ready. Visit https://example.com.', store, { declaredChannel: 'text' });
    same(r.assessment, 'insufficient_evidence', 'unreviewed fixture');
    same(r.checks[0].code, 'reference_needs_review', 'code');
    store.orgs[0].humanReview = { reviewer: 'Example Reviewer' };
    same(engine.analyze('Example Bank: Visit https://example.com.', store, { declaredChannel: 'text' }).checks[0].code, 'reference_needs_review', 'review without a date');
  });
  test('I17 Remote access pressure retains established Tier 1', function () {
    // Both existing demands (install and grant) establish a rule; retain both trace entries.
    engineIs('Example Bank: Install AnyDesk and grant remote access. Keep this between us. Visit https://example.com.', 'suspicious', ['T1-REMOTE', 'T1-REMOTE'], []);
  });
  return rows;
};
