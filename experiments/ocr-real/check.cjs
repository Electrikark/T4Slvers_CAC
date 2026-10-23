#!/usr/bin/env node
/* Real-screenshot check: do real phone screenshots, read by the app's own OCR, give the same
   result as the real message?

   For each screenshot you list in data/truth.csv, this script
     1. reads the image with js/ocr.js readScreenshot (the same Tesseract files and settings the
        page uses, in Chromium), exactly as the page receives it, before any human correction;
     2. checks the OCR text the way the page does for a screenshot (inputSource "screenshot");
     3. checks the text you typed the way the page does for pasted text;
     4. compares them.

   Main question (the gate): does the screenshot path give the same verdict and the same Tier 1
   findings as copying the real message, and is it never SAFER (less cautious) than the truth?
   A screenshot can never reach Details Match by design, so "Details Match -> Insufficient
   Evidence" is expected and is not counted against OCR.

   Run:   node experiments/ocr-real/check.cjs [--data DIR] [--today YYYY-MM-DD] [--chromium PATH]
   Test:  node experiments/ocr-real/check.cjs --self-test
   In:    DIR/truth.csv and DIR/images/ (default DIR: experiments/ocr-real/data, kept out of git)
   Out:   experiments/ocr-real/out/report.md, details.json, ocr.json (OCR cache; also out of git)
   Exit:  0 gate passed, 1 gate failed or too few screenshots, 2 input problem */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback; };

// ---- Gate (fixed before any screenshot is read; change it only with a written reason) ----
const GATE = { minScreenshots: 20, minSameShare: 0.9, maxSafer: 0 };

// ---- Pure comparison logic (covered by --self-test) ----
const CAUTION = { details_match: 0, insufficient_evidence: 1, suspicious: 2 };
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

/* truth: the typed message checked as pasted text. ocr: the OCR text checked as a screenshot.
   Each is { assessment, tier1: [] } or, for ocr, { problem: 'no-text' | 'too-long' | 'read-failed' }. */
function judge(truth, ocr) {
  if (ocr.problem) return { outcome: 'not-checked', same: false, safer: false, note: ocr.problem };
  const designCap = truth.assessment === 'details_match' && ocr.assessment === 'insufficient_evidence';
  const verdictSame = truth.assessment === ocr.assessment || designCap;
  const tier1Same = sameSet(truth.tier1, ocr.tier1);
  const safer = !designCap && CAUTION[ocr.assessment] < CAUTION[truth.assessment];
  const more = CAUTION[ocr.assessment] > CAUTION[truth.assessment] && !designCap;
  let outcome = 'same';
  if (safer) outcome = 'SAFER';
  else if (more) outcome = 'more-cautious';
  else if (!tier1Same) outcome = 'findings-differ';
  return { outcome, same: verdictSame && tier1Same, safer, note: designCap ? 'Details Match capped for screenshots (by design)' : '' };
}

// Fields a person might act on. Same patterns as experiments/ocr-robustness/analyze.cjs.
function fields(text) {
  const t = String(text).replace(/\s+/g, ' ');
  const set = (re, f = x => x) => [...new Set([...t.matchAll(re)].map(m => f(m[0])))].sort();
  return {
    links: set(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+(?:com|net|org|gov|top|xyz|site|info|us)(?:\/[^\s]*)?/gi, s => s.toLowerCase().replace(/[.,;:!?)]+$/, '')),
    phones: set(/\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\b1-\d{3}-\d{3}-\d{4}\b/g, s => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''))
  };
}
// lost: in the real message but not read correctly (misread or missing). extra: read but not in
// the message (usually the sender line or a misread). Only "lost" means a contact was damaged.
function fieldChanges(truthText, ocrText) {
  const a = fields(truthText), b = fields(ocrText), out = {};
  for (const k of Object.keys(a)) {
    const lost = a[k].filter(x => !b[k].includes(x)), extra = b[k].filter(x => !a[k].includes(x));
    if (lost.length || extra.length) out[k] = { lost, extra };
  }
  return out;
}
const contactsExact = changes => Object.values(changes).every(c => !c.lost.length);

// Wilson 95% upper bound, for "0 of n were safer".
function wilsonHigh(hits, n, z = 1.96) {
  if (!n) return 1;
  const p = hits / n, z2 = z * z;
  return Math.min(1, ((p + z2 / (2 * n)) + z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n));
}

function gate(rows) {
  const n = rows.length, same = rows.filter(r => r.main.same).length, safer = rows.filter(r => r.main.safer).length;
  const needSame = Math.ceil(GATE.minSameShare * n);
  const reasons = [];
  if (n < GATE.minScreenshots) reasons.push(`only ${n} screenshots; at least ${GATE.minScreenshots} are needed`);
  if (same < needSame) reasons.push(`same result on ${same} of ${n}; at least ${needSame} needed`);
  if (safer > GATE.maxSafer) reasons.push(`${safer} screenshot(s) gave a SAFER verdict than the real message; 0 allowed`);
  return { n, same, needSame, safer, pass: reasons.length === 0, reasons };
}

// ---- Input ----
const REQUIRED = ['id', 'file', 'channel', 'text'];
function readTruth(dir) {
  const { parseCsv } = require('../../eval/csv.cjs');
  const file = path.join(dir, 'truth.csv');
  if (!fs.existsSync(file)) throw new Error(`No ${path.relative(process.cwd(), file)}. Copy experiments/ocr-real/truth.template.csv there (see README).`);
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const head = rows[0].map(h => h.trim().toLowerCase());
  const missing = REQUIRED.filter(h => !head.includes(h));
  if (missing.length) throw new Error('truth.csv is missing column(s): ' + missing.join(', '));
  const errors = [], seen = new Set(), list = [];
  rows.slice(1).forEach((cells, i) => {
    if (cells.every(c => !String(c).trim())) return;
    const r = Object.fromEntries(head.map((h, k) => [h, String(cells[k] ?? '')]));
    for (const k of Object.keys(r)) if (k !== 'text') r[k] = r[k].trim();
    r.text = r.text.replace(/\r\n?/g, '\n').trim();
    const where = `Row ${i + 2} (${r.id || 'no id'})`;
    if (!r.id) errors.push(where + ': id is empty');
    else if (seen.has(r.id)) errors.push(where + ': id repeats'); else seen.add(r.id);
    if (!r.text) errors.push(where + ': text is empty');
    if (!['text', 'email', 'unknown'].includes(r.channel)) errors.push(where + ': channel must be text, email or unknown');
    const img = path.join(dir, 'images', r.file);
    if (!r.file || !fs.existsSync(img)) errors.push(where + `: image not found at images/${r.file}`);
    else if (!/\.(png|jpe?g)$/i.test(r.file)) errors.push(where + ': only PNG or JPEG (the page accepts nothing else)');
    r.image = img;
    list.push(r);
  });
  if (errors.length) throw new Error('Fix truth.csv first:\n  ' + errors.join('\n  '));
  return list;
}

// ---- OCR through the page's own module ----
async function readAll(rows) {
  const { spawn } = require('node:child_process');
  const { chromium } = require('@playwright/test');
  fs.mkdirSync(OUT, { recursive: true });
  const cacheFile = path.join(OUT, 'ocr.json');
  const cache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const engineKey = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'vendor/tesseract/manifest.json')))
    .update(fs.readFileSync(path.join(root, 'js/ocr.js'))).digest('hex').slice(0, 16);
  const keyOf = r => crypto.createHash('sha256').update(fs.readFileSync(r.image)).digest('hex') + ':' + engineKey;
  const todo = rows.filter(r => !cache[keyOf(r)]);
  console.log(`${rows.length} screenshots; ${todo.length} to read (others cached)`);
  if (todo.length) {
    const server = spawn(process.execPath, [path.join(root, 'scripts/preview-server.cjs')], { stdio: 'ignore' });
    try {
      const url = 'http://127.0.0.1:8381/T4Slvers_CAC/';
      for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
      const exe = arg('chromium', process.env.CHROMIUM_PATH);
      const browser = await chromium.launch(exe ? { executablePath: exe } : {});
      const page = await browser.newPage();
      const outside = [];
      page.on('request', q => { if (!q.url().startsWith('http://127.0.0.1:8381/') && !q.url().startsWith('blob:') && !q.url().startsWith('data:')) outside.push(q.url()); });
      await page.goto(url);
      await page.evaluate(async () => { window.__ocr = await import('./js/ocr.js'); });
      for (const r of todo) {
        const bytes = fs.readFileSync(r.image);
        const type = /\.png$/i.test(r.file) ? 'image/png' : 'image/jpeg';
        const read = await page.evaluate(async ({ b64, type, name }) => {
          const data = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
          const t = performance.now();
          try {
            const res = await window.__ocr.readScreenshot(new File([data], name, { type }));
            return { text: res.text, confidence: res.confidence, ms: Math.round(performance.now() - t) };
          } catch (e) { return { error: String(e && e.message || e), ms: Math.round(performance.now() - t) }; }
        }, { b64: bytes.toString('base64'), type, name: r.file });
        cache[keyOf(r)] = { file: r.file, ...read };
        fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
        console.log(`  read ${r.id} (${read.ms} ms${read.error ? ', ' + read.error : ''})`);
      }
      await browser.close();
      if (outside.length) throw new Error('OCR made requests outside this computer: ' + outside.join(', '));
    } finally { server.kill(); }
  }
  return rows.map(r => ({ ...r, ocr: cache[keyOf(r)] }));
}

// ---- Engine, called as the page calls it ----
function engine(today) {
  const { loadEngine } = require('../../eval/engine.cjs');
  const loaded = loadEngine(root, { today });
  const ctx = vm.createContext({}); ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(root, 'js/engine/normalize.js'), 'utf8'), ctx);
  const policiesCtx = vm.createContext({}); policiesCtx.window = policiesCtx;
  vm.runInContext(fs.readFileSync(path.join(root, 'data/policies.js'), 'utf8'), policiesCtx);
  const run = (text, channel, inputSource) => {
    const r = loaded.engine.analyze(text, loaded.store, { declaredChannel: channel, policies: policiesCtx.TFS_POLICIES, inputSource, today });
    const est = r.evidence.findings.filter(f => f.status === 'established');
    return {
      assessment: r.assessment,
      tier1: [...new Set(est.filter(f => f.tier === 1).map(f => f.ruleId))].sort(),
      tier2: [...new Set(est.filter(f => f.tier === 2).map(f => f.ruleId))].sort()
    };
  };
  return { loaded, run, unwrap: t => ctx.TFS.unwrapLayout(t).text, maxChars: ctx.TFS.MAX_CHARS };
}

function analyzeRows(rows, today) {
  const e = engine(today);
  return { e, rows: rows.map(r => {
    const truthPasted = e.run(r.text, r.channel, 'pasted_text');
    const truthShot = e.run(r.text, r.channel, 'screenshot');
    let ocrShot;
    if (r.ocr.error) ocrShot = { problem: 'read-failed: ' + r.ocr.error };
    else if (!r.ocr.text.trim()) ocrShot = { problem: 'no-text (page says "No text found")' };
    else if (r.ocr.text.length > e.maxChars) ocrShot = { problem: 'too-long (page refuses and asks to crop)' };
    else ocrShot = e.run(r.ocr.text, r.channel, 'screenshot');
    const changes = r.ocr.text ? fieldChanges(r.text, e.unwrap(r.ocr.text)) : {};
    return {
      id: r.id, file: r.file, device: r.device || '', appearance: r.appearance || '', header: r.header || '', channel: r.channel,
      confidence: r.ocr.confidence, ms: r.ocr.ms, text: r.text, ocrText: r.ocr.text || '',
      truthPasted, truthShot, ocrShot,
      main: judge(truthPasted, ocrShot),            // the gate
      ocrOnly: judge(truthShot, ocrShot),           // diagnostic: OCR misreads + extra screen text only
      modeOnly: judge(truthPasted, truthShot),      // diagnostic: screenshot mode on perfect text
      fields: changes, contactsExact: contactsExact(changes),
      hasLink: fields(r.text).links.length > 0, hasPhone: fields(r.text).phones.length > 0
    };
  }) };
}

function report(rows, e, today) {
  const g = gate(rows);
  const count = (f, list = rows) => list.filter(f).length;
  const by = key => Object.entries(rows.reduce((m, r) => ((m[r[key] || '(blank)'] = (m[r[key] || '(blank)'] || 0) + 1), m), {})).map(([k, v]) => `${k} ${v}`).join(', ');
  const short = s => JSON.stringify(String(s).replace(/\s+/g, ' ').slice(0, 140));
  const lines = ['# Real-screenshot check', '',
    `Engine ${e.loaded.engine.version}, reference list ${e.loaded.store.version}, reference date ${today}, organizations with a trusted contact ${e.loaded.reviewedOrgs}.`,
    'OCR text is the raw text the page puts in the message box, before the person corrects it (the worst case).', '',
    `## Gate: ${g.pass ? 'PASSED' : 'NOT PASSED'}`, '',
    `- Same verdict and Tier 1 findings as the real message: **${g.same} of ${g.n}** (needs ${g.needSame}).`,
    `- Safer verdict than the real message: **${g.safer} of ${g.n}** (needs 0).` + (g.safer === 0 && g.n ? ` With 0 of ${g.n}, the safer rate is likely under ${(100 * wilsonHigh(0, g.n)).toFixed(1)}% (95% upper bound).` : ''),
    ...g.reasons.map(x => `- Not passed because: ${x}.`), '',
    '## Other measures', '',
    `- Every link and phone number read exactly: ${count(r => r.contactsExact)} of ${g.n} (${count(r => r.hasLink || r.hasPhone)} contain a link or number).`,
    `- Extra link or number picked up from the screen (sender line, header or misread): ${count(r => Object.values(r.fields).some(c => c.extra.length))} of ${g.n}.`,
    `- Not checked (no text, too long or read failed): ${count(r => r.main.outcome === 'not-checked')}.`,
    `- More cautious than the real message: ${count(r => r.main.outcome === 'more-cautious')}.`,
    `- Diagnostic, OCR alone (typed text vs OCR text, both as screenshots): same ${count(r => r.ocrOnly.same)}, safer ${count(r => r.ocrOnly.safer)}.`,
    `- Diagnostic, screenshot mode alone (typed text as pasted vs as screenshot): same ${count(r => r.modeOnly.same)}, safer ${count(r => r.modeOnly.safer)}.`,
    `- Low OCR confidence (under 60, the page warns): ${count(r => Number.isFinite(r.confidence) && r.confidence < 60)}.`, '',
    '## Mix', '', `- Device: ${by('device')}`, `- Appearance: ${by('appearance')}`, `- Header or sender line kept: ${by('header')}`,
    `- Channel: ${by('channel')}`, `- With a link: ${count(r => r.hasLink)}; with a phone number: ${count(r => r.hasPhone)}`, '',
    '## Every screenshot', '', '| id | device | appearance | real (pasted) | screenshot (OCR) | outcome | contacts exact | confidence |', '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(r => `| ${r.id} | ${r.device} | ${r.appearance} | ${r.truthPasted.assessment} ${r.truthPasted.tier1.join(' ')} | ${r.ocrShot.problem || (r.ocrShot.assessment + ' ' + r.ocrShot.tier1.join(' '))} | ${r.main.outcome}${r.main.note ? ' (' + r.main.note + ')' : ''} | ${r.contactsExact ? 'yes' : 'NO'} | ${Number.isFinite(r.confidence) ? Math.round(r.confidence) : ''} |`),
    '', '## Details for every screenshot that was not the same', ''];
  for (const r of rows.filter(r => !r.main.same)) {
    lines.push(`- **${r.id}** ${r.main.outcome}`, `  - real: ${short(r.text)}`, `  - read: ${short(r.ocrText)}`);
    for (const [k, c] of Object.entries(r.fields)) lines.push(`  - ${k}: lost ${JSON.stringify(c.lost)}, extra ${JSON.stringify(c.extra)}`);
  }
  if (!rows.some(r => !r.main.same)) lines.push('None.');
  lines.push('', '## Limits', '',
    `- ${g.n} screenshots of messages the team sent between its own phones. This checks these screenshots, not real-world OCR accuracy.`,
    '- Raw OCR before correction. In the app the person reviews and fixes the text first, so real use should do at least this well if they check carefully; this script does not measure whether they do.',
    '- The gate was fixed in check.cjs (GATE) before any screenshot was read.');
  return { text: lines.join('\n') + '\n', gate: g };
}

// ---- Self-test of the comparison logic ----
function selfTest() {
  const assert = require('node:assert/strict');
  const S = (a, t = []) => ({ assessment: a, tier1: t });
  const cases = [
    [S('suspicious', ['T1-GIFT']), S('suspicious', ['T1-GIFT']), 'same', true, false],
    [S('suspicious', ['T1-GIFT']), S('insufficient_evidence'), 'SAFER', false, true],
    [S('insufficient_evidence'), S('suspicious', ['T1-CODE']), 'more-cautious', false, false],
    [S('details_match'), S('insufficient_evidence'), 'same', true, false],
    [S('suspicious', ['T1-GIFT', 'T1-CODE']), S('suspicious', ['T1-GIFT']), 'findings-differ', false, false],
    [S('suspicious', ['T1-GIFT']), { problem: 'no-text' }, 'not-checked', false, false]
  ];
  for (const [t, o, outcome, same, safer] of cases) {
    const j = judge(t, o);
    assert.equal(j.outcome, outcome); assert.equal(j.same, same); assert.equal(j.safer, safer);
  }
  const ch = fieldChanges('Pay at chase-secure.com or call 1-888-555-0142', '(866) 555-0199 Pay at chase-secure.corn or call 1-888-555-0142');
  assert.deepEqual(ch.links.lost, ['chase-secure.com']);
  assert.deepEqual(ch.phones.extra, ['8665550199']);
  assert.equal(ch.phones.lost.length, 0);
  assert.equal(contactsExact(ch), false);
  const mk = (same, safer) => ({ main: { same, safer } });
  assert.equal(gate(Array.from({ length: 20 }, (_, i) => mk(i >= 2, false))).pass, true);
  assert.equal(gate(Array.from({ length: 20 }, (_, i) => mk(i >= 3, false))).pass, false);
  assert.equal(gate(Array.from({ length: 20 }, (_, i) => mk(true, i === 0))).pass, false);
  assert.equal(gate(Array.from({ length: 19 }, () => mk(true, false))).pass, false);
  assert.ok(Math.abs(wilsonHigh(0, 20) - 0.161) < 0.001);
  console.log('Self-test passed: 6 comparison cases, contact changes, 4 gate cases, Wilson bound');
}

async function main() {
  if (process.argv.includes('--self-test')) { selfTest(); return 0; }
  const dir = path.resolve(arg('data', path.join(__dirname, 'data')));
  const today = arg('today', new Date().toLocaleDateString('en-CA'));
  let rows;
  try { rows = readTruth(dir); } catch (err) { console.error(err.message); return 2; }
  const read = await readAll(rows);
  const { e, rows: judged } = analyzeRows(read, today);
  const { text, gate: g } = report(judged, e, today);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'report.md'), text);
  fs.writeFileSync(path.join(OUT, 'details.json'), JSON.stringify(judged, null, 1));
  console.log(text.split('\n## Mix')[0]);
  console.log(`Full report: ${path.relative(process.cwd(), path.join(OUT, 'report.md'))}`);
  return g.pass ? 0 : 1;
}

module.exports = { judge, fields, fieldChanges, contactsExact, gate, wilsonHigh, GATE };
if (require.main === module) main().then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 2; });
