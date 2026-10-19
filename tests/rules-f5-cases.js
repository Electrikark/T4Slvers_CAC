/* Constructed F5 regression cases, not the unavailable field corpus. */
window.TFS_PHASE2.add('F5 rule fixes', function (t) {
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

  ['Please verify at https://hsbc-check.example.',
    'HSBC: Confirm at https://hsbc.example.',
    'Please reschedule at https://royal-mail.example.',
    'Click https://royalmail.example.',
    'Please pay at https://e-zpass.example.',
    'Confirm at https://ezpass.example.',
    'Please click https://chase.example/notice.',
    'Verify at https://apple.customer.example.',
    'Click https://usps.delivery.example.co.uk.', 'Click https://chase.amazon.com.'].forEach(function (text) { positive('T1-DOMAIN', text); });
  ['Please verify at https://secure.chase.com.', 'Click usps.com/track',
    'Please pay at https://pineapple-farm.com.',
    'Click https://example.net/chase.', 'Click https://example.net/?brand=chase.',
    'Do not click https://hsbc.example.',
    'Scammers may ask you to click https://hsbc.example.',
    'Our article mentions https://hsbc.example.',
    'Click https://chase.com.', 'Click https://royalmail.com.',
    'Click https://www.hsbc.co.uk.'].forEach(function (text) { negative('T1-DOMAIN', text); });
  t.test('F5 domain-only Draft contacts work without legacy fields', function () {
    var s = { orgs: [{ id: 'acme', displayName: 'Acme', aliases: ['acme'], contacts: [
      { kind: 'domain', value: 'acme.example', status: 'draft', scope: { type: 'registrable' } }
    ] }] };
    t.assert(has(analyze('Click https://acme-other.example.', s), 'T1-DOMAIN'), 'draft contact not used');
    t.same(analyze('Acme: Click https://acme.example.', s).assessment, 'insufficient_evidence', 'draft supported a contact');
  });
  t.test('F5 added brand records remain Draft and cannot authenticate', function () {
    ['hsbc', 'royalmail', 'ezpass'].forEach(function (id) {
      var org = store.orgs.filter(function (o) { return o.id === id; })[0];
      t.assert(org && org.contacts.every(function (c) { return c.status === 'draft' && c.kind === 'domain'; }), 'missing domain-only draft');
      t.same(T.buildTrustedView({ orgs: [org] }, '2026-10-18').trusted.length, 0, 'draft became trusted');
    });
  });

});
