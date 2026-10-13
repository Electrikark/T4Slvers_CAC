const Assessment = Object.freeze({
  SUSPICIOUS: 'suspicious',
  DETAILS_MATCH: 'details_match',
  INSUFFICIENT: 'insufficient_evidence',
});

// The closed set of Tier 1 rules. A Tier 1 finding outside it is a wiring error, not a verdict.
const TIER1_RULES = Object.freeze([
'T1-GIFT',
'T1-WIRE',
'T1-REMOTE',
'T1-DOMAIN',
'T1-CODE',
'T1-CALLBACK',
]);

function assertFindings(findings) {
for (const f of findings) {
if (f.tier === 1 && !TIER1_RULES.includes(f.ruleId)) {
throw new Error(`Unknown Tier 1 rule: ${f.ruleId}`);
}
}
return findings;
}

function assertAssessment(value) {
  if (!Object.values(Assessment).includes(value)) {
    throw new Error(`Invalid assessment: ${value}`);
  }
  return value;
}

function detailsMatchBlockers(evidence) {
  const blockers = [];
  const org = evidence.sender && evidence.sender.explicit
    ? evidence.sender.recognizedOrg : null;
  const contacts = evidence.contacts || [];
  const matchesSender = contact => contact.verification === 'verified' && contact.org === org;

  if (!org) blockers.push('NO_EXPLICIT_RECOGNIZED_SENDER');
  if (!contacts.some(matchesSender)) blockers.push('NO_VERIFIED_CONTACT');
  if (!contacts.every(matchesSender)) blockers.push('UNRESOLVED_OR_OUT_OF_SCOPE_CONTACT');
  if ((evidence.uncertainty || []).length) blockers.push('UNCERTAINTY');
  if ((evidence.findings || []).length) blockers.push('RISK_SIGNAL');

  return blockers;
}

function result(assessment, trace) {
  return { assessment: assertAssessment(assessment), trace };
}

function assess(evidence) {
  // An established Tier 1 risk takes priority over matching contact details.
  const tier1 = (evidence.findings || []).filter(finding =>
    finding.tier === 1 && finding.status === 'established'
  );
  if (tier1.length) {
    return result(Assessment.SUSPICIOUS, {
      rules: tier1.map(finding => finding.ruleId),
      blockedBy: [],
    });
  }

  const blockedBy = detailsMatchBlockers(evidence);
  if (!blockedBy.length) {
    return result(Assessment.DETAILS_MATCH, {
      rules: ['DM_ALL_CONDITIONS'],
      blockedBy,
    });
  }

  return result(Assessment.INSUFFICIENT, { rules: [], blockedBy });
}

module.exports = {
  Assessment,
  assess,
  detailsMatchBlockers,
  assertAssessment,
function assess(e) {
const tier1 = assertFindings(e.findings || []).filter(f =>
f.tier === 1 && f.status === 'established'
);

if (tier1.length > 0) {
return result(Assessment.SUSPICIOUS, {
rules: tier1.map(f => f.ruleId),
blockedBy: [],
});
}

const blockedBy = detailsMatchBlockers(e);

if (blockedBy.length === 0) {
return result(Assessment.DETAILS_MATCH, {
rules: ['DM_ALL_CONDITIONS'],
blockedBy,
});
}

return result(Assessment.INSUFFICIENT, {
rules: [],
blockedBy,
});
}

module.exports = {
Assessment,
TIER1_RULES,
assess,
detailsMatchBlockers,
assertAssessment,
};
