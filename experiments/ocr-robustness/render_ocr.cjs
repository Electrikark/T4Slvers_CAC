/* Renders each message as a phone-style text bubble under several screenshot conditions,
   then reads every image back through the app's own OCR path (js/ocr.js readScreenshot, the
   same Tesseract files and settings the page uses). Results are cached in out/ocr.json,
   so analysis can be rerun without OCR.

   Run:  node experiments/ocr-robustness/render_ocr.cjs [--limit 10] [--chromium /path]
   Needs: npm ci (Playwright), and port 8381 free. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');
const { messages, root } = require('./messages.cjs');

const OUT = path.join(__dirname, 'out');
const CACHE = path.join(OUT, 'ocr.json');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : fallback; };

// Screenshot conditions. iOS uses 17px message text; phones capture at 2x or 3x.
const CONDITIONS = {
  light:  { width: 375, font: 17, scale: 3, dark: false, type: 'png' },
  small:  { width: 375, font: 14, scale: 2, dark: false, type: 'png' },
  dark:   { width: 375, font: 17, scale: 3, dark: true,  type: 'png' },
  narrow: { width: 300, font: 17, scale: 3, dark: false, type: 'png' },
  jpeg:   { width: 375, font: 17, scale: 1, dark: false, type: 'jpeg', quality: 55 }
};

const escape = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Links and phone numbers are drawn blue and underlined, as phones do.
const LINKISH = /(https?:\/\/\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|gov|top|xyz|site|info)\S*|\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b1-\d{3}-\d{3}-\d{4}\b)/gi;

function bubbleHtml(text, c) {
  const body = escape(text).replace(LINKISH, m => `<span class="link">${m}</span>`);
  const bg = c.dark ? '#000' : '#fff', bubble = c.dark ? '#262629' : '#e9e9eb', ink = c.dark ? '#fff' : '#000';
  const link = c.dark ? '#5ea8ff' : '#0a62d6';
  return `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:${bg};font-family:"Liberation Sans",Arial,Helvetica,sans-serif}
    .wrap{padding:16px 12px;width:${c.width - 24}px}
    .bubble{display:inline-block;max-width:78%;background:${bubble};color:${ink};font-size:${c.font}px;line-height:1.3;
      padding:8px 12px;border-radius:18px;white-space:pre-wrap;overflow-wrap:anywhere}
    .link{color:${link};text-decoration:underline}
  </style><div class="wrap"><div class="bubble" id="b">${body}</div></div>`;
}

async function waitForServer(url, ms = 10000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('preview server did not start');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const list = messages().slice(0, Number(arg('limit', 1e9)));
  const jobs = [];
  for (const m of list) for (const name of Object.keys(CONDITIONS)) {
    const key = `${m.id}|${name}`;
    if (!cache[key] || cache[key].text !== m.text) jobs.push({ m, name, key });
  }
  console.log(`${list.length} messages x ${Object.keys(CONDITIONS).length} conditions; ${jobs.length} to read`);
  if (!jobs.length) return;

  const server = spawn(process.execPath, [path.join(root, 'scripts/preview-server.cjs')], { stdio: 'ignore' });
  try {
    await waitForServer('http://127.0.0.1:8381/T4Slvers_CAC/');
    const launch = arg('chromium', process.env.CHROMIUM_PATH);
    const browser = await chromium.launch(launch ? { executablePath: launch } : {});
    const app = await browser.newPage();
    await app.goto('http://127.0.0.1:8381/T4Slvers_CAC/');
    await app.evaluate(async () => { window.__ocr = await import('./js/ocr.js'); });
    const pages = {};
    let done = 0;
    const started = Date.now();
    for (const { m, name, key } of jobs) {
      const c = CONDITIONS[name];
      if (!pages[name]) pages[name] = await browser.newPage({ viewport: { width: c.width, height: 800 }, deviceScaleFactor: c.scale });
      const page = pages[name];
      await page.setContent(bubbleHtml(m.text, c));
      const image = await page.locator('.wrap').screenshot(c.type === 'jpeg' ? { type: 'jpeg', quality: c.quality } : { type: 'png' });
      const read = await app.evaluate(async ({ b64, type }) => {
        const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
        const file = new File([bytes], 'shot.' + (type === 'jpeg' ? 'jpg' : 'png'), { type: 'image/' + type });
        const t = performance.now();
        const r = await window.__ocr.readScreenshot(file);
        return { text: r.text, confidence: r.confidence, ms: Math.round(performance.now() - t) };
      }, { b64: image.toString('base64'), type: c.type });
      cache[key] = { id: m.id, condition: name, text: m.text, ocr: read.text, confidence: read.confidence, ms: read.ms, bytes: image.length };
      if (++done % 25 === 0 || done === jobs.length) {
        fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        console.log(`${done}/${jobs.length}  ${Math.round((Date.now() - started) / 1000)}s`);
      }
    }
    // Keep one example image per condition for the write-up.
    for (const [name, c] of Object.entries(CONDITIONS)) {
      const demo = list.find(x => x.id === 'demo-toll') || list[0];
      await pages[name]?.setContent(bubbleHtml(demo.text, c));
      if (pages[name]) await pages[name].locator('.wrap').screenshot({ path: path.join(OUT, `example-${name}.${c.type === 'jpeg' ? 'jpg' : 'png'}`), ...(c.type === 'jpeg' ? { type: 'jpeg', quality: c.quality } : {}) });
    }
    await browser.close();
  } finally {
    server.kill();
  }
}

module.exports = { CONDITIONS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
