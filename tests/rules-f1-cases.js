/* Constructed F1 regression cases, not the unavailable field corpus. */
window.TFS_PHASE2.add('F1 rule fixes', function (t) {
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

  ['AnyDesk', 'TeamViewer', 'QuickSupport', 'LogMeIn', 'ScreenConnect', 'RustDesk', 'UltraViewer'].forEach(function (tool) {
    positive('T1-REMOTE', 'Please install ' + tool + '.');
    negative('T1-REMOTE', 'We will never ask you to install ' + tool + '.');
    negative('T1-REMOTE', 'Scammers may ask you to install ' + tool + '.');
  });
  ['Open TeamViewer.', 'Add QuickSupport.', 'Approve the RustDesk connection.',
    'Accept the ScreenConnect session.', 'Open RustDesk and accept the request.', 'Share your AnyDesk session ID.',
    'TeamViewer is ready. Please share the connection number.',
    'In AnyDesk, approve the connection.', 'Keep this between us. Install AnyDesk.',
    'Please open ＡｎｙＤｅｓｋ.'].forEach(function (text) { positive('T1-REMOTE', text); });
  ['Wells Fargo will never ask you to download this type of software',
    'Do not open RustDesk.', 'Our support team may use TeamViewer.',
    'Scammers say "Install AnyDesk. Share your session ID."',
    'AnyDesk is useful. Please open your banking app.'].forEach(function (text) { negative('T1-REMOTE', text); });


  ['Open an article about AnyDesk.', 'Please share a guide about TeamViewer.'].forEach(function (text) { negative('T1-REMOTE', text); });

});
