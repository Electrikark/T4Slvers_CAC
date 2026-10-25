#!/usr/bin/env node
// Save reproducible local UI views. Run a preview server first; pass its URL and a label.
// Example: node scripts/capture-ui-pass.cjs http://127.0.0.1:8387 after
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const base = process.argv[2] || 'http://127.0.0.1:8387';
const label = process.argv[3] || 'after';
if (!/^[a-z-]+$/.test(label)) throw new Error('Use a lowercase label.');
const out = path.join(__dirname, '../test-results/ui-pass');
const pages = ['help', 'check', 'index', 'learn', 'recover', 'about'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const width of [320, 390, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      for (const name of pages) {
        await page.goto(`${base}/${name}.html`);
        if (name === 'check') await page.locator('#help-paste > summary').click();
        // Full-page captures must include the guide pictures below the fold.
        await page.locator('img').evaluateAll(async images => {
          await Promise.all(images.filter(img => img.getAttribute('src')).map(async img => { img.loading = 'eager'; await img.decode(); }));
        });
        await page.screenshot({ path: path.join(out, `${label}-${name}-${width}.png`), fullPage: true });
        const measure = () => page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
        const normal = await measure();
        await page.addStyleTag({ content: 'html { font-size:36px !important; }' });
        const enlarged = await measure();
        report.push({ page: name, width, normal, enlarged });
        if (width === 320) await page.screenshot({ path: path.join(out, `${label}-${name}-320-text-200.png`), fullPage: true });
      }
      await page.close();
    }
    fs.writeFileSync(path.join(out, `${label}-layout.json`), JSON.stringify(report, null, 2) + '\n');
    console.log(`${label}: saved 24 page views and six enlarged-text views in ${out}`);
    console.log('Horizontal overflow:', report.filter(row => row.normal.content > row.width || row.enlarged.content > row.width));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
