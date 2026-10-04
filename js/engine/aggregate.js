/* Stage 5: aggregate checks into one state, and the public entry point.
   window.TfsEngine = { analyze(text, store), validateResult(result), version } */
(function (root) {
  'use strict';
  var T = root.TFS = root.TFS || {};
  var VERSION = '0.1.0';
  var STATES = { mismatch: 1, match: 1, unknown: 1 };
  var STATUSES = { SUPPORTS: 1, CONTRADICTS: 1, UNKNOWN: 1 };
  var LEVELS = { none: 1, elevated: 1, high: 1 };

  function aggregate(checks, claimOrg) {
    var contradicts = checks.filter(function (c) { return c.status === 'CONTRADICTS'; });
    if (contradicts.length) {
      var strong = contradicts.some(function (c) { return c.strength === 'strong'; });
      return { state: 'mismatch', strength: strong ? 'strong' : 'moderate' };
    }
    var targetsChecked = checks.filter(function (c) { return c.code !== 'nothing_to_check'; });
    var allSupport = targetsChecked.length > 0 && targetsChecked.every(function (c) { return c.status === 'SUPPORTS'; });
    if (allSupport) {
      if (claimOrg) return { state: 'match' };
      // No named sender: a match only when every check points to the same organization.
      var ids = {};
      targetsChecked.forEach(function (c) { ids[c.orgId] = 1; });
      if (Object.keys(ids).length === 1) return { state: 'match' };
    }
    return { state: 'unknown' };
  }

  function analyze(input, store) {
    if (!store || !store.orgs) throw new Error('analyze(text, store) needs a reference store');
    var norm = T.normalizeText(input);
    var extracted = T.extractTargets(norm.text);
    var claim = T.findClaim(extracted.masked, store);
    var ctx = { store: store, claimOrg: claim.org, implicitOrg: null };

    var checks = extracted.targets.map(function (target) {
      return target.kind === 'phone' ? T.checkPhone(target, ctx) : T.checkHost(target, ctx);
    });
    if (!checks.length) checks.push({ status: 'UNKNOWN', code: 'nothing_to_check' });

    // Implicit claim: no named sender, but a link or number points to a known organization.
    if (!claim.org) {
      var pointer = checks.filter(function (c) { return c.orgId && (c.status === 'SUPPORTS' || c.status === 'CONTRADICTS'); })[0];
      if (pointer) ctx.implicitOrg = T.orgById(store, pointer.orgId);
    }

    var agg = aggregate(checks, claim.org);
    var signals = T.requestSignals(extracted.masked);

    var result = {
      schemaVersion: 1,
      engineVersion: VERSION,
      storeVersion: store.version || null,
      state: agg.state,
      claimedIdentity: claim.org ? claim.org.displayName
        : ctx.implicitOrg ? 'Not stated (the link points to ' + ctx.implicitOrg.displayName + ')'
        : claim.generic || 'Not stated',
      claimSource: claim.org ? 'explicit' : ctx.implicitOrg ? 'implicit' : 'none',
      otherMentions: claim.otherMentions,
      channel: T.copy.channel(extracted.targets),
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
          return { id: f.id, level: f.level, label: T.copy.FLAG_LABELS[f.id], words: f.words, explanation: T.copy.FLAG_WARNINGS[f.id] };
        })
      },
      offerPaste: false,
      truncated: norm.truncated
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

  // Shape check for any result, including the scripted screenshot example.
  function validateResult(r) {
    if (!r || typeof r !== 'object') return false;
    if (!STATES[r.state]) return false;
    if (r.state === 'mismatch' && r.strength !== 'strong' && r.strength !== 'moderate') return false;
    if (!isText(r.claimedIdentity) || !isText(r.description) || !isText(r.meaning)) return false;
    if (!Array.isArray(r.checks) || !r.checks.length) return false;
    for (var k = 0; k < r.checks.length; k++) {
      var c = r.checks[k];
      if (!STATUSES[c.status] || !isText(c.code) || !isText(c.detail) || !isText(c.source)) return false;
    }
    if (!r.requestRisk || !LEVELS[r.requestRisk.level] || !Array.isArray(r.requestRisk.flags)) return false;
    if (!isTextList(r.actionWarnings) || !isTextList(r.nextSteps)) return false;
    return r.schemaVersion === 1;
  }

  root.TfsEngine = { analyze: analyze, validateResult: validateResult, version: VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
