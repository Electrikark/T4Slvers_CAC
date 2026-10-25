#!/usr/bin/env node
/* Makes the pictures for the how-to guides, so they always show this app's real screens.

     node scripts/capture-howto.cjs

   1. Draws the made-up practice screenshot (assets/how-to/practice-screenshot.png). It is not a
      copy of any phone maker's design: a plain bubble, labelled PRACTICE PICTURE.
   2. Opens the real check.html in a phone-sized browser, gives it that picture through the real
      screenshot reader, and photographs the review steps (assets/how-to/review-*.png).

   Pictures of a phone's own apps (Messages, the photo picker) are not made here. Those have to
   be taken on a real phone; see docs/testing/howto-device-check.md.
   Run it again whenever the check page's screenshot review changes, then rebuild the guides. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets/how-to');
const PORT = 8391;
const BASE = `http://127.0.0.1:${PORT}/T4Slvers_CAC/`;

function loadHowto() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/how-to.js'), 'utf8'), sandbox);
  return sandbox.TFS_HOWTO;
}

const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function practicePicture(browser, practice) {
  const page = await browser.newPage({ viewport: { width: 390, height: 300 }, deviceScaleFactor: 2 });
  await page.setContent(`<!doctype html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#fff">
    <div id="shot" style="width:390px;padding:0 0 28px;background:#fff">
      <div style="background:#7a4b00;color:#fff;font-weight:700;font-size:18px;letter-spacing:.5px;padding:12px 16px">${escape(practice.label)}</div>
      <div style="text-align:center;padding:18px 0 6px;font-size:17px;color:#333">Unknown number</div>
      <div style="text-align:center;font-size:14px;color:#666;padding-bottom:14px">Text message</div>
      <div style="margin:0 16px;max-width:290px;background:#e9e9eb;color:#111;border-radius:20px;padding:14px 16px;font-size:21px;line-height:1.35">${escape(practice.text)}</div>
    </div></body></html>`);
  await page.locator('#shot').screenshot({ path: path.join(OUT, 'practice-screenshot.png') });
  await page.close();
}

// The smallest box around several elements, with some room, so a picture shows its context.
async function union(page, selectors, pad = 12) {
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error('Not visible for capture: ' + selector);
    // boundingBox() is measured from the visible screen; full-page clips are measured from the
    // top of the page, so add how far the page has scrolled.
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    boxes.push({ x: box.x + scroll.x, y: box.y + scroll.y, width: box.width, height: box.height });
  }
  const x = Math.max(0, Math.min(...boxes.map(b => b.x)) - pad);
  const y = Math.max(0, Math.min(...boxes.map(b => b.y)) - pad);
  const right = Math.max(...boxes.map(b => b.x + b.width)) + pad;
  const bottom = Math.max(...boxes.map(b => b.y + b.height)) + pad;
  return { x, y, width: Math.min(390, right) - x, height: bottom - y };
}

async function appPictures(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(BASE + 'check.html');
  await page.locator('#channel-text').click();
  await page.locator('#ocr-file').setInputFiles(path.join(OUT, 'practice-screenshot.png'));
  await page.locator('#ocr-confirm').waitFor({ state: 'visible', timeout: 120000 });
  // A thick outline marks the part a step is about. It exists only in these pictures.
  await page.addStyleTag({ content: '.howto-mark { outline:4px solid #c25e00 !important; outline-offset:3px; border-radius:6px; }' });
  const mark = async selector => page.evaluate(s => {
    document.querySelectorAll('.howto-mark').forEach(el => el.classList.remove('howto-mark'));
    if (s) document.querySelector(s).classList.add('howto-mark');
  }, selector);
  // The page scrolls itself to the box after reading; capture from the top of the box.
  await page.evaluate(() => window.scrollTo(0, 0));

  await mark('#message');
  await page.locator('#message').scrollIntoViewIfNeeded();
  await page.evaluate(() => { document.getElementById('message').scrollTop = 0; });
  console.log('Text read from the practice picture:\n' + await page.locator('#message').inputValue());
  await page.screenshot({ path: path.join(OUT, 'review-box.png'), clip: await union(page, ['label[for="message"]', '#message']), fullPage: true });

  await mark('#ocr-clear');
  await page.locator('#ocr-clear').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'review-clear.png'), clip: await union(page, ['#ocr-title', '#ocr-clear']), fullPage: true });

  await page.locator('#ocr-reviewed').check();
  await mark('#ocr-review-label');
  await page.locator('#check-button').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'review-tick.png'), clip: await union(page, ['#ocr-review-label', '#check-button']), fullPage: true });
  await page.close();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const howto = loadHowto();
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts/preview-server.cjs'), '--port', String(PORT)], { stdio: 'ignore' });
  const browser = await chromium.launch();
  try {
    await new Promise(resolve => setTimeout(resolve, 400));
    await practicePicture(browser, howto.practice.screenshot);
    await appPictures(browser);
    console.log('Wrote the how-to pictures in assets/how-to/. Now run: node scripts/build-howto.cjs');
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
