/* Annotations on pasted text: the person's own message, with each flagged phrase marked,
   labeled in words, and explained by a numbered note from a fixed template.
   TFS.annotate(raw, result, store) builds a plain model; TFS.renderAnnotations(...) turns it
   into DOM nodes with textContent only, so pasted markup stays inert text.
   Labels never rely on color: each has words and a symbol. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  var KINDS = {
    strong: { rank: 3, label: 'Strong warning: don’t act on this', icon: '!' },
    check: { rank: 2, label: 'Needs an independent check', icon: '?' },
    list: { rank: 1, label: 'On our reviewed list', icon: '=' }
  };

  // Fixed note text per Tier 1 rule. Never generated.
  var TIER1_NOTES = {
    'T1-GIFT': 'This message asks for gift cards or gift card codes. Real businesses and government agencies don’t ask for payment this way.',
    'T1-WIRE': 'This message pressures you to send a wire transfer or cryptocurrency. That money is very hard to get back.',
    'T1-REMOTE': 'This message asks you to let someone control your device. Only let a helper you contacted yourself do that.',
    'T1-CODE': 'This message asks you to give a sign-in code, PIN or password to the sender. Real organizations never ask for these.',
    'T1-CALLBACK': 'This message raises a device, payment or account alarm and asks you to call. Check through a contact you already trust.',
    'T1-COMBO': 'This message combines an emergency, a money request and secrecy. Contact your family independently before sending money.',
    'T1-DOMAIN': 'This address is built to look like a known organization’s address, but it goes somewhere else.'
  };
  var UNRESOLVED_NOTES = {
    unclear_gift_payment_purpose: 'This asks you to buy gift cards, and it is not clear why. Check independently before buying anything.',
    competing_card_code_antecedent: 'This asks for card numbers or codes, and it is not clear which card it means. Don’t send any card numbers or codes.'
  };
  // Tier 2 flags that only repeat a Tier 1 request already marked at the same place.
  var COMPANION = { secret_emergency_money: 'T1-COMBO', gift_card_purchase: 'T1-GIFT', financial_callback: 'T1-CALLBACK', gift_card_payment: 'T1-GIFT', gift_card_disclosure: 'T1-GIFT', crypto_or_wire: 'T1-WIRE', remote_access: 'T1-REMOTE', share_code: 'T1-CODE', tech_support_call: 'T1-CALLBACK' };

  function valid(raw, s) {
    return s && Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end > s.start && s.end <= raw.length;
  }

  function contactKey(target) {
    if (!target) return null;
    return T.targetKey(target);
  }

  function annotate(source, result, store) {
    var raw = String(source == null ? '' : source).slice(0, T.MAX_CHARS);
    var items = [];
    function item(ruleId, kind, text, spans) {
      spans = spans.filter(function (s) { return valid(raw, s); });
      if (spans.length && text) items.push({ ruleId: ruleId, kind: kind, text: text, spans: spans });
    }
    var risk = result.requestRisk || { established: [], unresolved: [], flags: [] };

    // Tier 1 requests: the request itself and its context, linked to one note.
    risk.established.forEach(function (e) {
      var request = e.object && e.object.start >= e.action.start ? { start: e.action.start, end: e.object.end } : e.action;
      item(e.ruleId, 'strong', TIER1_NOTES[e.ruleId], [request, e.context, e.antecedent].filter(Boolean));
    });
    risk.unresolved.forEach(function (u) {
      var request = u.object && u.object.start >= u.action.start ? { start: u.action.start, end: u.object.end } : u.action;
      item('T1-GIFT', 'check', UNRESOLVED_NOTES[u.id] || 'This request has more than one possible meaning. Check independently before acting.', [request || u.clause]);
    });
    // Organization policies the message breaks.
    ((result.policy && result.policy.findings) || []).forEach(function (f) {
      item('T1-POLICY', f.status === 'established' ? 'strong' : 'check', T.copy.policyNote(f, store), [f.spans.action, f.spans.sender].filter(Boolean));
    });
    // Tier 2 wording signals, unless a Tier 1 note already marks the same request.
    risk.flags.forEach(function (f) {
      var covered = COMPANION[f.id] && risk.established.some(function (e) { return e.ruleId === COMPANION[f.id] && e.action.start === f.start; });
      if (covered) return;
      var flag = T.copy.FLAGS[f.id] || { label: 'A warning sign', advice: '' };
      item(f.id, 'check', flag.label + '. ' + flag.advice, [{ start: f.start, end: f.end }]);
    });
    // Contacts, with the check that was made on each. sourceTargets reads lookalike letters as
    // Latin (chаse.com as chase.com), but the check read the pasted characters (xn--chse-63d.com).
    // So each pasted span is read again the way the check read it, and matched by that reading.
    // Screenshot text is read with its line breaks treated as layout, the same way the check read it.
    var layout = { layout: result.inputSource === 'screenshot' };
    var found = T.sourceTargets(raw, layout).map(function (x) {
      var asChecked = T.extractTargets(T.normalizeText(x.quote, layout).text).targets[0];
      return { start: x.start, end: x.end, key: contactKey(asChecked && asChecked.kind === x.target.kind ? asChecked : x.target) };
    });
    var domainFindings = ((result.evidence && result.evidence.findings) || []).filter(function (f) { return f.ruleId === 'T1-DOMAIN'; });
    ((result.evidence && result.evidence.contacts) || []).forEach(function (c) {
      var key = contactKey(c.support.target);
      var spans = found.filter(function (x) { return x.key === key; });
      var check = result.checks[c.checkIndex];
      var domain = domainFindings.some(function (f) { return f.support === c.support || (f.support && f.support.code === c.support.code && contactKey(f.support.target) === key); });
      var kind = domain ? 'strong' : c.verification === 'verified' ? 'list' : 'check';
      var text = domain ? TIER1_NOTES['T1-DOMAIN'] + ' ' + check.detail : check.detail;
      item(domain ? 'T1-DOMAIN' : 'contact:' + check.code, kind, text, spans);
    });

    // Notes are numbered in reading order.
    items.sort(function (a, b) {
      return Math.min.apply(null, a.spans.map(function (s) { return s.start; })) - Math.min.apply(null, b.spans.map(function (s) { return s.start; }));
    });
    var notes = items.map(function (it, i) {
      return { n: i + 1, id: 'note-' + (i + 1), ruleId: it.ruleId, kind: it.kind, label: KINDS[it.kind].label, icon: KINDS[it.kind].icon, text: it.text };
    });

    // Overlapping spans merge into one highlight that carries every note number involved.
    var intervals = [];
    items.forEach(function (it, i) { it.spans.forEach(function (s) { intervals.push({ start: s.start, end: s.end, note: i }); }); });
    intervals.sort(function (a, b) { return a.start - b.start || b.end - a.end; });
    var highlights = [];
    intervals.forEach(function (iv) {
      var last = highlights[highlights.length - 1];
      // Touching spans of the same note join too, so one request reads as one mark.
      if (last && (iv.start < last.end || (iv.start === last.end && last.notes.indexOf(iv.note) >= 0))) {
        last.end = Math.max(last.end, iv.end);
        if (last.notes.indexOf(iv.note) < 0) last.notes.push(iv.note);
      } else {
        highlights.push({ start: iv.start, end: iv.end, notes: [iv.note] });
      }
    });
    highlights = highlights.map(function (h) {
      var ids = h.notes.sort(function (a, b) { return a - b; });
      var kind = ids.map(function (i) { return notes[i].kind; }).sort(function (a, b) { return KINDS[b].rank - KINDS[a].rank; })[0];
      return {
        start: h.start, end: h.end, text: raw.slice(h.start, h.end), kind: kind, label: KINDS[kind].label, icon: KINDS[kind].icon,
        notes: ids.map(function (i) { return notes[i].n; }), ruleIds: ids.map(function (i) { return notes[i].ruleId; })
      };
    });

    // Plain text between highlights, in order, so the whole message is shown exactly once.
    var segments = [], at = 0;
    highlights.forEach(function (h, i) {
      if (h.start > at) segments.push({ text: raw.slice(at, h.start), highlight: null });
      segments.push({ text: h.text, highlight: i });
      at = h.end;
    });
    if (at < raw.length) segments.push({ text: raw.slice(at), highlight: null });
    return { raw: raw, highlights: highlights, notes: notes, segments: segments };
  }

  /* DOM: text nodes and textContent only. doc is the document (a stand-in in tests). */
  function renderAnnotations(doc, model, messageEl, notesEl, idPrefix) {
    var prefix = idPrefix || 'annotation-';
    messageEl.replaceChildren();
    notesEl.replaceChildren();
    model.segments.forEach(function (seg) {
      if (seg.highlight === null) { messageEl.append(doc.createTextNode(seg.text)); return; }
      var h = model.highlights[seg.highlight];
      var mark = doc.createElement('mark');
      mark.className = 'ann ann-' + h.kind;
      mark.setAttribute('tabindex', '0');
      mark.setAttribute('aria-describedby', h.notes.map(function (n) { return prefix + 'note-' + n; }).join(' '));
      mark.setAttribute('data-rules', h.ruleIds.join(' '));
      mark.textContent = seg.text;
      var ref = doc.createElement('sup');
      ref.className = 'ann-ref';
      ref.setAttribute('aria-hidden', 'true');
      ref.textContent = h.icon + ' ' + h.notes.join(',');
      messageEl.append(mark, ref);
    });
    model.notes.forEach(function (note) {
      var li = doc.createElement('li');
      li.id = prefix + note.id;
      li.className = 'ann-note ann-' + note.kind;
      li.setAttribute('value', String(note.n));
      var label = doc.createElement('span');
      label.className = 'ann-label';
      label.textContent = note.icon + ' ' + note.label;
      var text = doc.createElement('span');
      text.className = 'ann-text';
      text.textContent = note.text;
      li.append(label, doc.createTextNode(' '), text);
      notesEl.append(li);
    });
  }

  T.annotate = annotate;
  T.renderAnnotations = renderAnnotations;
  T.ANNOTATION_KINDS = KINDS;
})(typeof window !== 'undefined' ? window : globalThis);
