window.TFS_PHASE2.add('Rule robustness', function (t) {
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


  [
    'AnyDesk is a useful application. Please share your phone number.',
    "Scammers say 'Open AnyDesk. Please share your session ID.'",
    "Scammers say 'Don't delay. Install AnyDesk. Share your session ID.'"
  ].forEach(function (text) { negative('T1-REMOTE', text); });
  [
    'It is an emergency. Please send the document about money. Keep this between us.',
    'I need to save money. It is an emergency. Keep this between us.',
    'Please send money. This is not an emergency. Keep this between us.'
  ].forEach(function (text) { negative('T1-COMBO', text); });
  positive('T1-REMOTE', 'AnyDesk is ready. Please share your session ID.');
  positive('T1-REMOTE', "Scammers say 'Never install AnyDesk.' Please install AnyDesk.");
  positive('T1-COMBO', 'Please send me money. It is an emergency. Keep this between us.');
  negative('T1-GIFT', 'Buy a gift card for her birthday. I will not reimburse you.');
  t.test('Draft contact-only records do not crash unrelated legacy checks', function () {
    var s = { orgs: [{ id: 'acme', displayName: 'Acme', aliases: ['acme'], contacts: [
      { kind: 'domain', value: 'acme.example', status: 'draft', scope: { type: 'registrable' } }
    ] }] };
    var r = analyze('Our article mentions https://acme-other.example.', s);
    t.same(r.assessment, 'insufficient_evidence', 'domain mention');
    r = analyze('https://acme.example@evil.example', s);
    t.assert(has(r, 'T1-DOMAIN'), 'userinfo trick');
  });

});
