#!/usr/bin/env node
/* Field evaluation: runs real, labeled messages through the real engine and reports how often
   it warns on fraud and how often it raises a false alarm on legitimate messages.
   Usage: npm run eval [-- --input eval/data/messages.csv --out eval/results --split test --strict] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, toCsv } = require('./csv.cjs');
const M = require('./metrics.cjs');
const { loadEngine } = require('./engine.cjs');

function option(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}

const pct = x => (100 * x).toFixed(1) + '%';
function rate(r, hits, n) {
  if (!r) return 'n/a (no messages)';
  return `${hits}/${n} = ${pct(r.rate)} (95% range ${pct(r.low)}–${pct(r.high)})`;
}

function section(title, results) {
  const t = M.tally(results);
  const lines = [`## ${title}`, ''];
  lines.push(`Fraud messages: ${t.fraud.n} · Legitimate messages: ${t.legit.n}`, '');
  lines.push('| | Suspicious | Insufficient Evidence | Details Match |', '| --- | --- | --- | --- |');
  lines.push(`| Fraud | ${t.fraud.suspicious} | ${t.fraud.insufficient} | ${t.fraud.match} |`);
  lines.push(`| Legitimate | ${t.legit.suspicious} | ${t.legit.insufficient} | ${t.legit.match} |`, '');
  lines.push(`- **Fraud given Details Match (false reassurance; must be 0):** ${rate(t.rates.reassured, t.fraud.match, t.fraud.n)}`);
  lines.push(`- Fraud labeled Suspicious: ${rate(t.rates.caught, t.fraud.suspicious, t.fraud.n)}`);
  lines.push(`- Fraud that at least said "pause" (Suspicious or Insufficient): ${rate(t.rates.paused, t.fraud.suspicious + t.fraud.insufficient, t.fraud.n)}`);
  lines.push(`- Legitimate labeled Suspicious (false alarm): ${rate(t.rates.falseAlarm, t.legit.suspicious, t.legit.n)}`);
  lines.push(`- Legitimate reaching Details Match: ${rate(t.rates.matched, t.legit.match, t.legit.n)}`, '');
  return { lines, tally: t };
}

function main() {
  const root = path.join(__dirname, '..');
  const input = path.resolve(option('input', path.join(root, 'eval/data/messages.csv')));
  const outDir = path.resolve(option('out', path.join(root, 'eval/results')));
  const only = option('split', 'all');
  const strict = process.argv.includes('--strict');
  if (['all', 'dev', 'test'].indexOf(only) < 0) { console.error('--split must be all, dev or test'); return 2; }
  if (!fs.existsSync(input)) {
    console.error(`No message file at ${path.relative(process.cwd(), input)}.\nCopy eval/messages.template.csv to eval/data/messages.csv and add real messages (see eval/README.md).`);
    return 2;
  }

  const { messages, errors, skipped } = M.readMessages(parseCsv(fs.readFileSync(input, 'utf8')));
  if (skipped) console.log(`Skipped ${skipped} fictional template row(s).`);
  if (errors.length) { console.error('Fix these rows first:\n  ' + errors.join('\n  ')); return 2; }
  if (!messages.length) { console.error('No real messages to evaluate.'); return 2; }

  const loaded = loadEngine(root);
  const all = M.judge(messages, loaded.analyze);
  const chosen = only === 'all' ? all : all.filter(r => r.split === only);

  const out = ['# Field evaluation', '',
    `Input: \`${path.basename(input)}\` · ${messages.length} messages · engine ${loaded.engine.version} · reference list ${loaded.store.version}`,
    `Organizations with a trusted contact (reviewed by a person, in date, complete): ${loaded.reviewedOrgs} of ${loaded.store.orgs.length}` +
      (loaded.reviewedOrgs ? '' : ' — Details Match cannot occur on the real list until records are reviewed.'), ''];
  const sections = only === 'all'
    ? [['Test split (report this one)', all.filter(r => r.split === 'test')], ['Dev split (tune rules on this one)', all.filter(r => r.split === 'dev')], ['All messages', all]]
    : [[`${only} split`, chosen]];
  let reassured = 0;
  sections.forEach(([title, results]) => {
    const s = section(title, results);
    out.push(...s.lines);
    if (title.startsWith('All') || only !== 'all') reassured = s.tally.fraud.match;
  });

  out.push('## Rules that fired', '', '| Rule | On fraud | On legitimate |', '| --- | --- | --- |');
  M.ruleCounts(chosen).forEach(r => out.push(`| ${r.rule} | ${r.fraud} | ${r.legit} |`));
  out.push('', '## By category', '', '| Category | Fraud n | Fraud Suspicious | Fraud Details Match | Legit n | Legit Suspicious |', '| --- | --- | --- | --- | --- | --- |');
  M.byCategory(chosen).forEach(c => out.push(`| ${c.category} | ${c.fraud.n} | ${c.fraud.suspicious} | ${c.fraud.match} | ${c.legit.n} | ${c.legit.suspicious} |`));

  const excerpt = t => t.replace(/\s+/g, ' ').slice(0, 110) + (t.length > 110 ? '…' : '');
  const list = (title, rows, why) => {
    out.push('', `## ${title} (${rows.length})`, '');
    if (!rows.length) out.push('None.');
    rows.forEach(r => out.push(`- **${r.id}** [${r.split}, ${r.category}] ${why(r)} — "${excerpt(r.text)}"`));
  };
  list('Fraud given Details Match', chosen.filter(r => r.outcome === 'REASSURED'), () => 'no rule fired and every contact matched');
  list('Fraud not labeled Suspicious', chosen.filter(r => r.outcome === 'paused'), r => 'signals: ' + (r.tier2.join(', ') || 'none') + '; blocked by ' + r.blockedBy.join(', '));
  list('False alarms on legitimate messages', chosen.filter(r => r.outcome === 'FALSE_ALARM'), r => 'rules: ' + r.tier1.join(', '));

  fs.mkdirSync(outDir, { recursive: true });
  const report = out.join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  const header = ['id', 'label', 'split', 'category', 'channel', 'assessment', 'outcome', 'tier1', 'tier2', 'blockedBy', 'source', 'text'];
  fs.writeFileSync(path.join(outDir, 'results.csv'), toCsv(header, chosen.map(r => Object.assign({}, r, {
    tier1: r.tier1.join(' '), tier2: r.tier2.join(' '), blockedBy: r.blockedBy.join(' ')
  }))));
  console.log(report);
  console.log(`Wrote ${path.relative(process.cwd(), path.join(outDir, 'report.md'))} and results.csv`);
  return strict && reassured > 0 ? 1 : 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { main };
