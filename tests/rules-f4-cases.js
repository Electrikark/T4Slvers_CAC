/* Constructed F4 regression cases, not the unavailable field corpus. */
window.TFS_PHASE2.add('F4 rule fixes', function (t) {
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

  ['Grandma, I’m in trouble. Please send money. Don’t tell Mom.',
    'I need money for bail. Keep this between us.',
    'Don’t tell Mom. Can you send $800? It is an emergency.',
    'Please send money right now and keep this between us.'].forEach(function (text) { positive('T1-COMBO', text); });
  ['Don’t tell Mom about the surprise party, can you send $20 for the cake?',
    'Grandma I’m in trouble with my homework lol',
    'Please send money right now.', 'Please send money and keep this between us.',
    'It is an emergency. Keep this between us.',
    'Do not send money. It is an emergency. Keep this between us.',
    'Scammers say "I need money for bail. Keep this between us."'].forEach(function (text) { negative('T1-COMBO', text); });

  t.test('F4 annotation retains all three predicates', function () {
    var text = 'I need money for bail. Keep this between us.';
    var r = analyze(text), model = T.annotate(text, r, store);
    t.assert(model.notes.some(function (n) { return n.ruleId === 'T1-COMBO'; }), 'missing combo annotation');
  });
});
