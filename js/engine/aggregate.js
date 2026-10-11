/* Stage 5: aggregate checks into one state, and the public entry point.
   window.TfsEngine = { analyze(text, store), validateResult(result), version } */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};
  var VERSION = '0.3.0';
  var STATES = { mismatch: 1, match: 1, unknown: 1 };
  var STATUSES = { SUPPORTS: 1, CONTRADICTS: 1, UNKNOWN: 1 };
  var LEVELS = { none: 1, elevated: 1, high: 1 };

  var CHANNELS = { text: 'Text', email: 'Email', unknown: 'Not sure' };
  var ASSESSMENTS = { mismatch: 'Suspicious', match: 'Details Match', unknown: 'Insufficient Evidence' };

  function aggregate(checks, claimOrg, signals) {
    if (signals.established.length) return { state: 'mismatch', strength: 'strong' };
    var contradicts = checks.filter(function (c) { return c.status === 'CONTRADICTS'; });
    if (contradicts.length) {
      var strong = contradicts.some(function (c) { return c.strength === 'strong'; });
      return { state: 'mismatch', strength: strong ? 'strong' : 'moderate' };
    }
    var targetsChecked = checks.filter(function (c) { return c.code !== 'nothing_to_check'; });
    var allSupport = targetsChecked.length > 0 && targetsChecked.every(function (c) { return c.status === 'SUPPORTS'; });
    if (allSupport && claimOrg && signals.level === 'none' && signals.flags.length === 0 && signals.unresolved.length === 0) return { state: 'match' };
    return { state: 'unknown' };
  }

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
    var riskTargets = T.extractTargets(bounded);
    if (riskTargets.incomplete && !checks.some(function (c) { return c.code === 'input_incomplete'; })) checks.push({ status: 'UNKNOWN', code: 'input_incomplete' });
    var signals = T.requestSignals(riskTargets.masked, bounded);
    if (signals.unresolved.length) checks.push({ status: 'UNKNOWN', code: 'risk_unresolved' });
    var agg = aggregate(checks, claim.org, signals);

    var result = {
      schemaVersion: 2,
      engineVersion: VERSION,
      storeVersion: store.version || null,
      state: agg.state,
      assessment: ASSESSMENTS[agg.state],
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
      decision: {
        matchBlockers: checks.filter(function (c) { return c.status !== 'SUPPORTS'; }).map(function (c) { return c.code; })
          .concat(claim.org ? [] : ['sender_unknown'], signals.flags.map(function (f) { return f.id; }), signals.unresolved.map(function (f) { return f.id; })),
        establishedRules: signals.established.map(function (r) { return r.ruleId; })
          .concat(checks.filter(function (c) { return c.status === 'CONTRADICTS'; }).map(function (c) { return 'legacy_contact:' + c.code; }))
      },
      offerPaste: false,
      truncated: norm.truncated,
      incomplete: norm.truncated || extracted.incomplete || riskTargets.incomplete
    };
    if (agg.strength) result.strength = agg.strength;
    var words = T.copy.describe(result, ctx);
    result.description = words.description;
    result.meaning = words.meaning;
    result.actionWarnings = T.copy.warnings(result, ctx);
    result.nextSteps = T.copy.nextSteps(result, ctx);
    return result;
  }

  function isText(v) { return typeof v === 'string' && v.length > 0; }
  function isTextList(v) { return Array.isArray(v) && v.every(isText); }

  // Validate the decision as well as the fields rendered by the view.
  function validateResult(r) {
    if (!r || typeof r !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(STATES, r.state)) return false;
    if (r.assessment !== ASSESSMENTS[r.state] || typeof r.declaredChannel !== 'string' || !Object.prototype.hasOwnProperty.call(CHANNELS, r.declaredChannel)) return false;
    if (!r.reputationLookup || r.reputationLookup.status !== 'not_performed') return false;
    if (r.state === 'mismatch' && r.strength !== 'strong' && r.strength !== 'moderate') return false;
    if (!isText(r.claimedIdentity) || !isText(r.description) || !isText(r.meaning)) return false;
    if (!isText(r.channel) || !isText(r.inspected) || typeof r.offerPaste !== 'boolean') return false;
    if (!Array.isArray(r.checks) || !r.checks.length) return false;
    for (var k = 0; k < r.checks.length; k++) {
      var c = r.checks[k];
      if (!c || !Object.prototype.hasOwnProperty.call(STATUSES, c.status) || !isText(c.code) || !isText(c.detail) || !isText(c.source)) return false;
    }
    if (!r.requestRisk || !Object.prototype.hasOwnProperty.call(LEVELS, r.requestRisk.level) || !Array.isArray(r.requestRisk.flags)) return false;
    if (!Array.isArray(r.requestRisk.established) || !Array.isArray(r.requestRisk.unresolved)) return false;
    if (r.requestRisk.established.length && r.state !== 'mismatch') return false;
    if (r.state === 'match' && (r.requestRisk.level !== 'none' || r.requestRisk.flags.length || r.requestRisk.unresolved.length || r.incomplete || r.claimSource !== 'explicit' || !r.checks.every(function (c) { return c.status === 'SUPPORTS'; }))) return false;
    if (!r.requestRisk.established.every(function (e) {
      return e && ['T1-GIFT', 'T1-WIRE', 'T1-REMOTE'].indexOf(e.ruleId) >= 0 && e.action && isText(e.action.quote) && e.clause && isText(e.clause.quote);
    })) return false;
    if (!r.requestRisk.flags.every(function (f) {
      return f && isText(f.id) && isText(f.label) && isText(f.words) && isText(f.explanation) && ['medium', 'high'].indexOf(f.level) >= 0;
    })) return false;
    if (!isTextList(r.actionWarnings) || !isTextList(r.nextSteps)) return false;
    if (!r.actionWarnings.length || !r.nextSteps.length) return false;
    return r.schemaVersion === 2;
  }

  root.TfsEngine = { analyze: analyze, validateResult: validateResult, version: VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
