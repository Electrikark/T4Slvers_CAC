/* The engine's front door: analyze() runs every stage and builds the result;
   validateResult() refuses any result whose parts disagree with each other.
   window.TfsEngine = { analyze(text, store, { declaredChannel }), validateResult(result), version } */
(function (root) {
  'use strict';
  const T = root.TFS = root.TFS || {};
  const gate = root.TfsAssessment;
  const VERSION = '0.4.0';
  const CHANNELS = { text: 'Text', email: 'Email', unknown: 'Not sure' };
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function analyze(input, store, options) {
    if (!store || !store.orgs) throw new Error('analyze(text, store) needs a reference store');
    if (!options || typeof options.declaredChannel !== 'string' || !has(CHANNELS, options.declaredChannel)) {
      throw new Error('Choose Text, Email, or Not sure before analysis');
    }

    // Reading 1: who the message claims to be from, and its links, emails and phone numbers.
    const norm = T.normalizeText(input);
    const extracted = T.extractTargets(norm.text);
    // Sender attribution reads the person's own text, so its span points at what they pasted.
    const bounded = (input == null ? '' : String(input)).slice(0, T.MAX_CHARS);
    const senderView = T.riskView(bounded);
    const claim = T.findClaim(T.extractTargets(senderView.text).masked, store);
    const attribution = claim.attribution;
    if (attribution.span) {
      const moved = T.sourceSpan(senderView, bounded, attribution.span.start, attribution.span.end);
      attribution.span = { start: moved.start, end: moved.end, quote: bounded.slice(moved.start, moved.end) };
    }
    // Only the filtered view can support a contact; the full list still names lookalikes.
    const trusted = T.buildTrustedView(store, options.today);
    const ctx = { store, trusted, claimOrg: claim.org, implicitOrg: null, linkAction: T.sourceLinkAction(bounded) };
    const checks = extracted.targets.map(target =>
      target.kind === 'phone' ? T.checkPhone(target, ctx) : T.checkHost(target, ctx));

    // Reading 2: what the message asks for, read from the original text so quotes stay exact.
    const signals = T.sourceSignals(bounded, ctx);
    const incomplete = norm.truncated || extracted.incomplete || signals.incomplete;

    if (!checks.length) checks.push({ status: 'UNKNOWN', code: 'nothing_to_check' });
    if (incomplete) checks.push({ status: 'UNKNOWN', code: 'input_incomplete' });
    if (signals.unresolved.length) checks.push({ status: 'UNKNOWN', code: 'risk_unresolved' });

    // No named sender, but every listed address points to the same organization. A lookalike
    // (CONTRADICTS) only resembles an organization, so it never names one: medicaid.gov is not Medicare.
    if (!claim.org) {
      const pointers = checks.filter(c => c.orgId && c.status === 'SUPPORTS');
      if (pointers.length && pointers.every(c => c.orgId === pointers[0].orgId)) ctx.implicitOrg = T.orgById(store, pointers[0].orgId);
    }

    const sender = { explicit: Boolean(claim.org), recognizedOrg: claim.org ? claim.org.id : null };
    // Reading 3: reviewed organization policies (T1-POLICY). Drafts never reach the evaluator.
    const policyView = options.policies ? T.buildPolicyView(options.policies, options.today) : null;
    const policy = T.evaluatePolicies({
      raw: bounded, declaredChannel: options.declaredChannel, attribution, signals,
      contacts: T.sourceTargets(bounded), view: policyView, answers: options.answers
    });
    policy.excluded = policyView ? policyView.excluded.slice() : [];

    const evidence = T.normalizeEvidence(checks, sender, Boolean(ctx.implicitOrg), signals, incomplete, policy.findings);
    const decided = gate.assess(evidence);

    const result = {
      schemaVersion: 3,
      engineVersion: VERSION,
      storeVersion: store.version || null,
      referenceView: { day: trusted.day, trusted: trusted.trusted.length, excluded: trusted.excluded.length },
      assessment: decided.assessment,
      trace: decided.trace,
      evidence,
      declaredChannel: options.declaredChannel,
      reputationLookup: { status: 'not_performed' },
      claimedIdentity: claim.org ? claim.org.displayName
        : ctx.implicitOrg ? `Not stated (an address refers to ${ctx.implicitOrg.displayName})`
        : claim.generic || 'Not stated',
      claimSource: claim.org ? 'explicit' : ctx.implicitOrg ? 'implicit' : 'none',
      senderAttribution: attribution,
      policy,
      channel: CHANNELS[options.declaredChannel] + ' · ' + T.copy.channel(extracted.targets),
      inspected: extracted.targets.length
        ? extracted.targets.map(T.copy.shown).join(' · ')
        : 'No links, email addresses or phone numbers found',
      checks: checks.map(c => {
        const shown = { status: c.status, code: c.code, detail: T.copy.checkDetail(c, ctx), source: T.copy.checkSource(c, ctx) };
        if (c.strength) shown.strength = c.strength;
        if (c.target) shown.target = T.copy.shown(c.target);
        return shown;
      }),
      requestRisk: {
        level: signals.level,
        flags: signals.flags.map(f => ({ id: f.id, level: f.level, label: T.copy.FLAGS[f.id].label, words: f.words, start: f.start, end: f.end })),
        established: signals.established,
        unresolved: signals.unresolved
      },
      truncated: norm.truncated,
      incomplete
    };
    Object.assign(result, T.copy.describe(result));
    result.actionWarnings = T.copy.warnings(result, ctx);
    result.nextSteps = T.copy.nextSteps(result, ctx);
    return result;
  }

  /* ---------- Validation: a wiring check, not a second policy ---------- */

  const isText = v => typeof v === 'string' && v.length > 0;
  const isTextList = v => Array.isArray(v) && v.every(isText);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const validSpan = s => s === null || Boolean(s && Number.isInteger(s.start) && Number.isInteger(s.end) &&
    s.start >= 0 && s.end > s.start && s.end <= T.MAX_CHARS && isText(s.quote) && s.quote.length === s.end - s.start);

  // Every field the page shows must be present and well-formed.
  function validShape(r) {
    if (!r || typeof r !== 'object' || 'state' in r || 'decision' in r) return false;
    if (Object.values(gate.Assessment).indexOf(r.assessment) < 0) return false;
    if (typeof r.declaredChannel !== 'string' || !has(CHANNELS, r.declaredChannel)) return false;
    if (!r.reputationLookup || r.reputationLookup.status !== 'not_performed') return false;
    if (![r.claimedIdentity, r.description, r.meaning, r.channel, r.inspected].every(isText)) return false;
    if (!Array.isArray(r.checks) || !r.checks.length || !r.checks.every(c =>
      c && ['SUPPORTS', 'CONTRADICTS', 'UNKNOWN'].indexOf(c.status) >= 0 && isText(c.code) && isText(c.detail) && isText(c.source))) return false;
    const risk = r.requestRisk;
    if (!risk || ['none', 'elevated', 'high'].indexOf(risk.level) < 0) return false;
    if (!Array.isArray(risk.flags) || !Array.isArray(risk.established) || !Array.isArray(risk.unresolved)) return false;
    if (!risk.established.every(e => e && e.ruleId !== 'T1-DOMAIN' && gate.TIER1_RULES.indexOf(e.ruleId) >= 0 &&
      e.action && isText(e.action.quote) && e.clause && isText(e.clause.quote))) return false;
    if (!risk.flags.every(f => f && isText(f.id) && isText(f.label) && isText(f.words) && ['medium', 'high'].indexOf(f.level) >= 0)) return false;
    if ((risk.level === 'none') !== (risk.flags.length === 0)) return false;
    if (!isTextList(r.actionWarnings) || !r.actionWarnings.length || !isTextList(r.nextSteps) || !r.nextSteps.length) return false;
    return r.schemaVersion === 3 && typeof r.incomplete === 'boolean' && typeof r.truncated === 'boolean' && !(r.truncated && !r.incomplete);
  }

  // The evidence must match the displayed checks and signals, and the gate must agree with the result.
  function validEvidence(r) {
    const e = r.evidence;
    if (!e || !e.sender || typeof e.sender.explicit !== 'boolean' ||
        !(e.sender.recognizedOrg === null || isText(e.sender.recognizedOrg)) ||
        !Array.isArray(e.contacts) || !Array.isArray(e.findings) || !isTextList(e.uncertainty)) return false;
    if (['explicit', 'implicit', 'none'].indexOf(r.claimSource) < 0 ||
        e.sender.explicit !== (r.claimSource === 'explicit') ||
        (e.sender.explicit ? !e.sender.recognizedOrg : e.sender.recognizedOrg !== null)) return false;
    if (!e.findings.every(f => f && isText(f.ruleId) && (f.tier === 1 || f.tier === 2) &&
      (f.status === 'established' || f.status === 'unresolved') && validSpan(f.span))) return false;

    // Each contact must point at its own displayed check, unchanged.
    const rawChecks = r.checks.map(c => ({ status: c.status, code: c.code }));
    const seen = new Set();
    for (const contact of e.contacts) {
      if (!contact || !Number.isInteger(contact.checkIndex) || seen.has(contact.checkIndex)) return false;
      const original = contact.support, shown = r.checks[contact.checkIndex];
      if (!original || !original.target || !shown || original.code !== shown.code || original.status !== shown.status ||
          T.copy.shown(original.target) !== shown.target || original.strength !== shown.strength) return false;
      rawChecks[contact.checkIndex] = original;
      seen.add(contact.checkIndex);
    }
    if (r.checks.some((c, i) => Boolean(c.target) !== seen.has(i))) return false;
    if (r.incomplete !== r.checks.some(c => c.code === 'input_incomplete')) return false;

    // Rebuilding the evidence from what is displayed must give the same evidence and the same decision.
    if (!r.policy || !Array.isArray(r.policy.findings) || !Array.isArray(r.policy.trace)) return false;
    if (!r.policy.findings.every(f => f && f.ruleId === 'T1-POLICY' && isText(f.policyId) && isText(f.quote))) return false;
    if (!same(e, T.normalizeEvidence(rawChecks, e.sender, r.claimSource === 'implicit', r.requestRisk, r.incomplete, r.policy.findings))) return false;
    if (!r.trace || !isTextList(r.trace.rules) || !isTextList(r.trace.blockedBy)) return false;
    const expected = gate.assess(e);
    return expected.assessment === r.assessment && same(expected.trace, r.trace);
  }

  function validateResult(r) {
    try { return validShape(r) && validEvidence(r); } catch (err) { return false; }
  }

  root.TfsEngine = { analyze, validateResult, version: VERSION };
})(typeof window !== 'undefined' ? window : globalThis);
