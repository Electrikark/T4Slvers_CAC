/* Stage 5: normalize evidence, call the sole gate, and expose the public entry point.
   window.TfsEngine = { analyze(text, store), validateResult(result), version } */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};
  var VERSION = '0.4.0';
  var gate = root.TfsAssessment;
  var STATUSES = { SUPPORTS: 1, CONTRADICTS: 1, UNKNOWN: 1 };
  var LEVELS = { none: 1, elevated: 1, high: 1 };

  var CHANNELS = { text: 'Text', email: 'Email', unknown: 'Not sure' };
  function analyze(input, store, options) {
    if (!store || !store.orgs) throw new Error('analyze(text, store) needs a reference store');
    if (!options || typeof options.declaredChannel !== 'string' || !Object.prototype.hasOwnProperty.call(CHANNELS, options.declaredChannel)) throw new Error('Choose Text, Email, or Not sure before analysis');
    var norm = T.normalizeText(input);
    var extracted = T.extractTargets(norm.text);
    var claim = T.findClaim(extracted.masked, store);
    var ctx = { store: store, claimOrg: claim.org, implicitOrg: null };

    var checks = extracted.targets.map(function (target) {
      return target.kind === 'phone' ? T.checkPhone(target, ctx) : T.checkHost(target, ctx);
    });
    if (!checks.length) checks.push({ status: 'UNKNOWN', code: 'nothing_to_check' });
    if (norm.truncated || extracted.incomplete) checks.push({ status: 'UNKNOWN', code: 'input_incomplete' });

    // Implicit claim: no named sender, but a link or number points to a known organization.
    if (!claim.org) {
      var pointers = checks.filter(function (c) { return c.orgId && (c.status === 'SUPPORTS' || c.status === 'CONTRADICTS'); });
      var pointer = pointers[0];
      if (pointer && pointers.every(function (c) { return c.orgId === pointer.orgId; })) ctx.implicitOrg = T.orgById(store, pointer.orgId);
    }

    // Risk evidence uses the supplied source, before legacy contact normalization.
    var raw = input == null ? '' : String(input);
    var bounded = raw.slice(0, T.MAX_CHARS);
    // Curly apostrophes, invisible characters and fullwidth letters must not hide a request.
    var signals = T.sourceSignals(bounded);
    if (signals.incomplete && !checks.some(function (c) { return c.code === 'input_incomplete'; })) checks.push({ status: 'UNKNOWN', code: 'input_incomplete' });
    if (signals.unresolved.length) checks.push({ status: 'UNKNOWN', code: 'risk_unresolved' });
    var incomplete = norm.truncated || extracted.incomplete || signals.incomplete;
    var evidence = T.normalizeEvidence(checks, {
      explicit: Boolean(claim.org), recognizedOrg: claim.org ? claim.org.id : null
    }, Boolean(ctx.implicitOrg), signals, incomplete);
    var assessed = gate.assess(evidence);
    gate.assertAssessment(assessed.assessment);

    var result = {
      schemaVersion: 3,
      engineVersion: VERSION,
      storeVersion: store.version || null,
      assessment: assessed.assessment,
      trace: assessed.trace,
      evidence: evidence,
      declaredChannel: options.declaredChannel,
      reputationLookup: { status: 'not_performed' },
      claimedIdentity: claim.org ? claim.org.displayName
        : ctx.implicitOrg ? 'Not stated (an address refers to ' + ctx.implicitOrg.displayName + ')'
        : claim.generic || 'Not stated',
      claimSource: claim.org ? 'explicit' : ctx.implicitOrg ? 'implicit' : 'none',
      otherMentions: claim.otherMentions,
      channel: CHANNELS[options.declaredChannel] + ' · ' + T.copy.channel(extracted.targets),
      inspected: extracted.targets.length
        ? extracted.targets.map(T.copy.shown).join(' · ')
        : 'No links, email addresses or phone numbers found',
      checks: checks.map(function (c) {
        var out = { status: c.status, code: c.code, detail: T.copy.checkDetail(c, ctx), source: T.copy.checkSource(c, ctx) };
        if (c.strength) out.strength = c.strength;
        if (c.target) out.target = T.copy.shown(c.target);
        return out;
      }),
      requestRisk: {
        level: signals.level,
        flags: signals.flags.map(function (f) {
          return { id: f.id, level: f.level, label: T.copy.FLAG_LABELS[f.id], words: f.words, start: f.start, end: f.end, explanation: T.copy.FLAG_WARNINGS[f.id] };
        }),
        established: signals.established,
        unresolved: signals.unresolved,
        rulesVersion: 'english-context-1'
      },
      offerPaste: false,
      truncated: norm.truncated,
      incomplete: incomplete
    };
    var words = T.copy.describe(result, ctx);
    result.description = words.description;
    result.meaning = words.meaning;
    result.actionWarnings = T.copy.warnings(result, ctx);
    result.nextSteps = T.copy.nextSteps(result, ctx);
    return result;
  }

  function isText(v) { return typeof v === 'string' && v.length > 0; }
  function isTextList(v) { return Array.isArray(v) && v.every(isText); }

  // Re-run the same gate for wiring integrity, not a second policy implementation.
  function validateResult(r) {
    if (!r || typeof r !== 'object') return false;
    try { gate.assertAssessment(r.assessment); } catch (err) { return false; }
    if ('state' in r || 'decision' in r) return false;
    if (typeof r.declaredChannel !== 'string' || !Object.prototype.hasOwnProperty.call(CHANNELS, r.declaredChannel)) return false;
    if (!r.reputationLookup || r.reputationLookup.status !== 'not_performed') return false;
    if (!isText(r.claimedIdentity) || !isText(r.description) || !isText(r.meaning)) return false;
    if (!isText(r.channel) || !isText(r.inspected) || typeof r.offerPaste !== 'boolean') return false;
    if (!Array.isArray(r.checks) || !r.checks.length) return false;
    for (var k = 0; k < r.checks.length; k++) {
      var c = r.checks[k];
      if (!c || !Object.prototype.hasOwnProperty.call(STATUSES, c.status) || !isText(c.code) || !isText(c.detail) || !isText(c.source)) return false;
    }
    if (!r.requestRisk || !Object.prototype.hasOwnProperty.call(LEVELS, r.requestRisk.level) || !Array.isArray(r.requestRisk.flags)) return false;
    if (!Array.isArray(r.requestRisk.established) || !Array.isArray(r.requestRisk.unresolved)) return false;
    if (!r.requestRisk.established.every(function (e) {
      return e && e.ruleId !== 'T1-DOMAIN' && gate.TIER1_RULES.indexOf(e.ruleId) >= 0 && e.action && isText(e.action.quote) && e.clause && isText(e.clause.quote);
    })) return false;
    if (!r.requestRisk.flags.every(function (f) {
      return f && isText(f.id) && isText(f.label) && isText(f.words) && isText(f.explanation) && ['medium', 'high'].indexOf(f.level) >= 0;
    })) return false;
    if (!isTextList(r.actionWarnings) || !isTextList(r.nextSteps)) return false;
    if (!r.actionWarnings.length || !r.nextSteps.length) return false;
    if (r.schemaVersion !== 3 || typeof r.incomplete !== 'boolean' || typeof r.truncated !== 'boolean' || (r.truncated && !r.incomplete)) return false;
    try { return validateEvidence(r); } catch (err) { return false; }
  }

  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function validSpan(s) {
    return s === null || (s && Number.isInteger(s.start) && Number.isInteger(s.end) &&
      s.start >= 0 && s.end > s.start && s.end <= T.MAX_CHARS &&
      isText(s.quote) && s.quote.length === s.end - s.start);
  }

  function validateEvidence(r) {
    var e = r.evidence;
    if (!e || !e.sender || typeof e.sender.explicit !== 'boolean' ||
        !(e.sender.recognizedOrg === null || isText(e.sender.recognizedOrg)) ||
        !Array.isArray(e.contacts) || !Array.isArray(e.findings) || !isTextList(e.uncertainty)) return false;
    if (['explicit', 'implicit', 'none'].indexOf(r.claimSource) < 0 ||
        e.sender.explicit !== (r.claimSource === 'explicit') ||
        (e.sender.explicit ? !e.sender.recognizedOrg : e.sender.recognizedOrg !== null)) return false;
    if (!e.findings.every(function (f) {
      return f && isText(f.ruleId) && [1, 2].indexOf(f.tier) >= 0 &&
        ['established', 'unresolved'].indexOf(f.status) >= 0 && validSpan(f.span);
    })) return false;
    var rawChecks = r.checks.map(function (c) { return { status: c.status, code: c.code }; });
    var seen = new Set();
    for (var i = 0; i < e.contacts.length; i++) {
      var contact = e.contacts[i];
      if (!contact || !Number.isInteger(contact.checkIndex) || seen.has(contact.checkIndex)) return false;
      var original = contact.support, rendered = r.checks[contact.checkIndex];
      if (!original || !original.target || !rendered || original.code !== rendered.code ||
          original.status !== rendered.status || T.copy.shown(original.target) !== rendered.target ||
          original.strength !== rendered.strength) return false;
      rawChecks[contact.checkIndex] = original;
      seen.add(contact.checkIndex);
    }
    if (r.checks.some(function (c, index) { return Boolean(c.target) !== seen.has(index); })) return false;
    if (r.incomplete !== r.checks.some(function (c) { return c.code === 'input_incomplete'; })) return false;
    // Rebuild the adapter output to ensure displayed checks and risk retain their evidence.
    var rebuilt = T.normalizeEvidence(rawChecks, e.sender, r.claimSource === 'implicit', r.requestRisk, r.incomplete);
    if (!equal(e, rebuilt)) return false;
    // Severity decorates advice only; enforce its shape without deriving an assessment from it.
    var flags = r.requestRisk.flags;
    if ((r.requestRisk.level === 'none') !== (flags.length === 0)) return false;
    if (!r.trace || !isTextList(r.trace.rules) || !isTextList(r.trace.blockedBy)) return false;
    var expected = gate.assess(e);
    return expected.assessment === r.assessment && equal(expected.trace, r.trace);
  }

  root.TfsEngine = { analyze: analyze, validateResult: validateResult, version: VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
