#!/usr/bin/env node
/* Field evaluation: runs real, labeled messages through the real engine and reports how often
   it warns on fraud and how often it raises a false alarm on legitimate messages.
   Usage: npm run eval -- --split dev [--input eval/data/messages.csv --out eval/results --strict] */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseCsv, toCsv } = require('./csv.cjs');
const M = require('./metrics.cjs');
const { loadEngine } = require('./engine.cjs');
const { validateDataset, verifyLock } = require('./dataset.cjs');
const { HEADER: DEV_HEADER, readDevData } = require('./dev-data.cjs');
const { HEADER: SOURCE_HEADER, readSuppliedData } = require('./supplied-data.cjs');
const { checkSplit, recordDevExposure, verifyTestRelease, reserveTestRun, finishTestRun } = require('./test-access.cjs');

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
  lines.push(`- Legitimate labeled Suspicious or shown a strong warning: ${rate(t.rates.alarmed, t.legit.suspicious + t.legit.warnedOnly, t.legit.n)}`);
  lines.push(`- Legitimate reaching Details Match: ${rate(t.rates.matched, t.legit.match, t.legit.n)}`, '');
  return { lines, tally: t };
}

function main() {
  const root = path.join(__dirname, '..');
  const only = option('split', null);
  try { checkSplit(only); } catch (err) { console.error(err.message); return 2; }
  const activePath = path.join(root, 'eval/data/active-eval.json');
  const active = fs.existsSync(activePath) ? JSON.parse(fs.readFileSync(activePath, 'utf8')) : null;
  const activeInput = active ? path.resolve(root, 'eval/data', active.input) : null;
  const devInput = path.join(root, 'eval/data/dev_messages.csv');
  const input = path.resolve(option('input', activeInput || (fs.existsSync(devInput) ? devInput : path.join(root, 'eval/data/messages.csv'))));
  const outDir = path.resolve(option('out', path.join(root, only === 'test' ? 'eval/results/heldout-2026-10-19' : 'eval/results')));
  const strict = process.argv.includes('--strict');
  if (!fs.existsSync(input)) {
    console.error(`No message file at ${path.relative(process.cwd(), input)}.\nCopy eval/messages.template.csv to eval/data/messages.csv and add real messages (see eval/README.md).`);
    return 2;
  }
  if (active && input === activeInput && active.sha256 !== require('./dataset.cjs').digest(fs.readFileSync(input))) {
    console.error('The selected source snapshot changed; refusing to evaluate it.'); return 2;
  }

  const parsed = parseCsv(fs.readFileSync(input, 'utf8'));
  const devFormat = JSON.stringify(parsed[0]) === JSON.stringify(DEV_HEADER);
  const devData = devFormat ? readDevData(parsed) : null;
  if (devData && devData.errors.length) { console.error(devData.errors.join('\n')); return 2; }
  const sourceFormat = JSON.stringify(parsed[0]) === JSON.stringify(SOURCE_HEADER);
  const sourceData = sourceFormat ? readSuppliedData(parsed) : null;
  if (sourceData && sourceData.errors.length) { console.error(sourceData.errors.join('\n')); return 2; }
  if (!devFormat && !sourceFormat && parsed[0] && parsed[0].some(h => h === 'group_id' || h === 'expected_findings')) {
    const checked = validateDataset(parsed);
    if (checked.errors.length) { console.error(checked.errors.join('\n')); return 2; }
    try { verifyLock(input); } catch (err) { console.error(err.message); return 2; }
  }
  if (sourceFormat) {
    try { verifyLock(input); } catch (err) { console.error(err.message); return 2; }
  }
  const prepared = devData || sourceData;
  const { messages, errors, skipped } = prepared
    ? { messages: prepared.records, errors: [], skipped: 0 } : M.readMessages(parsed);
  if (skipped) console.log(`Skipped ${skipped} fictional template row(s).`);
  if (errors.length) { console.error('Fix these rows first:\n  ' + errors.join('\n  ')); return 2; }
  if (!messages.length) { console.error('No real messages to evaluate.'); return 2; }

  const selected = selectMessages(messages, only);
  if (!selected.length) { console.error('The chosen split has no rows.'); return 2; }
  if (only === 'dev') recordDevExposure(root, selected);
  let access = null;
  if (only === 'test') {
    if (selected.some(r => /\bsynthetic\b/i.test((r.source || '') + ' ' + (r.notes || '')))) {
      console.error('Synthetic rows cannot enter the held-out test.'); return 2;
    }
    try { access = verifyTestRelease(root, input); } catch (err) { console.error(err.message); return 2; }
  }
  const today = access ? access.release.referenceDate : option('today', active && input === activeInput ? active.today : undefined);
  const loaded = loadEngine(root, { today });
  if (access) {
    try { reserveTestRun(access.receiptPath, { input, sha256: access.release.sha256, outDir, rows: selected.length }); }
    catch (err) { console.error('Cannot reserve the single test attempt: ' + err.message); return 2; }
  }
  const all = M.judge(selected, loaded.analyze);
  const chosen = all;
  const synthetic = selected.filter(r => /\bsynthetic\b/i.test(r.notes || '')).length;

  const out = ['# Field evaluation', '',
    `Input: \`${path.basename(input)}\` · ${selected.length} evaluated rows of ${messages.length} input rows · split ${only} · engine ${loaded.engine.version} · reference list ${loaded.store.version}`,
    `Synthetic rows evaluated: ${synthetic}. Synthetic results check behavior and do not measure real-world accuracy.`,
    `Reference date: ${today || 'runtime date'}.`,
    `Organizations with a trusted contact (reviewed by a person, in date, complete): ${loaded.reviewedOrgs} of ${loaded.store.orgs.length}` +
      (loaded.reviewedOrgs ? '' : ' — Details Match cannot occur on the real list until records are reviewed.'), ''];
  if (!loaded.reviewedOrgs) out.push('Interpretation: zero false reassurance is enforced by the current reference state, not evidence of detection quality.', '');
  const sections = [[`${only} split`, chosen]];
  let reassured = 0;
  sections.forEach(([title, results]) => {
    const s = section(title, results);
    out.push(...s.lines);
    reassured = s.tally.fraud.match;
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
  list('Fraud not labeled Suspicious', chosen.filter(r => r.label === 'fraud' && r.outcome === 'paused'), r => 'signals: ' + (r.tier2.join(', ') || 'none') + '; blocked by ' + r.blockedBy.join(', '));
  list('False alarms on legitimate messages', chosen.filter(r => r.outcome === 'FALSE_ALARM'), r => 'rules: ' + r.tier1.join(', '));
  list('Strong warnings on legitimate messages not labeled Suspicious', chosen.filter(r => r.label === 'legit' && r.outcome !== 'FALSE_ALARM' && r.strongWarning), r => 'signals: ' + (r.tier2.join(', ') || 'none'));

  fs.mkdirSync(outDir, { recursive: true });
  const report = out.join('\n') + '\n';
  fs.writeFileSync(path.join(outDir, 'report.md'), report);
  const header = ['id', 'label', 'split', 'category', 'channel', 'assessment', 'outcome', 'tier1', 'tier2', 'blockedBy', 'source', 'text'];
  fs.writeFileSync(path.join(outDir, 'results.csv'), toCsv(header, chosen.map(r => Object.assign({}, r, {
    tier1: r.tier1.join(' '), tier2: r.tier2.join(' '), blockedBy: r.blockedBy.join(' ')
  })), { spreadsheetSafe: true }));
  // Exact analyzed text is retained separately from the display-only CSV prefix.
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(chosen, null, 2) + '\n');
  if (access) finishTestRun(access.receiptPath, {
    report: path.join(outDir, 'report.md'), results: path.join(outDir, 'results.csv'),
    reportSha256: require('./dataset.cjs').digest(fs.readFileSync(path.join(outDir, 'report.md'))),
    resultsSha256: require('./dataset.cjs').digest(fs.readFileSync(path.join(outDir, 'results.csv')))
  });
  console.log(report);
  console.log(`Wrote ${path.relative(process.cwd(), path.join(outDir, 'report.md'))}, results.csv and results.json`);
  return strict && reassured > 0 ? 1 : 0;
}

function selectMessages(messages, split) {
  if (split !== 'dev' && split !== 'test') throw new Error('A dev or test split is required.');
  return messages.filter(r => r.split === split);
}

if (require.main === module) process.exitCode = main();
module.exports = { main, selectMessages };
