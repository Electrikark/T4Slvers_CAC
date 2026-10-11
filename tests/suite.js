window.runEngineTests = function () {
  var RANK = { none: 0, elevated: 1, high: 2 };
  var store = window.TFS_FIXTURE_STORE;
  var engine = window.TfsEngine;
  var rowsEl = [], invEl = [], realEl = [], stepEl = [];
  var realResults = [];

  function addRow(tbody, cells, ok) {
    tbody.push({ cells: cells, passed: ok });
  }

  function codesOf(result) {
    return (result.checks || []).map(function (c) { return c.code; });
  }

  function judge(result, expect) {
    var problems = [];
    if (!result || typeof result !== 'object') return ['analyze did not return an object'];
    if (expect.assessment && result.assessment !== expect.assessment) problems.push('assessment is ' + result.assessment + ', expected ' + expect.assessment);
    if (expect.contactStrength && !result.checks.some(function (c) { return c.strength === expect.contactStrength; })) problems.push('missing contact strength ' + expect.contactStrength);
    var codes = codesOf(result);
    (expect.codes || []).forEach(function (c) { if (codes.indexOf(c) < 0) problems.push('missing code ' + c + ' (got ' + (codes.join(', ') || 'none') + ')'); });
    (expect.notCodes || []).forEach(function (c) { if (codes.indexOf(c) >= 0) problems.push('forbidden code ' + c); });
    if (typeof expect.incomplete === 'boolean' && result.incomplete !== expect.incomplete) problems.push('incomplete flag differs');
    var risk = result.requestRisk || { level: undefined, flags: [] };
    if (expect.risk && risk.level !== expect.risk) problems.push('risk is ' + risk.level + ', expected ' + expect.risk);
    if (expect.riskAtLeast && !(RANK[risk.level] >= RANK[expect.riskAtLeast])) problems.push('risk is ' + risk.level + ', expected at least ' + expect.riskAtLeast);
    var flagIds = (risk.flags || []).map(function (f) { return f.id; });
    (expect.flags || []).forEach(function (f) { if (flagIds.indexOf(f) < 0) problems.push('missing flag ' + f + ' (got ' + (flagIds.join(', ') || 'none') + ')'); });
    (expect.notFlags || []).forEach(function (f) { if (flagIds.indexOf(f) >= 0) problems.push('unexpected flag ' + f); });
    // Tier 1 can come from the wording (requestRisk) or from a contact (T1-DOMAIN).
    var ruleIds = risk.established.map(function (e) { return e.ruleId; }).concat((result.evidence ? result.evidence.findings : [])
      .filter(function (f) { return f.tier === 1 && f.status === 'established'; }).map(function (f) { return f.ruleId; }));
    (expect.rules || []).forEach(function (id) { if (ruleIds.indexOf(id) < 0) problems.push('missing rule ' + id); });
    (expect.notRules || []).forEach(function (id) { if (ruleIds.indexOf(id) >= 0) problems.push('unexpected rule ' + id); });
    if (expect.unresolved && !risk.unresolved.length) problems.push('missing unresolved risk');
    var words = [result.description, result.meaning].concat(result.actionWarnings || [], result.nextSteps || []).join(' ');
    (expect.says || []).forEach(function (w) { if (words.indexOf(w) < 0) problems.push('missing wording: ' + w); });
    (expect.neverSays || []).forEach(function (w) { if (words.indexOf(w) >= 0) problems.push('unexpected wording: ' + w); });
    return problems;
  }

  function run(text) {
    return engine.analyze(text, store, { declaredChannel: 'unknown' });
  }

  if (!engine || typeof engine.analyze !== 'function') {
    throw new Error('The engine did not load.');
  }

  var passed = 0;
  var results = [];
  window.TFS_CASES.forEach(function (c) {
    var result, problems;
    try {
      result = run(c.text);
      problems = judge(result, c.expect);
    } catch (err) {
      result = null;
      problems = ['threw: ' + (err && err.message ? err.message : err)];
    }
    results.push(result);
    var ok = problems.length === 0;
    if (ok) passed += 1;
    addRow(rowsEl, [c.id, ok ? 'PASS' : 'FAIL', c.text, ok ? c.guards : problems.join('; ')], ok);
  });

  var realPassed = 0, realTotal = 0;
  if (window.TFS_REAL_CASES && window.TFS_STORE && engine) {
    window.TFS_REAL_CASES.forEach(function (c) {
      realTotal += 1;
      var problems;
      try { var r = engine.analyze(c.text, window.TFS_STORE, { declaredChannel: 'unknown' }); realResults.push(r); problems = judge(r, c.expect); }
      catch (err) { problems = ['threw: ' + (err && err.message ? err.message : err)]; }
      var ok = problems.length === 0;
      if (ok) realPassed += 1;
      addRow(realEl, [c.id, ok ? 'PASS' : 'FAIL', c.text, ok ? c.guards : problems.join('; ')], ok);
    });
  }

  window.TFS_STEP1_CASES.forEach(function (c) {
    var problems;
    try {
      var r = engine.analyze(c.text, store, { declaredChannel: c.channel || 'text' });
      realResults.push(r);
      problems = judge(r, c.expect);
      if (!engine.validateResult(r)) problems.push('invalid result shape');
      r.requestRisk.flags.forEach(function (f) { if (c.text.slice(f.start, f.end) !== f.words) problems.push('flag source differs'); });
      r.requestRisk.established.forEach(function (e) {
        [e.action, e.clause, e.object, e.context, e.antecedent].filter(Boolean).forEach(function (s) {
          if (c.text.slice(s.start, s.end) !== s.quote) problems.push('rule source differs');
        });
        if (e.ruleId === 'T1-GIFT' && e.antecedent && !/gift[ -]?card/i.test(e.antecedent.quote)) problems.push('missing gift antecedent');
      });
      if (r.assessment !== 'details_match' && !r.actionWarnings.some(function (w) { return w.indexOf("Don't use any contact information") === 0; })) problems.push('protective advice missing');
    } catch (err) { problems = ['threw: ' + err.message]; }
    addRow(stepEl, [c.id, problems.length ? 'FAIL' : 'PASS', c.text, problems.length ? problems.join('; ') : c.guards], !problems.length);
  });

  var fixtureResults = results;
  results = results.concat(realResults);
  var caseIds = window.TFS_CASES.concat(window.TFS_REAL_CASES, window.TFS_STEP1_CASES).map(function (c) { return c.id; });
  var invPassed = 0, invTotal = 0;
  function invariant(name, fn) {
    invTotal += 1;
    var problems = [];
    try { problems = fn(); } catch (err) { problems = ['threw: ' + (err && err.message ? err.message : err)]; }
    var ok = problems.length === 0;
    if (ok) invPassed += 1;
    addRow(invEl, [name, ok ? 'PASS' : 'FAIL', ok ? '' : problems.join('; ')], ok);
  }

  invariant('1 Match is earned', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && r.assessment === 'details_match') {
        var checks = r.checks || [];
        var allSupport = checks.length > 0 && checks.every(function (k) { return k.status === 'SUPPORTS'; });
        if (!allSupport || !r.claimedIdentity || r.claimedIdentity === 'Not stated') bad.push(caseIds[i]);
      }
    });
    return bad.length ? ['match without full support in ' + bad.join(', ')] : [];
  });
  // spec v1.2: only established Tier 1 wins; legacy contact conflicts block a match.
  invariant('2 Established Tier 1 wins', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && r.evidence.findings.some(function (f) { return f.tier === 1 && f.status === 'established'; }) && r.assessment !== 'suspicious') bad.push(caseIds[i]);
    });
    return bad.length ? ['established Tier 1 ignored in ' + bad.join(', ')] : [];
  });
  invariant('3 No targets cannot match; independent risk can warn', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      var codes = r ? codesOf(r) : [];
      if (r && codes.indexOf('nothing_to_check') >= 0 && r.assessment !== 'insufficient_evidence' && !r.requestRisk.established.length) bad.push(caseIds[i]);
    });
    return bad.length ? ['verdict without targets in ' + bad.join(', ')] : [];
  });
  // Schema v3: the internal 'verified' contact enum is not a user-facing assurance.
  invariant('4 No reassurance words', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && /\b(safe|verified|legitimate)\b/i.test(JSON.stringify(Object.assign({}, r, { evidence: undefined })).replace('We have not verified who sent this message.', ''))) bad.push(caseIds[i]);
    });
    return bad.length ? ['reassurance word in ' + bad.join(', ')] : [];
  });
  invariant('5 Match never hides a request', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && r.assessment === 'details_match' && (r.requestRisk.flags.length || r.requestRisk.unresolved.length)) bad.push(caseIds[i]);
    });
    return bad.length ? ['match with risk signals in ' + bad.join(', ')] : [];
  });
  invariant('6 Never throws on odd input', function () {
    var odd = ['', '   ', 'x'.repeat(100000), '\u{1F600}\u{1F600}\u{1F600}', 'שלום مرحبا', 'a\u0000b', 'lone \uD800 surrogate'];
    var bad = [];
    odd.forEach(function (t, i) {
      var r = run(t);
      if (!r || typeof r !== 'object' || !r.assessment) bad.push('input ' + i);
    });
    return bad.length ? ['no valid result for ' + bad.join(', ')] : [];
  });
  invariant('7 Deterministic', function () {
    var t = window.TFS_CASES[1].text;
    return JSON.stringify(run(t)) === JSON.stringify(run(t)) ? [] : ['two runs differ'];
  });
  invariant('8 Valid shape', function () {
    if (typeof engine.validateResult !== 'function') return ['validateResult is not defined'];
    var bad = [];
    results.forEach(function (r, i) { if (!engine.validateResult(r)) bad.push(caseIds[i]); });
    return bad.length ? ['invalid shape in ' + bad.join(', ')] : [];
  });
  invariant('9 Bounded time', function () {
    var problems = [];
    var base = window.TFS_CASES.map(function (c) { return c.text; }).join(' ');
    var t5 = (base + ' ').repeat(Math.ceil(5000 / base.length)).slice(0, 5000);
    // Best of three: the budget is for the engine, not a garbage-collection pause on a shared runner.
    function fastest(text) {
      var best = Infinity;
      for (var k = 0; k < 3; k++) { var a = performance.now(); run(text); best = Math.min(best, performance.now() - a); }
      return best;
    }
    var d1 = fastest(t5);
    if (d1 > 50) problems.push('5,000 characters took ' + Math.round(d1) + ' ms');
    var hostile = '.a'.repeat(50000);
    var d2 = fastest(hostile);
    if (d2 > 1000) problems.push('hostile 100,000 characters took ' + Math.round(d2) + ' ms');
    return problems;
  });

  invariant('10 Malformed results fail closed', function () {
    var good = fixtureResults[0];
    var bad = [null, {}, Object.assign({}, good, { assessment: 'constructor' }),
      Object.assign({}, good, { checks: [null] }),
      Object.assign({}, good, { channel: undefined }),
      Object.assign({}, good, { nextSteps: [] }),
      Object.assign({}, good, { checks: [{ status: 'UNKNOWN', code: 'nothing_to_check', detail: 'No contact', source: 'Test' }] }),
      Object.assign({}, good, { requestRisk: Object.assign({}, good.requestRisk, { level: 'high' }) }),
      Object.assign({}, good, { reputationLookup: { status: 'clean' } }),
      Object.assign({}, good, { requestRisk: { level: 'high', flags: [null] } })];
    return bad.some(function (r) { return engine.validateResult(r); }) ? ['accepted a malformed result'] : [];
  });
  invariant('11 Required channel rejects missing and invalid choices', function () {
    var options = [undefined, {}, { declaredChannel: 'constructor' }, { declaredChannel: 'sms' }, { declaredChannel: ['text'] }, { declaredChannel: new String('text') }];
    var accepted = options.some(function (o) { try { engine.analyze('Chase: https://chase.com', store, o); return true; } catch (err) { return false; } });
    return accepted ? ['invalid channel accepted'] : [];
  });
  invariant('12 Each declared channel survives analysis', function () {
    return ['text', 'email', 'unknown'].some(function (ch) {
      return engine.analyze('Chase: https://chase.com', store, { declaredChannel: ch }).declaredChannel !== ch;
    }) ? ['channel lost'] : [];
  });
  invariant('13 Partial input cannot match', function () {
    return results.some(function (r) { return r.incomplete && r.assessment === 'details_match'; }) ? ['partial input matched'] : [];
  });
  return { groups: [
    { name: 'Legacy baseline cases', rows: rowsEl },
    { name: 'Reference-list and regression cases', rows: realEl },
    { name: 'v1.2 step 1 cases', rows: stepEl },
    { name: 'Invariants', rows: invEl },
    { name: 'Single assessment gate', rows: window.runAssessmentTests(window.TfsAssessment) },
    { name: 'Self-check step', rows: window.runSelfCheckTests() }
  ] };
};
