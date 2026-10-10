window.runEngineTests = function () {
  var RANK = { none: 0, elevated: 1, high: 2 };
  var store = window.TFS_FIXTURE_STORE;
  var engine = window.TfsEngine;
  var rowsEl = [], invEl = [], realEl = [];
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
    if (result.state !== expect.state) problems.push('state is ' + result.state + ', expected ' + expect.state);
    if (expect.strength && result.strength !== expect.strength) problems.push('strength is ' + result.strength + ', expected ' + expect.strength);
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
    return problems;
  }

  function run(text) {
    return engine.analyze(text, store);
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
      try { var r = engine.analyze(c.text, window.TFS_STORE); realResults.push(r); problems = judge(r, c.expect); }
      catch (err) { problems = ['threw: ' + (err && err.message ? err.message : err)]; }
      var ok = problems.length === 0;
      if (ok) realPassed += 1;
      addRow(realEl, [c.id, ok ? 'PASS' : 'FAIL', c.text, ok ? c.guards : problems.join('; ')], ok);
    });
  }

  var fixtureResults = results;
  results = results.concat(realResults);
  var caseIds = window.TFS_CASES.concat(window.TFS_REAL_CASES).map(function (c) { return c.id; });
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
      if (r && r.state === 'match') {
        var checks = r.checks || [];
        var allSupport = checks.length > 0 && checks.every(function (k) { return k.status === 'SUPPORTS'; });
        if (!allSupport || !r.claimedIdentity || r.claimedIdentity === 'Not stated') bad.push(caseIds[i]);
      }
    });
    return bad.length ? ['match without full support in ' + bad.join(', ')] : [];
  });
  invariant('2 Contradiction wins', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && (r.checks || []).some(function (k) { return k.status === 'CONTRADICTS'; }) && r.state !== 'mismatch') bad.push(caseIds[i]);
    });
    return bad.length ? ['contradiction ignored in ' + bad.join(', ')] : [];
  });
  invariant('3 No targets, no verdict', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      var codes = r ? codesOf(r) : [];
      if (r && codes.indexOf('nothing_to_check') >= 0 && r.state !== 'unknown') bad.push(caseIds[i]);
    });
    return bad.length ? ['verdict without targets in ' + bad.join(', ')] : [];
  });
  invariant('4 No reassurance words', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && /\b(safe|verified|legitimate)\b/i.test(JSON.stringify(r))) bad.push(caseIds[i]);
    });
    return bad.length ? ['reassurance word in ' + bad.join(', ')] : [];
  });
  invariant('5 Match never hides a request', function () {
    if (results.some(function (r) { return !r; })) return ['engine returned no result for some cases'];
    var bad = [];
    results.forEach(function (r, i) {
      if (r && r.state === 'match' && r.requestRisk && r.requestRisk.level !== 'none' && !(r.actionWarnings && r.actionWarnings.length)) bad.push(caseIds[i]);
    });
    return bad.length ? ['match with request signals but no warning in ' + bad.join(', ')] : [];
  });
  invariant('6 Never throws on odd input', function () {
    var odd = ['', '   ', 'x'.repeat(100000), '\u{1F600}\u{1F600}\u{1F600}', 'שלום مرحبا', 'a\u0000b', 'lone \uD800 surrogate'];
    var bad = [];
    odd.forEach(function (t, i) {
      var r = run(t);
      if (!r || typeof r !== 'object' || !r.state) bad.push('input ' + i);
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
    var a = performance.now(); run(t5); var d1 = performance.now() - a;
    if (d1 > 50) problems.push('5,000 characters took ' + Math.round(d1) + ' ms');
    var hostile = '.a'.repeat(50000);
    var b = performance.now(); run(hostile); var d2 = performance.now() - b;
    if (d2 > 1000) problems.push('hostile 100,000 characters took ' + Math.round(d2) + ' ms');
    return problems;
  });

  invariant('10 Malformed results fail closed', function () {
    var good = fixtureResults[0];
    var bad = [null, {}, Object.assign({}, good, { state: 'constructor' }),
      Object.assign({}, good, { checks: [null] }),
      Object.assign({}, good, { channel: undefined }),
      Object.assign({}, good, { nextSteps: [] }),
      Object.assign({}, good, { requestRisk: { level: 'high', flags: [null] } })];
    return bad.some(function (r) { return engine.validateResult(r); }) ? ['accepted a malformed result'] : [];
  });
  invariant('11 Image results have a valid shape', function () {
    return engine.validateResult(window.screenshotResult) && engine.validateResult(window.demoScenarios.screenshot.result) ? [] : ['invalid image result'];
  });
  invariant('12 A selected image invents no sender', function () {
    return /Chase|chase\.com/.test(JSON.stringify(window.screenshotResult)) ? ['sample identity leaked into a file result'] : [];
  });
  invariant('13 Partial input cannot match', function () {
    return results.some(function (r) { return r.incomplete && r.state === 'match'; }) ? ['partial input matched'] : [];
  });
  return { groups: [
    { name: 'Spec cases', rows: rowsEl },
    { name: 'Reference-list and regression cases', rows: realEl },
    { name: 'Invariants', rows: invEl }
  ] };
};
