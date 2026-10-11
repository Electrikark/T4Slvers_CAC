/* "I checked it myself" outcomes, run against real engine results.
   The step reports the person's own check; it must never change or overstate the assessment. */
window.runSelfCheckTests = function () {
  var rows = [];
  var check = window.TfsSelfCheck;
  var engine = window.TfsEngine;
  function assert(ok, reason) { if (!ok) throw new Error(reason); }
  function test(id, fn) {
    try { fn(); rows.push({ cells: [id, 'PASS', ''], passed: true }); }
    catch (err) { rows.push({ cells: [id, 'FAIL', err.message], passed: false }); }
  }
  function analyze(text) { return engine.analyze(text, window.TFS_STORE, { declaredChannel: 'text' }); }
  function says(outcome, words) {
    var all = outcome.title + ' ' + outcome.lines.join(' ');
    assert(all.indexOf(words) >= 0, 'missing "' + words + '" in: ' + all);
  }
  var demos = window.demoScenarios;
  var usps = analyze(demos.delivery.input);
  var gift = analyze(demos.family.input);
  var lookalike = analyze(demos.bank.input);
  var family = analyze('Hi Mom, I dropped my phone. This is my new number.');

  test('S1 Not checked yet gives how-to steps', function () {
    var o = check.outcome('not_yet', null, usps);
    assert(o.kind === 'not_yet', o.kind);
    says(o, 'number on your card');
  });
  test('S2 A contact from the message never counts, whatever they said', function () {
    ['confirmed', 'denied', 'unsure', null].forEach(function (answer) {
      var o = check.outcome('message', answer, usps);
      assert(o.kind === 'not_independent', String(answer) + ': ' + o.kind);
    });
  });
  test('S3 They did not send it: delete and report', function () {
    var o = check.outcome('card', 'denied', usps);
    assert(o.kind === 'not_them', o.kind);
    says(o, '7726');
    says(o, 'reportfraud.ftc.gov');
  });
  test('S4 Still unsure keeps the pause', function () {
    assert(check.outcome('app', 'unsure', usps).kind === 'still_unsure', 'pause lost');
  });
  test('S5 Confirmed through a number they already had', function () {
    var o = check.outcome('card', 'confirmed', usps);
    assert(o.kind === 'confirmed', o.kind);
    says(o, 'by calling a number you already had');
    says(o, 'not from this app');
  });
  test('S6 A confirmed gift-card request is still never normal', function () {
    var o = check.outcome('card', 'confirmed', gift);
    assert(o.kind === 'confirmed_but_risky', o.kind);
    says(o, 'gift cards');
    says(o, 'reached the fraudster');
  });
  test('S7 A confirmed message keeps the lookalike-link warning', function () {
    var o = check.outcome('app', 'confirmed', lookalike);
    assert(o.kind === 'confirmed', o.kind);
    says(o, 'still imitates another website');
  });
  test('S8 Every Tier 1 request rule has a never-normal line', function () {
    ['T1-GIFT', 'T1-CODE', 'T1-WIRE', 'T1-REMOTE', 'T1-CALLBACK'].forEach(function (ruleId) {
      var fake = { evidence: { findings: [{ ruleId: ruleId, tier: 1, status: 'established' }] } };
      assert(check.outcome('card', 'confirmed', fake).kind === 'confirmed_but_risky', ruleId);
    });
    var unresolved = { evidence: { findings: [{ ruleId: 'T1-GIFT', tier: 1, status: 'unresolved' }] } };
    assert(check.outcome('card', 'confirmed', unresolved).kind === 'confirmed', 'unresolved rule treated as established');
  });
  test('S9 Family confirmed on a known number keeps that line open', function () {
    var o = check.outcome('known_person', 'confirmed', family);
    assert(o.kind === 'confirmed', o.kind);
    says(o, 'number you already know');
  });
  test('S10 The check never changes the result', function () {
    [usps, gift, lookalike, family].forEach(function (r) {
      var before = JSON.stringify(r);
      Object.keys(check.METHODS).forEach(function (m) {
        Object.keys(check.ANSWERS).forEach(function (a) { check.outcome(m, a, r); });
      });
      assert(JSON.stringify(r) === before, 'result changed');
      assert(engine.validateResult(r), 'result no longer valid');
    });
  });
  test('S11 No outcome promises safety', function () {
    var bad = /\b(?:safe|verified|legitimate)\b/i;
    Object.keys(check.METHODS).forEach(function (m) {
      assert(!bad.test(check.METHODS[m].label + ' ' + check.METHODS[m].hint), 'method ' + m);
      Object.keys(check.ANSWERS).forEach(function (a) {
        [usps, gift, lookalike, family].forEach(function (r) {
          var o = check.outcome(m, a, r);
          assert(!bad.test(o.title + ' ' + o.lines.join(' ')), m + '/' + a);
        });
      });
    });
  });
  test('S12 Unknown choices are rejected', function () {
    var threw = 0;
    try { check.outcome('email_link', 'confirmed', usps); } catch (err) { threw++; }
    try { check.outcome('card', 'maybe', usps); } catch (err) { threw++; }
    assert(threw === 2, 'unknown choice accepted');
  });
  return rows;
};
