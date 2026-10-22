/* Runs keyword and semantic help search in Chromium, through js/help-search.js exactly as the
   page loads it, and scores them.

   node experiments/help-search/evaluate.cjs dev
     Development: every card example as a query with itself left out, plus dev-challenge.json.
     Use this to tune SETTINGS; it can be run any number of times.
   node experiments/help-search/evaluate.cjs freeze
     Records fingerprints of the cards, the search code and SETTINGS in freeze.json.
   node experiments/help-search/evaluate.cjs test --descriptions <csv> --labels <csv>
     The volunteer test. Runs once; refuses if anything changed since the freeze.

   descriptions CSV: id,volunteer,text      labels CSV: id,accept,all
   (accept: card ids separated by spaces, or "none"; all: "yes" if every listed card is needed) */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');
const { parseCsv } = require('../../eval/csv.cjs');

const root = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const FROZEN = ['js/help-search.js'];
// What search reads from the cards: ids, parents, titles and examples. Step wording is not
// included, so approving or correcting a step after the freeze does not invalidate the test.
function searchContent() {
  const ctx = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'data/help-cards.js'), 'utf8'), ctx);
  const cards = ctx.window.TFS_HELP.cards.map(c => ({ id: c.id, parent: c.parent || null, title: c.title, examples: c.examples || [] }));
  return crypto.createHash('sha256').update(JSON.stringify(cards)).digest('hex');
}

async function withPage(run) {
  const server = spawn(process.execPath, [path.join(root, 'scripts/preview-server.cjs')], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 50; i++) { try { if ((await fetch('http://127.0.0.1:8381/T4Slvers_CAC/')).ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
    const exe = arg('chromium', process.env.CHROMIUM_PATH);
    const browser = await chromium.launch(exe ? { executablePath: exe } : {});
    const page = await browser.newPage();
    const outside = [];
    page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8381/')) outside.push(r.url()); });
    await page.goto('http://127.0.0.1:8381/T4Slvers_CAC/');
    await page.addScriptTag({ url: 'data/help-cards.js' });
    const result = await run(page);
    await browser.close();
    if (outside.length) throw new Error('Requests left the page: ' + outside.join(', '));
    return result;
  } finally { server.kill(); }
}

// queries: [{ id, text, exclude?, accept: [...], all? }]
async function score(page, queries) {
  return page.evaluate(async queries => {
    const h = await import('./js/help-search.js');
    const t0 = performance.now(); await h.loadModel(); const load = performance.now() - t0;
    const t1 = performance.now(); await h.mlSearch('warm up', window.TFS_HELP); const first = performance.now() - t1;
    const rows = [];
    for (const q of queries) {
      const t = performance.now();
      const semantic = await h.mlSearch(q.text, window.TFS_HELP, { exclude: q.exclude });
      const ms = performance.now() - t;
      const keyword = h.keywordSearch(q.text, window.TFS_HELP, { exclude: q.exclude });
      rows.push({ ...q, semantic, keyword, ms });
    }
    return { rows, load, first, settings: h.SETTINGS };
  }, queries);
}

function judge(row, results) {
  const ids = results.map(r => r.id);
  // The "I sent money or paid" topic and its payment-method cards are one tap apart, so either
  // counts for the other (docs/decisions/help-search.md).
  const family = id => (id.startsWith('money') ? 'money' : id);
  const ok = id => row.accept.includes(id) || row.accept.some(a => family(a) === 'money' && family(id) === 'money' && (a === 'money' || id === 'money'));
  if (!row.accept.length) return { first: ids.length === 0, covered: ids.length === 0, confidentWrong: ids.length > 0 };
  const first = ids.length > 0 && ok(ids[0]);
  const covered = row.all
    ? row.accept.every(a => ids.includes(a) || (a.startsWith('money-') && ids.includes('money')))
    : ids.some(ok);
  return { first, covered, confidentWrong: ids.length > 0 && !ids.some(ok) };
}

function report(title, rows) {
  const lines = [`## ${title}`, '', `${rows.length} descriptions.`, ''];
  const kinds = [...new Set(rows.map(r => r.kind || 'all'))];
  lines.push('| Group | n | Keyword first right | ML first right | Keyword covers | ML covers | Keyword confident wrong | ML confident wrong |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const k of kinds.concat(kinds.length > 1 ? ['all'] : [])) {
    const list = k === 'all' ? rows : rows.filter(r => (r.kind || 'all') === k);
    const c = (m, f) => list.filter(r => judge(r, r[m])[f]).length;
    lines.push(`| ${k} | ${list.length} | ${c('keyword', 'first')} | ${c('semantic', 'first')} | ${c('keyword', 'covered')} | ${c('semantic', 'covered')} | ${c('keyword', 'confidentWrong')} | ${c('semantic', 'confidentWrong')} |`);
  }
  const semOnly = rows.filter(r => judge(r, r.semantic).first && !judge(r, r.keyword).first).length;
  const keyOnly = rows.filter(r => !judge(r, r.semantic).first && judge(r, r.keyword).first).length;
  lines.push('', `Paired: ML right and keyword wrong on ${semOnly}; keyword right and ML wrong on ${keyOnly}.`, '');
  return { lines, semOnly, keyOnly };
}

function show(rows, filter) {
  return rows.filter(filter).map(r => `- ${r.id} "${r.text}" accept ${JSON.stringify(r.accept)}: keyword ${JSON.stringify(r.keyword.map(x => x.id))}, semantic ${JSON.stringify(r.semantic.map(x => `${x.id} ${(x.score == null ? 'rule' : x.score.toFixed(2))}`))}`);
}

async function dev() {
  const ctx = { window: {} };
  require('node:vm').runInNewContext(fs.readFileSync(path.join(root, 'data/help-cards.js'), 'utf8'), ctx);
  const help = ctx.window.TFS_HELP;
  const loo = help.cards.flatMap(c => (c.examples || []).map((text, i) => ({ id: `${c.id}#${i}`, kind: 'leave-one-out', text, exclude: text, accept: [c.id] })));
  const challenge = JSON.parse(fs.readFileSync(path.join(__dirname, 'dev-challenge.json'), 'utf8')).rows;
  const out = await withPage(page => score(page, loo.concat(challenge)));
  const rows = out.rows;
  const a = report('Development: card examples, each left out of its own card', rows.filter(r => r.kind === 'leave-one-out'));
  const b = report('Development: challenge set', rows.filter(r => r.kind !== 'leave-one-out'));
  const ms = rows.map(r => r.ms).sort((x, y) => x - y);
  const lines = ['# Help search: development results (not a test)', '',
    `Settings: ${JSON.stringify(out.settings)}. Model load ${Math.round(out.load)} ms; first search ${Math.round(out.first)} ms; ` +
    `later searches median ${Math.round(ms[Math.floor(ms.length / 2)])} ms.`, ''].concat(a.lines, b.lines,
    ['## Challenge rows where either method misses', ''], show(rows.filter(r => r.kind !== 'leave-one-out'), r => !judge(r, r.keyword).first || !judge(r, r.semantic).first),
    ['', '## Leave-one-out misses (semantic)', ''], show(rows.filter(r => r.kind === 'leave-one-out'), r => !judge(r, r.semantic).first));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'dev-report.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

function freeze() {
  const record = { frozenAt: new Date().toISOString(), files: Object.fromEntries(FROZEN.map(f => [f, sha(f)])), searchContent: searchContent() };
  fs.writeFileSync(path.join(__dirname, 'freeze.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record, null, 2));
}

async function test() {
  const freezeFile = path.join(__dirname, 'freeze.json');
  if (!fs.existsSync(freezeFile)) throw new Error('Freeze first: node experiments/help-search/evaluate.cjs freeze');
  const frozen = JSON.parse(fs.readFileSync(freezeFile, 'utf8'));
  for (const f of FROZEN) if (frozen.files[f] !== sha(f)) throw new Error(`${f} changed after the freeze; the test would not be blind.`);
  if (frozen.searchContent !== searchContent()) throw new Error('Card titles or examples changed after the freeze; the test would not be blind.');
  const guard = path.join(OUT, 'test-run.json');
  if (fs.existsSync(guard)) throw new Error('The volunteer test was already run. It counts once.');
  const read = file => { const rows = parseCsv(fs.readFileSync(file, 'utf8')); const h = rows[0].map(x => x.trim().toLowerCase()); return rows.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] || '').trim()]))); };
  const descriptions = read(arg('descriptions')), labels = new Map(read(arg('labels')).map(r => [r.id, r]));
  const queries = descriptions.map(d => {
    const l = labels.get(d.id);
    if (!l) throw new Error('No label for ' + d.id);
    const accept = l.accept.toLowerCase() === 'none' ? [] : l.accept.split(/\s+/).filter(Boolean);
    return { id: d.id, kind: accept.length ? (l.all === 'yes' ? 'multiple' : 'single') : 'none', text: d.text, accept, all: l.all === 'yes' };
  });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(guard, JSON.stringify({ when: new Date().toISOString(), freeze: frozen, n: queries.length }, null, 2) + '\n');
  const out = await withPage(page => score(page, queries));
  const r = report('Volunteer test (blind, run once)', out.rows);
  const noneRows = out.rows.filter(x => !x.accept.length);
  const wrong = m => noneRows.filter(x => judge(x, x[m]).confidentWrong).length;
  const ships = r.semOnly - r.keyOnly >= 5 && wrong('semantic') <= wrong('keyword');
  const lines = ['# Help search: volunteer test', '', `Descriptions: ${queries.length} from ${new Set(descriptions.map(d => d.volunteer)).size} volunteers.`, '']
    .concat(r.lines, [`Decision rule (docs/decisions/help-search.md): semantic-only wins minus keyword-only wins = ${r.semOnly - r.keyOnly} (needs 5 or more); ` +
      `confident wrong on "none" rows: semantic ${wrong('semantic')}, keyword ${wrong('keyword')}. **${ships ? 'Semantic search ships.' : 'Keyword search ships.'}**`, ''],
      ['## Every row', ''], show(out.rows, () => true));
  fs.writeFileSync(path.join(OUT, 'test-report.md'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
}

const mode = process.argv[2];
({ dev, freeze, test }[mode] || (() => { console.error('Use: dev | freeze | test'); process.exit(2); }))()
  ?.catch?.(e => { console.error(e.message || e); process.exit(1); });
