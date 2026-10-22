'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, toCsv } = require('./csv.cjs');

function classify(result, expected) {
  const actual = new Set(String(result.tier1 || '').split(/\s+/).filter(Boolean));
  const missing = String(expected || '').split(/\s+/).filter(c => c && c !== 'none' && !actual.has(c));
  if (result.label === 'fraud' && result.outcome === 'REASSURED') return 'A';
  if (result.label === 'fraud' && result.outcome === 'paused') return 'B';
  if (result.label === 'fraud' && result.outcome === 'caught' && missing.length) return 'C';
  if (result.outcome === 'FALSE_ALARM') return 'D';
  if (result.label === 'legit' && String(result.tier2 || '').trim()) return 'E';
  return '';
}

const causes = {
  'M009': ['wording', 'Forwarding a verification code was missing from the Tier 1 action verbs.'],
  'M012': ['wording', 'A direct PIN disclosure verb was missing from the Tier 1 action verbs.'],
  'M016': ['scope', 'A courier label caused the in-person exception to suppress a bank secret request.'],
  'M021': ['wording', 'The short object window cut off the gift payment instrument.'],
  'M024': ['wording', 'An outage purpose preface without punctuation hid the first action.'],
  'M018': ['overly broad warning', 'The secrecy flag treats a reported past event as a current warning sign.'],
  'M023': ['overly broad warning', 'The fee flag survives negated gift payment advice.'],
  'M026': ['overly broad warning', 'The device alarm flag survives conditional safety advice.']
};

function read(file) {
  const [header, ...data] = parseCsv(fs.readFileSync(file, 'utf8'));
  return data.map(a => Object.fromEntries(header.map((h, i) => [h, a[i]])));
}

function main() {
  const dir = path.join(__dirname, 'results');
  const messages = new Map(read(path.join(__dirname, 'data/dev_messages.csv')).map(r => [r.id, r]));
  const results = read(path.join(dir, 'results.csv'));
  const joined = results.map(r => {
    const m = messages.get(r.id);
    if (!m || m.split !== 'dev' || r.split !== 'dev') throw new Error('Result lacks a matching dev source row');
    const failure = classify(r, m.expected_findings);
    const cause = failure ? causes[r.id] || ['other', 'Needs a manual trace review.'] : ['', ''];
    return { ...r, expected: m.expected_findings, group: m.group_id, failure, root_cause: cause[0], description: cause[1] };
  });
  fs.writeFileSync(path.join(dir, 'results-merged.csv'), toCsv([...Object.keys(results[0]), 'expected', 'group', 'failure', 'root_cause', 'description'], joined));
  const failures = joined.filter(r => r.failure).sort((a, b) => a.failure.localeCompare(b.failure) || a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(dir, 'failures.csv'), toCsv(['id', 'failure', 'root_cause', 'description'], failures));
  console.log(JSON.stringify({ rows: joined.length, failures: failures.map(r => ({ id: r.id, category: r.failure, root: r.root_cause })) }));
}

if (require.main === module) main();
module.exports = { classify, causes };
