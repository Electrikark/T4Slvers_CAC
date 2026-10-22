/* Constructed F3 regression cases, not the unavailable field corpus. */
window.TFS_PHASE2.add('F3 rule fixes', function (t) {
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

  ['Buy Apple gift cards. I will reimburse you.',
    'Can you get Google Play cards? I will pay you back.',
    'Pick up Amazon gift cards and put it on my tab.',
    'Please cover Home Depot gift cards for our project.',
    'Buy Target gift cards for the team.',
    'Get Steam cards for clients.',
    'I am in a meeting. Could you buy some gift cards?',
    'I can’t talk. Please get some gift cards.',
    'I can’t leave. Please pick up some gift cards.',
    'I need you to buy some gift cards for our project.'].forEach(function (text) { positive('T1-GIFT', text); });
  ['Happy birthday! I got you an Amazon gift card', 'Pay your Apple Card bill', 'Pay your Amazon Card bill', 'Pay your Target Card bill',
    'Buy a gift card for her birthday', 'Can you get some more gift cards?',
    'Scammers may ask you to buy gift cards for the team.',
    'Do not buy gift cards for the team.',
    'Buy gift cards. Scammers may ask you to reimburse them.'].forEach(function (text) { negative('T1-GIFT', text); });


});
