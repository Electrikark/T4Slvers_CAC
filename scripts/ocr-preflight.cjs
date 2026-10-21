'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const args = process.argv.slice(2);
const rootAt = args.indexOf('--root');
if (args.some((arg, i) => arg !== '--json' && arg !== '--root' && !(rootAt >= 0 && i === rootAt + 1)) ||
    args.filter(arg => arg === '--root').length > 1 || args.filter(arg => arg === '--json').length > 1 ||
    (rootAt >= 0 && (!args[rootAt + 1] || args[rootAt + 1].startsWith('--')))) {
  console.error('Usage: node scripts/ocr-preflight.cjs [--root PATH] [--json]');
  process.exit(2);
}
const targetRoot = rootAt >= 0 ? path.resolve(args[rootAt + 1]) : path.resolve(__dirname, '..');
const root = fs.existsSync(targetRoot) ? fs.realpathSync(targetRoot) : targetRoot;
const git = (...parts) => {
  try {
    return execFileSync('git', ['-C', root, ...parts], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch { return null; }
};
const checks = [];
const check = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
const top = git('rev-parse', '--show-toplevel');
check('repository', top && path.resolve(top) === root, top || 'No Git checkout at this path');
const remote = git('remote', 'get-url', 'origin');
check('origin', /^(?:https:\/\/github\.com\/|git@github\.com:)Electrikark\/T4Slvers_CAC(?:\.git)?$/.test(remote || ''), remote || 'No origin');
const dirty = git('status', '--porcelain=v1', '--untracked-files=all');
check('clean_tree', dirty === '', dirty === null ? 'Unable to read status' : dirty || 'Clean');

let readiness = {};
let readinessError = '';
try { readiness = JSON.parse(fs.readFileSync(path.join(root, 'docs/ocr/readiness.json'), 'utf8')); }
catch (error) { readinessError = error.message; }
const noted = value => typeof value === 'string' && value.trim().length > 0;
check('video_recorded', readiness?.video?.recorded === true && noted(readiness?.video?.evidence),
  readinessError || readiness?.video?.evidence || 'Record the video and note its date or location');
check('phone_copying_hard', readiness?.phone?.copyingWasHard === true && noted(readiness?.phone?.evidence),
  readinessError || readiness?.phone?.evidence || 'Record the physical-phone copying result and device/browser');

const source = readiness?.freeze?.sourceRevision;
const validSource = typeof source === 'string' && /^[0-9a-f]{40}$/.test(source);
const resolved = validSource ? git('rev-parse', '--verify', source + '^0') : null;
const tag = git('rev-parse', '--verify', 'refs/tags/v1.0-cac^0');
const release = git('show', 'HEAD:RELEASE.md') || '';
const releaseSource = release.match(/^Source revision:\s*([0-9a-f]{40})\s*$/m)?.[1];
check('frozen_source', validSource && resolved === source && noted(readiness?.freeze?.evidence) &&
  (tag ? tag === source : releaseSource === source),
  tag ? 'v1.0-cac: ' + tag : releaseSource ? 'RELEASE.md source: ' + releaseSource :
    'No v1.0-cac tag or tracked RELEASE.md with a Source revision: <full SHA> line');

let fixture = null;
try {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'tests/reporting-scope/fixture.json'), 'utf8'));
  const rows = data.rows.concat(data.hand_rows);
  fixture = { total: rows.length, singleLine: rows.filter(row => !/[\r\n]/.test(row.text)).length,
    evaluationDate: data.evaluation_date };
} catch (error) { check('fixture_readable', false, error.message); }

const report = { scope: 'Prerequisites only; no OCR or release validation', root,
  branch: git('branch', '--show-current'), revision: git('rev-parse', 'HEAD'),
  ready: checks.every(item => item.passed), checks, fixture };
if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log(report.scope);
  console.log('Branch: ' + report.branch + '\nRevision: ' + report.revision);
  for (const item of checks) console.log((item.passed ? 'PASS ' : 'WAIT ') + item.name + ': ' + item.detail);
  if (fixture) console.log('Fixture: ' + fixture.total + ' rows; ' + fixture.singleLine + ' have no line breaks');
  console.log(report.ready ? 'Prerequisites recorded. Use the isolated setup steps in docs/ocr/SETUP.md.' :
    'NOT READY. Resolve the WAIT items before creating the OCR feature branch.');
}
process.exitCode = report.ready ? 0 : 1;
