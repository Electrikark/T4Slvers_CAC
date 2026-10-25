#!/usr/bin/env node
/* npm run discovery:check -- --report <folder> [--review <review-export.json>]
   Re-verifies a report folder: schema, exact spans, reachability, dev-only rows, output digests and
   manifest consistency. With --review, validates a review export against it and writes
   review-summary.md and issue-drafts.md into the folder. Exit 0 valid, 1 invalid, 2 usage. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const shared = require('./review/shared.js');

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; };
const STAGE = ['ok', 'empty', 'unavailable', 'skipped', 'failed'];

function readJson(file, errors) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { errors.push(`${path.basename(file)}: ${fs.existsSync(file) ? 'not valid JSON' : 'missing'}`); return null; }
}

function main() {
  const dir = arg('report');
  if (!dir) { console.error('Usage: npm run discovery:check -- --report <folder> [--review <file>]'); return 2; }
  const errors = [];
  const manifest = readJson(path.join(dir, 'manifest.json'), errors);
  const findings = readJson(path.join(dir, 'findings.json'), errors);
  if (findings) errors.push(...shared.validateFindings(findings).errors);
  if (manifest && findings && !errors.length) {
    if (manifest.schema !== 'safety4seniors.discovery.manifest' || manifest.version !== 1) errors.push('manifest: schema or version does not match');
    if (manifest.runId !== findings.runId) errors.push('manifest and findings are from different runs');
    if (manifest.split !== 'dev') errors.push('manifest: split is not dev');
    if (manifest.referenceDate !== findings.referenceDate) errors.push('manifest and findings disagree on the reference date');
    for (const [file, digest] of Object.entries(manifest.outputs || {})) {
      const p = path.join(dir, file);
      if (!fs.existsSync(p) || sha256(fs.readFileSync(p, 'utf8')) !== digest) errors.push(`${file}: digest does not match the manifest`);
    }
    const ids = findings.messages.map(m => m.messageId).sort();
    if (JSON.stringify(ids) !== JSON.stringify(manifest.selection.selectedIds)) errors.push('Messages differ from the manifest selection');
    for (const [k, s] of Object.entries(manifest.stages || {})) if (!STAGE.includes(s.status)) errors.push(`stage ${k}: unknown status ${s.status}`);
    const buckets = { real: 0, synthetic: 0 };
    for (const m of findings.messages) buckets[m.provenance.bucket]++;
    if (buckets.real !== manifest.selection.messages.real || buckets.synthetic !== manifest.selection.messages.synthetic) errors.push('Real/synthetic counts differ from the manifest');
    if (findings.demonstration !== (buckets.real === 0)) errors.push('demonstration flag is wrong');
  }
  if (errors.length) { console.log('Report INVALID:\n  ' + errors.join('\n  ')); return 1; }
  console.log(`Report OK: run ${findings.runId}, ${findings.messages.length} dev messages, ${findings.candidates.length} candidates, ${findings.groups.length} groups, embedding ${manifest.stages.embedding.status}${findings.demonstration ? ' (demonstration)' : ''}.`);

  const reviewFile = arg('review');
  if (!reviewFile) return 0;
  const review = readJson(reviewFile, errors);
  const checked = review ? shared.validateReview(review, findings) : { ok: false, errors };
  if (!checked.ok) { console.log('Review INVALID:\n  ' + checked.errors.join('\n  ')); return 1; }
  const summary = shared.summarizeReview(review, findings);
  fs.writeFileSync(path.join(dir, 'review-summary.md'), shared.renderSummary(summary), { mode: 0o600 });
  fs.writeFileSync(path.join(dir, 'issue-drafts.md'), shared.issueDrafts(review, findings), { mode: 0o600 });
  console.log(`Review OK: ${summary.decided} decisions with an outcome. Wrote review-summary.md and issue-drafts.md (drafts only; nothing filed).`);
  return 0;
}

process.exitCode = main();
