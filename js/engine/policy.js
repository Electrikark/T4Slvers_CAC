/* T1-POLICY: check reviewed organization policies against the attributed sender, the declared
   channel and the detected actions. A policy fires only when every prerequisite is present;
   each skip is recorded with its reason so the trace explains why a policy stayed quiet.
   Exposes TFS.buildPolicyView(policyStore, today), TFS.evaluatePolicies(input) and
   TFS.POLICY_ACTIONS. */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};

  // The fixed action list. A record naming anything else is excluded.
  var ACTIONS = {
    link_present: 1, request_code_disclosure: 1, request_personal_data: 1, request_payment_gift_card: 1,
    request_payment_wire_crypto: 1, request_remote_access: 1, threaten_arrest_or_penalty: 1,
    any_contact_on_channel: 1
  };
  var POLICY_CHANNELS = { sms: 1, email: 1 };
  var DECLARED = { text: 'sms', email: 'email' };
  var REQUIRED = ['id', 'orgId', 'quote', 'source_url', 'checked_on', 'review_due', 'reviewed_by', 'second_reviewer'];

  function today() { return new Date().toISOString().slice(0, 10); }
  function calendarDate(value) {
    var m = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return false;
    var day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return day.getUTCFullYear() === +m[1] && day.getUTCMonth() === +m[2] - 1 && day.getUTCDate() === +m[3];
  }
  function blank(v) { return v == null || (typeof v === 'string' && !v.trim()); }

  function ineligibleReason(p, day) {
    if (!p || p.status !== 'reviewed') return 'not_reviewed';
    for (var k = 0; k < REQUIRED.length; k++) if (blank(p[REQUIRED[k]])) return 'missing:' + REQUIRED[k];
    // Two people, neither of them the same person twice.
    if (String(p.reviewed_by).trim().toLowerCase() === String(p.second_reviewer).trim().toLowerCase()) return 'same_reviewer_twice';
    if (!Object.prototype.hasOwnProperty.call(ACTIONS, p.forbidden_action)) return 'unsupported_action';
    if (!Array.isArray(p.channels) || !p.channels.length || !p.channels.every(function (c) { return POLICY_CHANNELS[c]; })) return 'invalid_channels';
    if (!calendarDate(p.checked_on) || p.checked_on > day) return 'invalid_checked_date';
    if (!calendarDate(p.review_due)) return 'invalid_review_due';
    if (p.review_due < day) return 'expired';
    if (!Array.isArray(p.predicates || []) || !(p.predicates || []).every(function (q) { return q && typeof q.name === 'string' && !blank(q.name) && typeof q.mandatory === 'boolean' && typeof q.value === 'boolean'; })) return 'invalid_predicates';
    if (!Array.isArray(p.exceptions || []) || !(p.exceptions || []).every(function (x) {
      return x && !blank(x.quote) && x.answer && typeof x.answer.name === 'string' && !blank(x.answer.name) && typeof x.answer.value === 'boolean';
    })) return 'invalid_exceptions';
    return null;
  }

  function buildPolicyView(policyStore, day) {
    day = day || today();
    var trusted = [], excluded = [];
    ((policyStore && policyStore.records) || []).forEach(function (p) {
      var reason = ineligibleReason(p, day);
      if (reason) excluded.push({ id: p && p.id, reason: reason });
      else trusted.push(Object.freeze(p));
    });
    return Object.freeze({ version: (policyStore && policyStore.version) || null, day: day, trusted: Object.freeze(trusted), excluded: Object.freeze(excluded) });
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Whole words, ASCII case folding only; "package" also matches "packages".
  function hasCue(text, cue) {
    var body = escapeRe(String(cue).trim()).replace(/\s+/g, '\\s+');
    return new RegExp('(?<![A-Za-z0-9])' + body + '(?:s|es)?(?![A-Za-z0-9])', 'i').test(text);
  }

  function span(raw, s) {
    return s && Number.isInteger(s.start) ? { start: s.start, end: s.end, quote: raw.slice(s.start, s.end) } : null;
  }

  // Detector output for one action ID: { status, span } or null when nothing was detected.
  function detect(action, input) {
    var raw = input.raw, signals = input.signals;
    function established(ruleIds) {
      var hit = signals.established.filter(function (e) { return ruleIds.indexOf(e.ruleId) >= 0; })[0];
      return hit ? { status: 'established', span: span(raw, hit.action && hit.object && hit.object.end > hit.action.start ? { start: hit.action.start, end: hit.object.end } : hit.clause) } : null;
    }
    function flagged(ids) {
      var hit = signals.flags.filter(function (f) { return ids.indexOf(f.id) >= 0; })[0];
      return hit ? { status: 'established', span: span(raw, hit) } : null;
    }
    function unresolved(ids) {
      var hit = signals.unresolved.filter(function (u) { return ids.indexOf(u.id) >= 0; })[0];
      return hit ? { status: 'unresolved', span: span(raw, hit.action || hit.clause) } : null;
    }
    switch (action) {
      case 'link_present':
        var link = input.contacts.filter(function (c) { return c.target.kind === 'link'; })[0];
        return link ? { status: 'established', span: span(raw, link) } : null;
      case 'request_code_disclosure':
        return established(['T1-CODE']) || flagged(['share_code']);
      case 'request_personal_data':
        return flagged(['credential_request']);
      case 'request_payment_gift_card':
        var gift = established(['T1-GIFT']) || flagged(['gift_card_disclosure']) ||
          unresolved(['unclear_gift_payment_purpose', 'competing_card_code_antecedent']);
        if (gift) return gift;
        // A purchase-only Tier 2 warning does not prove a forbidden payment.
        var purchase = flagged(['gift_card_payment']);
        return purchase ? { status: 'unresolved', span: purchase.span } : null;
      case 'request_payment_wire_crypto':
        return established(['T1-WIRE']) || flagged(['crypto_or_wire']);
      case 'request_remote_access':
        return established(['T1-REMOTE']) || flagged(['remote_access']);
      case 'threaten_arrest_or_penalty':
        return flagged(['arrest_threat']);
      case 'any_contact_on_channel':
        return { status: 'established', span: input.attribution.span };
      default:
        return undefined; // No detector for this action yet.
    }
  }

  /* input: { raw, declaredChannel, attribution, signals, contacts, view, answers }
     contacts are TFS.sourceTargets(raw); attribution is TFS.attributeSender output with a raw span. */
  function evaluatePolicies(input) {
    var findings = [], trace = [], uncertainty = [];
    var view = input.view;
    if (!view) return { version: null, findings: findings, trace: trace, uncertainty: uncertainty };
    var answers = input.answers || {};
    var attribution = input.attribution || { orgId: null };
    view.trusted.forEach(function (p) {
      function skip(reason) { trace.push({ policyId: p.id, outcome: 'skipped', reason: reason }); }
      function unknown(reason) {
        uncertainty.push('policy_check_incomplete:' + p.id + ':' + reason);
        skip(reason);
      }
      function answered(name) { return Object.prototype.hasOwnProperty.call(answers, name) && typeof answers[name] === 'boolean'; }
      if (!attribution.orgId) return skip('no_sender:' + (attribution.reason || 'no_claim'));
      if (attribution.orgId !== p.orgId) return skip('sender_mismatch');
      var channel = DECLARED[input.declaredChannel];
      if (channel && p.channels.indexOf(channel) < 0) return skip('channel_out_of_scope');
      if ((p.service_cues || []).length && !p.service_cues.some(function (cue) { return hasCue(input.raw, cue); })) return skip('service_out_of_scope');
      // A policy with no detected action needs no further user context.
      var hit = detect(p.forbidden_action, input);
      if (hit === undefined) return unknown('no_detector:' + p.forbidden_action);
      if (!hit) return skip('action_not_found');
      if (!channel) return unknown('channel_unknown');
      var predicates = p.predicates || [];
      for (var i = 0; i < predicates.length; i++) {
        var q = predicates[i];
        if (!q.mandatory) continue;
        if (!answered(q.name)) return unknown('predicate_unknown:' + q.name);
        if (answers[q.name] !== q.value) return skip('predicate_not_met:' + q.name);
      }
      var exceptions = p.exceptions || [];
      for (var x = 0; x < exceptions.length; x++) {
        var answer = exceptions[x].answer;
        if (!answered(answer.name)) return unknown('exception_unknown:' + answer.name);
        if (answers[answer.name] === answer.value) return skip('exception:' + x);
      }
      findings.push({
        ruleId: 'T1-POLICY', policyId: p.id, orgId: p.orgId, tier: 1, status: hit.status,
        action: p.forbidden_action, serviceLabel: p.service_label || null,
        quote: p.quote, sourceUrl: p.source_url,
        spans: { sender: attribution.span || null, action: hit.span || null }
      });
      trace.push({ policyId: p.id, outcome: hit.status === 'established' ? 'fired' : 'unresolved', reason: p.forbidden_action });
    });
    return { version: view.version, findings: findings, trace: trace, uncertainty: uncertainty };
  }

  T.buildPolicyView = buildPolicyView;
  T.evaluatePolicies = evaluatePolicies;
  T.POLICY_ACTIONS = Object.keys(ACTIONS);
})(typeof window !== 'undefined' ? window : globalThis);
