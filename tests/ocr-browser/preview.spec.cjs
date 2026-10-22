const { test, expect } = require('@playwright/test');
const { storeFor } = require('../reporting-scope/setup.js');
const URL_PATH = '/T4Slvers_CAC/';

async function open(page) {
  await page.goto(URL_PATH);
  await expect(page.locator('#ocr-button')).toBeVisible();
  await page.evaluate(() => {
    window.analysisCalls = 0;
    const analyze = window.TfsEngine.analyze;
    window.TfsEngine.analyze = (...args) => { window.analysisCalls++; return analyze(...args); };
  });
}
async function picture(page, { text = ['Chase: Buy gift cards to pay the fee.', 'Send the gift card codes today.'], jpeg = false, dark = false } = {}) {
  const base64 = await page.evaluate(({ text, jpeg, dark }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1100; canvas.height = 230;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = dark ? '#151515' : '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = dark ? '#fff' : '#111'; ctx.font = '36px Arial';
    text.forEach((line, i) => ctx.fillText(line, 32, 70 + i * 60));
    return canvas.toDataURL(jpeg ? 'image/jpeg' : 'image/png').split(',')[1];
  }, { text, jpeg, dark });
  return { name: jpeg ? 'synthetic-message.jpg' : 'synthetic-message.png', mimeType: jpeg ? 'image/jpeg' : 'image/png', buffer: Buffer.from(base64, 'base64') };
}
async function upload(page, file) {
  await page.locator('#ocr-file').setInputFiles(file);
  await expect(page.locator('#ocr-status')).toContainText('Text is ready to review', { timeout: 110000 });
}
async function mockReader(page) {
  await page.route('**/js/ocr.js', route => route.fulfill({ contentType: 'text/javascript', body: `
    let stop;
    export function cancelRecognition() { if (stop) { stop(new Error('cancelled')); stop = null; } }
    export async function readScreenshot(file) {
      if (file.name === 'error.png') throw new Error('decode-failed');
      if (file.name === 'empty.png') return {text:'', confidence:99};
      if (file.name === 'long.png') return {text:'x'.repeat(window.TFS.MAX_CHARS + 1), confidence:99};
      if (file.name === 'slow.png') return new Promise((resolve, reject) => {
        stop = reject; setTimeout(() => resolve({text:'Late stale output', confidence:99}), 250);
      });
      return {text:'Never send codes.\\r\\nChase: Send your code.\\n\\nVisit https://chase.com\\nfor help.', confidence:20};
    }
  ` }));
}
const dummy = name => ({ name, mimeType: 'image/png', buffer: Buffer.from('synthetic fixture') });

test('page explains screenshot limits and keeps next steps ahead of full evidence', async ({ page }) => {
  await open(page);
  const about = page.locator('details.demo-tools').filter({ hasText: 'What the results mean' });
  await about.locator('summary').click();
  await expect(about).toContainText('Screenshot text cannot produce Details Match, even after your review.');
  await expect(about).not.toContainText('does not open links, read screenshots');
  await page.locator('#channel-text').click();
  await page.locator('#message').fill('Maria, buy me gift cards for my birthday and text me the codes.');
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('Suspicious');
  await expect(page.locator('#next-list')).toBeVisible();
  await expect(page.locator('#checks')).toBeHidden();
  expect(await page.locator('#next-list').evaluate(node => Boolean(
    node.compareDocumentPosition(document.getElementById('evidence-details')) & Node.DOCUMENT_POSITION_FOLLOWING
  ))).toBe(true);
  await page.locator('#evidence-details > summary').click();
  await expect(page.locator('#checks')).toBeVisible();
  await page.locator('#back').click();
  await page.locator('#check-button').click();
  await expect(page.locator('#checks')).toBeHidden();
});

test('paste stays lazy and follows the existing Check path', async ({ page }) => {
  const vendor = [];
  page.on('request', request => { if (request.url().includes('/vendor/')) vendor.push(request.url()); });
  await open(page);
  await page.locator('#channel-text').click();
  await page.locator('#message').fill('Chase: Buy gift cards to pay the fee.');
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('Suspicious');
  await expect(page.locator('#ocr-result-note')).toBeHidden();
  expect(vendor).toEqual([]);
  expect(await page.evaluate(() => window.analysisCalls)).toBe(1);
});

test('real cold and warm OCR uses only local assets, requires review, and never auto-checks', async ({ page, context }) => {
  const outside = [], requests = [], errors = [];
  await context.route('**/*', route => {
    const request = route.request();
    requests.push(request.url());
    if (new URL(request.url()).origin !== 'http://127.0.0.1:8381') { outside.push(request.url()); return route.abort(); }
    return route.continue();
  });
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const file = await picture(page);
  await page.locator('#channel-text').click();
  await upload(page, file);
  expect(await page.locator('#message').inputValue()).toMatch(/gift cards/i);
  expect(await page.evaluate(() => window.analysisCalls)).toBe(0);
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#check-button')).toBeDisabled();
  await expect(page.locator('#ocr-raw')).toHaveText(await page.locator('#message').inputValue());
  const count = await page.locator('#message').inputValue();
  await expect(page.locator('#character-count')).toContainText(String(count.length));
  await page.locator('#ocr-reviewed').check();
  await page.locator('#message').press('End');
  await page.locator('#message').press('Space');
  await expect(page.locator('#ocr-reviewed')).not.toBeChecked();
  await expect(page.locator('#check-button')).toBeDisabled();
  await page.locator('#ocr-reviewed').check();
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('Suspicious');
  await expect(page.locator('#ocr-result-note')).toBeVisible();
  await expect(page.locator('#checks')).toContainText('read from an image');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('result-title');
  for (const part of ['tesseract.min.js', 'worker.min.js', '/core/', '/lang/eng.traineddata.gz']) expect(requests.some(url => url.includes(part))).toBe(true);
  const downloads = requests.filter(url => url.includes('/vendor/')).length;
  await page.locator('#back').click();
  await context.setOffline(true);
  await upload(page, file);
  await context.setOffline(false);
  expect(requests.filter(url => url.includes('/vendor/')).length).toBe(downloads);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/ocr-mobile-preview.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('real JPEG reading cannot produce Details Match even with a fictional reviewed contact', async ({ page }) => {
  await open(page);
  await page.evaluate(store => { window.TFS_STORE = store; }, storeFor('approved'));
  const file = await picture(page, { jpeg: true, text: ['Chase: Your statement is ready.', 'Visit https://chase.com'] });
  await page.locator('#channel-text').click();
  await upload(page, file);
  await page.locator('#ocr-reviewed').check();
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('Insufficient Evidence');
  await expect(page.locator('#checks')).toContainText('cannot establish a contact-details match');
});

test('a dark screenshot also reads through the image-element decode fallback', async ({ page }) => {
  await open(page);
  const file = await picture(page, { dark: true });
  await page.evaluate(() => { window.createImageBitmap = undefined; });
  await upload(page, file);
  await expect(page.locator('#message')).toHaveValue(/gift cards/i);
});

test('a failed core load terminates startup and permits a real retry', async ({ page }) => {
  await open(page);
  const file = await picture(page);
  await page.route('**/core/*.wasm.js', route => route.abort());
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles(file);
  await expect(page.locator('#ocr-status')).toContainText('Could not read', { timeout: 15000 });
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  await page.unroute('**/core/*.wasm.js');
  await upload(page, file);
  await expect(page.locator('#message')).toHaveValue(/gift cards/i);
});

test('raw line breaks, low confidence, errors, empty and long reads preserve the user text', async ({ page }) => {
  await mockReader(page); await open(page);
  await page.locator('#message').fill('Original user text');
  for (const name of ['error.png', 'empty.png', 'long.png']) {
    await page.locator('#ocr-file').setInputFiles(dummy(name));
    await expect(page.locator('#ocr-status')).toContainText(/paste/);
    await expect(page.locator('#message')).toHaveValue('Original user text');
    await expect(page.locator('#check-button')).toBeEnabled();
  }
  await upload(page, dummy('low.png'));
  const expected = 'Never send codes.\nChase: Send your code.\n\nVisit https://chase.com\nfor help.';
  // A textarea presents CRLF as LF; the raw read-only view retains the OCR string.
  await expect(page.locator('#message')).toHaveValue(expected);
  expect(await page.locator('#ocr-raw').textContent()).toBe(expected.replace('codes.\n', 'codes.\r\n'));
  await expect(page.locator('#ocr-warning')).toBeVisible();
  expect(await page.evaluate(() => window.analysisCalls)).toBe(0);
  await page.evaluate(() => document.getElementById('submission-form').requestSubmit());
  expect(await page.evaluate(() => window.analysisCalls)).toBe(0);
  await page.locator('#ocr-clear').click();
  await expect(page.locator('#message')).toHaveValue('');
  await expect(page.locator('#ocr-confirm')).toBeHidden();
  await expect(page.locator('#check-button')).toBeEnabled();
  expect(await page.locator('#ocr-image').getAttribute('src')).toBeNull();
});

test('cancel and reset discard stale reads and release image preview state', async ({ page }) => {
  await mockReader(page); await open(page);
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles(dummy('slow.png'));
  await expect(page.locator('#message')).toHaveAttribute('readonly', '');
  await page.locator('#ocr-cancel').click();
  await page.waitForTimeout(350);
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  await expect(page.locator('#message')).not.toHaveAttribute('readonly');
  await upload(page, dummy('low.png'));
  await page.evaluate(() => document.getElementById('submission-form').reset());
  await expect(page.locator('#message')).toHaveValue('');
  await expect(page.locator('#ocr-confirm')).toBeHidden();
  await page.locator('#ocr-file').setInputFiles(dummy('slow.png'));
  await page.evaluate(() => document.getElementById('submission-form').reset());
  await page.waitForTimeout(350);
  await expect(page.locator('#message')).toHaveValue('');
  await expect(page.locator('#check-button')).toBeEnabled();
  expect(await page.evaluate(() => window.analysisCalls)).toBe(0);
});

test('a failed library load can retry the real OCR without reloading the page', async ({ page }) => {
  await open(page);
  const file = await picture(page);
  await page.route('**/vendor/tesseract/tesseract.min.js', route => route.abort());
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles(file);
  await expect(page.locator('#ocr-status')).toContainText('Could not read');
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  await page.unroute('**/vendor/tesseract/tesseract.min.js');
  await upload(page, file);
  await expect(page.locator('#message')).toHaveValue(/gift cards/i);
});

test('read timeout terminates the worker and leaves retry available', async ({ page }) => {
  await open(page);
  const file = await picture(page);
  await page.clock.install();
  await page.evaluate(() => {
    window.fakeStarted = false; window.fakeTerminated = false;
    window.Tesseract = { createWorker: async () => ({
      recognize: () => { window.fakeStarted = true; return new Promise(() => {}); },
      terminate: async () => { window.fakeTerminated = true; }
    }) };
  });
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles(file);
  await expect.poll(() => page.evaluate(() => window.fakeStarted)).toBe(true);
  await page.clock.fastForward(120001);
  await expect(page.locator('#ocr-status')).toContainText('Reading took too long');
  expect(await page.evaluate(() => window.fakeTerminated)).toBe(true);
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  await expect(page.locator('#ocr-button')).toBeEnabled();
  await page.evaluate(() => {
    window.Tesseract.createWorker = async () => ({ recognize: async () => ({ data: { text: 'Retry text', confidence: 99 } }), terminate: async () => {} });
  });
  await upload(page, file);
  await expect(page.locator('#message')).toHaveValue('Retry text');
});

test('cancelling a real worker during startup terminates it before language loading finishes', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.liveWorkers = 0;
    window.Worker = class extends Native {
      constructor(...args) { super(...args); window.liveWorkers++; this.stopped = false; }
      terminate() { if (!this.stopped) { window.liveWorkers--; this.stopped = true; } return super.terminate(); }
    };
    window.expectedWorkerClass = window.Worker;
  });
  let languageRequested = false;
  await page.route('**/lang/eng.traineddata.gz', route => { languageRequested = true; return new Promise(resolve => setTimeout(() => route.abort().then(resolve).catch(resolve), 500)); });
  await open(page);
  const file = await picture(page);
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles(file);
  await expect.poll(() => languageRequested).toBe(true);
  expect(await page.evaluate(() => window.liveWorkers)).toBe(1);
  expect(await page.evaluate(() => window.Worker === window.expectedWorkerClass)).toBe(true);
  await page.locator('#ocr-cancel').click();
  await expect.poll(() => page.evaluate(() => window.liveWorkers)).toBe(0);
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  await expect(page.locator('#ocr-button')).toBeEnabled();
});

test('invalid formats, image limits, root path and private-path isolation', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('#ocr-button')).toBeVisible();
  for (const resource of ['.git/config', 'node_modules/tesseract.js/package.json', 'eval/data/messages.csv']) {
    expect((await request.get(URL_PATH + resource)).status()).toBe(404);
  }
  await page.locator('#message').fill('Keep this text');
  await page.locator('#ocr-file').setInputFiles({ name: 'file.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>') });
  await expect(page.locator('#ocr-status')).toContainText('Choose a PNG or JPEG');
  const huge = Buffer.alloc(24);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(huge); huge.writeUInt32BE(100000,16); huge.writeUInt32BE(100000,20);
  await page.locator('#ocr-file').setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: huge });
  await expect(page.locator('#ocr-status')).toContainText('image is too large');
  await expect(page.locator('#message')).toHaveValue('Keep this text');
  expect(await page.evaluate(() => Boolean(window.Tesseract))).toBe(false);
});
