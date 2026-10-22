'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCsv, toCsv } = require('./csv.cjs');

const HEADER = 'id,group_id,label,channel,category,source,collected,split,expected_findings,notes,text'.split(',');
const CATEGORIES = 'gift_card toll bank_login delivery tech_support family code appointment'.split(' ');
const CODES = new Set('T1-GIFT T1-CODE T1-WIRE T1-REMOTE T1-CALLBACK T1-DOMAIN T1-POLICY'.split(' '));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function validateDataset(rows, minTestRows = 5) {
  const errors = [], records = [], groups = new Map(), ids = new Set(), texts = new Set();
  if (JSON.stringify(rows[0]) !== JSON.stringify(HEADER)) return { errors: ['Use the exact eleven dataset headers.'], records, pivot: [], counts: {} };
  for (const [i, cells] of rows.slice(1).entries()) {
    const r = Object.fromEntries(HEADER.map((h, k) => [h, cells[k] || '']));
    const fail = issue => errors.push(`Row ${i + 2} (${r.id}): ${issue}`);
    if (cells.length !== HEADER.length) fail('wrong field count');
    for (const h of ['id', 'group_id', 'source', 'text']) if (!r[h].trim()) fail(`${h} is empty`);
    if (ids.has(r.id)) fail('duplicate id');
    ids.add(r.id);
    const textKey = r.text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    if (texts.has(textKey)) fail('duplicate normalized text');
    texts.add(textKey);
    if (!['fraud', 'legit'].includes(r.label)) fail('invalid label');
    if (!['text', 'email', 'unknown'].includes(r.channel)) fail('invalid channel');
    if (!CATEGORIES.includes(r.category)) fail('invalid category');
    if (!['dev', 'test'].includes(r.split)) fail('split must be dev or test');
    if (/^\s*fictional/i.test(r.source)) fail('source starts with FICTIONAL');
    const day = new Date(r.collected + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.collected) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== r.collected) fail('invalid collection date');
    const codes = r.expected_findings.trim().split(/\s+/).filter(Boolean);
    if (r.label === 'fraud' && !codes.length) fail('fraud needs an expected Tier 1 code');
    if (r.label === 'legit' && codes.length) fail('legit expected_findings must be blank');
    if (codes.some(c => !CODES.has(c)) || new Set(codes).size !== codes.length) fail('invalid or repeated Tier 1 code');
    const g = groups.get(r.group_id) || { group_id: r.group_id, category: r.category, split: r.split, dev: 0, test: 0 };
    if (g.category !== r.category) fail('group spans categories');
    if (g.split !== r.split) fail('group spans splits');
    if (r.split === 'dev' || r.split === 'test') g[r.split]++;
    groups.set(r.group_id, g);
    records.push(r);
  }
  for (const category of CATEGORIES) {
    const sorted = [...groups.values()].filter(g => g.category === category).sort((a, b) => a.group_id < b.group_id ? -1 : a.group_id > b.group_id ? 1 : 0);
    sorted.forEach((g, i) => {
      if (g.split !== (i % 3 === 2 ? 'test' : 'dev')) errors.push(`${g.group_id}: count-off rule mismatch`);
    });
  }
  const counts = {};
  for (const r of records) counts[r.split + '_' + r.label] = (counts[r.split + '_' + r.label] || 0) + 1;
  for (const label of ['fraud', 'legit']) if ((counts['test_' + label] || 0) < minTestRows) errors.push(`Test needs at least ${minTestRows} ${label} rows`);
  return { errors, records, counts, pivot: [...groups.values()] };
}

function verifyLock(input) {
  const lockPath = path.join(path.dirname(input), 'messages-lock.json');
  if (!fs.existsSync(lockPath)) return;
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const frozen = fs.readFileSync(path.join(path.dirname(input), lock.file));
  if (digest(frozen) !== lock.sha256) throw new Error('Locked CSV hash changed');
  const current = validateDataset(parseCsv(fs.readFileSync(input, 'utf8')));
  const test = current.records.filter(r => r.split === 'test');
  if (digest(toCsv(HEADER, test)) !== lock.test_sha256) throw new Error('Locked test rows changed');
}

function main() {
  const input = path.join(__dirname, 'data/messages.csv');
  const bytes = fs.readFileSync(input);
  const checked = validateDataset(parseCsv(bytes.toString('utf8')));
  if (checked.errors.length) throw new Error(checked.errors.join('\n'));
  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'split-pivot.csv'), toCsv(['group_id', 'category', 'dev', 'test'], checked.pivot));
  if (process.argv.includes('--lock')) {
    const file = 'messages-locked-2026-10-17.csv';
    const target = path.join(path.dirname(input), file);
    const lockPath = path.join(path.dirname(input), 'messages-lock.json');
    if (fs.existsSync(target) || fs.existsSync(lockPath)) throw new Error('Lock already exists; refusing to overwrite it');
    fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o444 });
    fs.writeFileSync(lockPath, JSON.stringify({
      file, locked_at: new Date().toISOString(), sha256: digest(bytes),
      test_sha256: digest(toCsv(HEADER, checked.records.filter(r => r.split === 'test'))),
      counts: checked.counts, groups: checked.pivot.length,
      basis: 'Synthetic scenarios, manually labeled and assigned before engine evaluation. Filename date is user supplied.'
    }, null, 2) + '\n', { flag: 'wx', mode: 0o444 });
  }
  verifyLock(input);
  console.log(JSON.stringify({ rows: checked.records.length, groups: checked.pivot.length, counts: checked.counts, validation: 'passed' }));
}

if (require.main === module) main();
module.exports = { HEADER, validateDataset, verifyLock, digest };
