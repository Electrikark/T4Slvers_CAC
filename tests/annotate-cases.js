/* Phase 2 E: annotations on pasted text. The model is checked directly, and the DOM output is
   checked through a small stand-in document so the same checks run in Node and the browser. */
window.TFS_PHASE2.add('Annotations on pasted text', function (t) {
  var T = window.TFS, engine = window.TfsEngine;

  // A stand-in document: just enough DOM for renderAnnotations, and nothing that parses HTML.
  function fakeDoc() {
    function node(tag) {
      var el = { tagName: tag, children: [], attributes: {}, className: '', id: '' };
      el.setAttribute = function (k, v) { el.attributes[k] = String(v); };
      el.append = function () { for (var i = 0; i < arguments.length; i++) el.children.push(arguments[i]); };
      el.replaceChildren = function () { el.children = []; el.append.apply(null, arguments); };
      Object.defineProperty(el, 'textContent', {
        get: function () { return el.children.map(function (c) { return c.nodeType === 3 ? c.data : c.textContent; }).join(''); },
        set: function (v) { el.children = [{ nodeType: 3, data: String(v) }]; }
      });
      return el;
    }
    return { createElement: node, createTextNode: function (text) { return { nodeType: 3, data: String(text) }; } };
  }
  function elements(el, out) {
    out = out || [];
    (el.children || []).forEach(function (c) { if (c.nodeType !== 3) { out.push(c); elements(c, out); } });
    return out;
  }
  function analyze(text, store, options) {
    var o = { declaredChannel: 'text' };
    for (var k in options || {}) o[k] = options[k];
    var r = engine.analyze(text, store || window.TFS_STORE, o);
    t.assert(engine.validateResult(r), 'invalid result for "' + text + '"');
    return r;
  }
  function model(text, store, options) { return T.annotate(text, analyze(text, store, options), store || window.TFS_STORE); }
  function render(m) {
    var doc = fakeDoc(), message = doc.createElement('p'), notes = doc.createElement('ol');
    T.renderAnnotations(doc, m, message, notes);
    return { message: message, notes: notes };
  }

  var SAMPLES = [
    'Chase: Buy gift cards to restore your account. Visit https://chase.com.',
    'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.',
    'Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.',
    'Please wire $800 to help me. Don’t tell Mom. Call 202-555-0123.',
    'C​hase: Buy g​ift cards to pay the fine. Visit https://chase.com.',
    'VIRUS DETECTED! Your computer has been locked. Do not restart. Call Windows Support at (888) 555-0199.',
    'Chase: Log in at https://chase.com to review a charge. https://chase.com',
    'Chase: sign in at https://chаse.com'
  ];

  t.test('E1 Every highlight\'s text equals raw.slice(start, end)', function () {
    SAMPLES.forEach(function (text) {
      var m = model(text);
      t.assert(m.highlights.length > 0, 'nothing marked in "' + text + '"');
      m.highlights.forEach(function (h) { t.same(h.text, text.slice(h.start, h.end), 'highlight in "' + text + '"'); });
      // The segments rebuild the message exactly once, in order.
      t.same(m.segments.map(function (s) { return s.text; }).join(''), text, 'segments rebuild the message');
    });
  });

  t.test('E2 Markup in a message displays literally', function () {
    ['<b>hi</b>', '<b>Buy gift cards</b> to pay the fine. <img src=x onerror=alert(1)> <script>alert(1)</script>'].forEach(function (text) {
      var m = model(text);
      var out = render(m);
      // The message itself: text nodes and marks, without the note-number references.
      var shown = out.message.children.filter(function (c) { return c.tagName !== 'sup'; })
        .map(function (c) { return c.nodeType === 3 ? c.data : c.textContent; }).join('');
      t.same(shown, text, 'shown text');
      var tags = elements(out.message).map(function (e) { return e.tagName; });
      t.assert(tags.every(function (tag) { return tag === 'mark' || tag === 'sup'; }), 'pasted markup became elements: ' + tags.join(','));
    });
    // "<b>hi</b>" has nothing to mark, so it is plain text with no element at all.
    t.same(elements(render(model('<b>hi</b>')).message).length, 0, 'no elements for plain text');
  });

  t.test('E3 Every highlight has a label and a rule ID, and so does every note', function () {
    SAMPLES.forEach(function (text) {
      var m = model(text);
      m.highlights.forEach(function (h) {
        t.assert(typeof h.label === 'string' && h.label.length > 0, 'highlight without label in "' + text + '"');
        t.assert(h.ruleIds.length > 0 && h.ruleIds.every(function (id) { return typeof id === 'string' && id; }), 'highlight without rule ID in "' + text + '"');
      });
      m.notes.forEach(function (n) { t.assert(n.label && n.ruleId && n.text, 'incomplete note in "' + text + '"'); });
      var out = render(m);
      elements(out.message).filter(function (e) { return e.tagName === 'mark'; }).forEach(function (mark) {
        t.assert(mark.attributes['data-rules'], 'rendered mark without rule IDs');
        t.same(mark.attributes.tabindex, '0', 'mark reachable with Tab');
        mark.attributes['aria-describedby'].split(' ').forEach(function (id) {
          t.assert(out.notes.children.some(function (li) { return li.id === id; }), 'mark points at a missing note ' + id);
        });
      });
      out.notes.children.forEach(function (li) { t.assert(/^[!?=] /.test(li.children[0].textContent), 'note label lacks its symbol'); });
    });
  });

  t.test('E4 A request and its context are marked together under one note', function () {
    var text = 'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.';
    var m = model(text);
    var gift = m.notes.filter(function (n) { return n.ruleId === 'T1-GIFT'; });
    t.same(gift.length, 1, 'one T1-GIFT note');
    var marked = m.highlights.filter(function (h) { return h.notes.indexOf(gift[0].n) >= 0; }).map(function (h) { return h.text; });
    t.assert(marked.indexOf('send me the codes') >= 0, 'request not marked: ' + JSON.stringify(marked));
    t.assert(marked.some(function (x) { return x.indexOf('gift cards') >= 0; }), 'antecedent not marked: ' + JSON.stringify(marked));
    t.same(gift[0].label, 'Strong warning: don’t act on this', 'label');
    var wire = model('Please wire $800 to help me. Don’t tell Mom.');
    var note = wire.notes.filter(function (n) { return n.ruleId === 'T1-WIRE'; })[0];
    var parts = wire.highlights.filter(function (h) { return h.notes.indexOf(note.n) >= 0; }).map(function (h) { return h.text; });
    t.assert(parts.indexOf('wire $800') >= 0 && parts.indexOf('Don’t tell Mom') >= 0, 'wire request and secrecy not linked: ' + JSON.stringify(parts));
  });

  t.test('E5 Overlapping spans render as one highlight listing both note numbers', function () {
    // The secrecy flag sits inside the T1-WIRE context span.
    var m = model('Please wire $800 to help me. Don’t tell Mom.');
    var both = m.highlights.filter(function (h) { return h.notes.length > 1; })[0];
    t.assert(both, 'no merged highlight: ' + JSON.stringify(m.highlights));
    t.same(both.kind, 'strong', 'the strongest label wins');
    m.highlights.forEach(function (a, i) {
      m.highlights.slice(i + 1).forEach(function (b) { t.assert(b.start >= a.end, 'highlights overlap'); });
    });
    var mark = elements(render(m).message).filter(function (e) { return e.tagName === 'mark' && e.attributes['aria-describedby'].split(' ').length > 1; });
    t.same(mark.length, 1, 'one rendered mark lists both notes');
  });

  t.test('E6 Every note comes from a finding or a checked contact', function () {
    SAMPLES.forEach(function (text) {
      var r = analyze(text), m = T.annotate(text, r, window.TFS_STORE);
      var findingIds = r.evidence.findings.map(function (f) { return f.ruleId; });
      m.notes.forEach(function (n) {
        var fromContact = n.ruleId.indexOf('contact:') === 0 && r.checks.some(function (c) { return 'contact:' + c.code === n.ruleId; });
        t.assert(findingIds.indexOf(n.ruleId) >= 0 || fromContact, 'note without evidence: ' + n.ruleId + ' in "' + text + '"');
      });
    });
    t.same(model('Hello, see you at lunch.').notes, [], 'a quiet message has no notes');
  });

  t.test('E7 Labels: Tier 1 is a strong warning, Tier 2 needs a check, a reviewed contact is on the list', function () {
    var lookalike = model('Chase: Your account has been locked. Sign in at chase-secure-login.net to restore access.');
    t.assert(lookalike.notes.some(function (n) { return n.ruleId === 'T1-DOMAIN' && n.kind === 'strong'; }), 'lookalike not a strong warning');
    t.assert(lookalike.notes.some(function (n) { return n.ruleId === 'account_locked' && n.label === 'Needs an independent check'; }), 'Tier 2 label');
    var match = model('Example Bank: Your statement is ready. Visit https://example.com.', window.TFS_GATE_STORE);
    t.same(match.notes.map(function (n) { return [n.ruleId, n.label]; }), [['contact:domain_official', 'On our reviewed list']], 'reviewed contact');
    var unreviewed = model('Chase: Your statement is ready. Visit https://chase.com.');
    t.same(unreviewed.notes.map(function (n) { return n.label; }), ['Needs an independent check'], 'an unreviewed record is never "on our reviewed list"');
    // Wording rule from copy.js: never call anything safe, verified or legitimate.
    SAMPLES.concat(['Example Bank: Visit https://example.com.']).forEach(function (text) {
      model(text, /Example Bank/.test(text) ? window.TFS_GATE_STORE : null).notes.forEach(function (n) {
        t.assert(!/\b(?:safe|verified|legitimate)\b/i.test(n.label + ' ' + n.text), 'forbidden word in note: ' + n.text);
      });
    });
  });

  t.test('E8 A repeated link is marked everywhere it appears', function () {
    var text = 'Chase: Log in at https://chase.com to review a charge. https://chase.com';
    var m = model(text);
    var links = m.highlights.filter(function (h) { return h.text === 'https://chase.com'; });
    t.same(links.length, 2, 'both copies marked');
  });

  t.test('E9 A broken policy marks the sender and the forbidden action under one note', function () {
    var policies = { version: 'annotate-fixture', records: [JSON.parse(JSON.stringify(window.TFS_POLICIES.records[0]))] };
    policies.records[0].status = 'reviewed';
    policies.records[0].reviewed_by = 'Test fixture reviewer A (fictional)';
    policies.records[0].second_reviewer = 'Test fixture reviewer B (fictional)';
    var text = 'USPS: Your package is held. Update your address at https://redelivery-help.top';
    var m = model(text, window.TFS_STORE, { policies: policies, today: '2026-10-12' });
    var note = m.notes.filter(function (n) { return n.ruleId === 'T1-POLICY'; })[0];
    t.assert(note, 'no policy note');
    t.same(note.text, 'USPS says its tracking texts and emails never contain a link. This one does.', 'template note');
    var marked = m.highlights.filter(function (h) { return h.notes.indexOf(note.n) >= 0; }).map(function (h) { return h.text; });
    t.assert(marked.indexOf('USPS') >= 0 && marked.indexOf('https://redelivery-help.top') >= 0, 'policy spans: ' + JSON.stringify(marked));
  });
});
