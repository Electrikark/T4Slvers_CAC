// Review page in Chromium, opened from disk: hostile text stays inert, bad files are refused, and
// a review survives export, reload, reset and re-import. Every request the page makes and every
// dialog it opens is recorded; the page must make no request at all.
// Run: node discovery/tests/review-browser.cjs [--screenshots <folder>]
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const { runDiscovery } = require('../lib/run.cjs');
const shared = require('../review/shared.js');
const { fakeEmbedderFactory } = require('./helpers.cjs');

const ROOT = path.join(__dirname, '..', '..');
const PAGE = pathToFileURL(path.join(ROOT, 'discovery/review/index.html')).href;
const SHOTS = (i => i > 0 ? process.argv[i + 1] : null)(process.argv.indexOf('--screenshots'));
const tmp = name => fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-ui-' + name + '-'));

(async () => {
  const work = tmp('work');
  const { out, findings } = await runDiscovery({ root: ROOT, inputs: [path.join(ROOT, 'discovery/fixtures/fictional-dev.csv')], split: 'dev', today: '2026-10-22',
    out: path.join(work, 'report'), cacheDir: path.join(work, 'cache'), quiet: true, embedderFactory: fakeEmbedderFactory() });
  const findingsFile = path.join(out, 'findings.json');
  assert.ok(findings.groups.length > 0, 'the fixture run has groups to inspect');

  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const requests = [], dialogs = [], errors = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    const local = url.startsWith(pathToFileURL(path.join(ROOT, 'discovery/review')).href);
    if (!local) requests.push(url);
    return local ? route.continue() : route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message()); d.type() === 'confirm' ? d.accept() : d.dismiss(); });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const checks = [];
  const step = async (name, fn) => { await fn(); checks.push(name); console.log('PASS ' + name); };
  const banner = () => page.locator('#message').textContent();
  const decisions = () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('discovery-review:'))) || '{"decisions":{}}').decisions);

  try {
    await page.goto(PAGE);

    await step('Malformed, wrong-schema, tampered and oversized files are refused without rendering', async () => {
      const bad = tmp('bad');
      const write = (name, body) => { const f = path.join(bad, name); fs.writeFileSync(f, body); return f; };
      await page.setInputFiles('#load-findings', write('broken.json', '{"schema": '));
      assert.match(await banner(), /not valid JSON/);
      await page.setInputFiles('#load-findings', write('other.json', JSON.stringify({ schema: 'something.else', version: 1 })));
      assert.match(await banner(), /not a valid discovery findings file/);
      const tampered = JSON.parse(fs.readFileSync(findingsFile, 'utf8'));
      tampered.candidates[1].quote = 'Injected quote';
      await page.setInputFiles('#load-findings', write('tampered.json', JSON.stringify(tampered)));
      assert.match(await banner(), /quote does not match the original/);
      const huge = path.join(bad, 'huge.json');
      fs.closeSync(fs.openSync(huge, 'w'));
      fs.truncateSync(huge, 64 * 1024 * 1024 + 1);
      await page.setInputFiles('#load-findings', huge);
      assert.match(await banner(), /limit is 64 MB/);
      assert.equal(await page.locator('#app').isHidden(), true, 'nothing rendered');
    });

    await step('Load the report; demonstration and pending review are shown', async () => {
      await page.setInputFiles('#load-findings', findingsFile);
      assert.match(await banner(), /Loaded run/);
      const info = await page.locator('#run-info').textContent();
      assert.match(info, /Demonstration: no real-data findings/);
      assert.match(info, /Human review: pending/);
    });

    await step('Hostile markup, script, javascript: links and bidi controls render as inert text', async () => {
      await page.selectOption('#filter', 'all');
      await page.locator('.item', { hasText: 'Your parcel is held' }).first().click();
      const box = page.locator('#msg-text');
      assert.match(await box.textContent(), /<img src=x onerror=alert\(1\)><script>alert\(x\)<\/script>/);
      assert.match(await box.textContent(), /<a href="javascript:alert\(2\)">Click here<\/a>/);
      assert.match(await box.textContent(), /⟨U\+202E⟩/);
      const counts = await page.evaluate(() => ({
        img: document.querySelectorAll('main img').length,
        script: document.querySelectorAll('main script').length,
        a: document.querySelectorAll('main a').length,
        iframe: document.querySelectorAll('iframe, object, embed').length,
        handlers: [...document.querySelectorAll('main *')].filter(n => [...n.attributes].some(a => /^on/i.test(a.name))).length
      }));
      assert.deepEqual(counts, { img: 0, script: 0, a: 0, iframe: 0, handlers: 0 });
      assert.deepEqual(dialogs.filter(d => d.startsWith('alert')), []);
    });

    await step('Ungrouped baseline: record an outcome, then freeze the notes', async () => {
      await page.selectOption('#filter', 'baseline');
      await page.locator('.item', { hasText: 'cash in an envelope' }).first().click();
      await page.check('input[name="outcome"][value="missing_concept"]');
      await page.locator('textarea[aria-label^="Evidence"]').fill('Cash handed to a courier at the door; no Tier 1 span overlaps.');
      await page.click('#freeze');
      assert.equal(await page.locator('#freeze').isDisabled(), true);
      assert.match(await page.locator('#counters').textContent(), /frozen at/);
    });

    await step('Grouped view: open a group, see representatives, counts and provisional names', async () => {
      await page.check('input[name="mode"][value="grouped"]');
      const first = page.locator('.group > button').first();
      assert.match(await first.textContent(), /Provisional:/);
      assert.match(await first.textContent(), /families: real 0 · synthetic \d/);
      await first.click();
      assert.ok(await page.locator('.members .badge', { hasText: 'representative' }).count() >= 1);
      await page.locator('.members .item').first().click();
      assert.match(await page.locator('.box.model').textContent(), /not decisions/);
      assert.match(await page.locator('.box.model').textContent(), /not a probability/);
      assert.ok(await page.locator('details summary', { hasText: 'Singletons and outliers' }).count() === 1);
    });

    await step('Edit a candidate from a real text selection; the stored quote is the exact original slice', async () => {
      const c = findings.candidates.find(x => x.quote === 'Also read us the one-time passcode we just sent you.');
      await page.check('input[name="mode"][value="ungrouped"]');
      await page.selectOption('#filter', 'all');
      await page.locator('.item').filter({ has: page.locator('.q', { hasText: /^Also read us the one-time passcode we just sent you\.$/ }) }).click();
      const target = 'read us the one-time passcode';
      await page.evaluate(target => {
        const box = document.getElementById('msg-text');
        const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const i = n.data.indexOf(target);
          if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + target.length); getSelection().removeAllRanges(); getSelection().addRange(r); return; }
        }
        throw new Error('target text not found');
      }, target);
      await page.click('text=Use my selection');
      const text = findings.messages.find(m => m.messageId === c.messageId).text;
      const start = text.indexOf(target);
      assert.equal(await page.locator('input[aria-label="Start offset"]').inputValue(), String(start));
      assert.equal(await page.locator('input[aria-label="End offset"]').inputValue(), String(start + target.length));
      await page.click('text=Save adjusted span');
      await page.check('input[name="outcome"][value="wording_gap"]');
      await page.locator('textarea[aria-label^="Intended rule scope"]').fill('Read-back of a one-time passcode should reach T1-CODE.');
      assert.match(await page.locator('pre.draft').textContent(), /Exact request[\s\S]*read us the one-time passcode/);
      await page.waitForTimeout(400);
      const d = (await decisions())[c.candidateId];
      assert.equal(d.reviewState, 'adjusted');
      assert.equal(d.adjusted.quote, target);
      assert.equal(d.mode, 'ungrouped');
      assert.equal(d.afterFreeze, true);
    });

    let exported;
    await step('Export the review and issue drafts; the export validates against the findings', async () => {
      await page.waitForTimeout(400);
      const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-review')]);
      exported = path.join(tmp('export'), 'review.json');
      await download.saveAs(exported);
      const review = JSON.parse(fs.readFileSync(exported, 'utf8'));
      assert.equal(shared.validateReview(review, findings).ok, true);
      assert.equal(Object.values(review.decisions).filter(d => d.outcome).length, 2);
      assert.equal(review.reviewer, '');
      assert.ok(review.frozenAt && review.baseline && Object.keys(review.baseline.decisions).length === 1);
      assert.ok(review.firstGroupedAt > review.frozenAt);
      const [drafts] = await Promise.all([page.waitForEvent('download'), page.click('#export-drafts')]);
      const md = path.join(tmp('export'), 'drafts.md');
      await drafts.saveAs(md);
      assert.match(fs.readFileSync(md, 'utf8'), /Possible missing risk concept[\s\S]*Wording gap in an existing rule|Wording gap in an existing rule[\s\S]*Possible missing risk concept/);
    });

    await step('Reload keeps decisions in this browser; reset clears them; import restores them', async () => {
      await page.reload();
      await page.setInputFiles('#load-findings', findingsFile);
      assert.match(await banner(), /Restored 2 decision/);
      await page.selectOption('#filter', 'decided');
      assert.equal(await page.locator('.list .item').count(), 2);
      await page.click('#reset');
      assert.match(await banner(), /reset/);
      assert.deepEqual(await decisions(), {});
      await page.reload();
      await page.setInputFiles('#load-findings', findingsFile);
      assert.doesNotMatch(await banner(), /Restored/);
      await page.setInputFiles('#load-review', exported);
      assert.match(await banner(), /Imported 2 decision/);
      await page.selectOption('#filter', 'decided');
      assert.equal(await page.locator('.list .item').count(), 2);
      if (SHOTS) {
        await page.locator('.item').first().click();
        fs.mkdirSync(SHOTS, { recursive: true });
        await page.screenshot({ path: path.join(SHOTS, 'review-ungrouped.png'), fullPage: false });
        await page.check('input[name="mode"][value="grouped"]');
        await page.locator('.group > button').first().click();
        await page.screenshot({ path: path.join(SHOTS, 'review-grouped.png'), fullPage: false });
      }
    });

    await step('No network request, no script error, and only the expected confirm dialogs', async () => {
      assert.deepEqual(requests, []);
      assert.deepEqual(errors, []);
      assert.ok(dialogs.every(d => d.startsWith('confirm')), dialogs.join('\n'));
    });
  } catch (err) {
    console.log('FAIL ' + (err.stack || err).toString().split('\n').slice(0, 8).join('\n  '));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
  console.log(`Review page: ${checks.length}/9 passed`);
  if (checks.length !== 9) process.exitCode = 1;
})();
