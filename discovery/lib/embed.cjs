/* Local sentence embeddings for discovery: an adapter over the vendored model, and a cache.

   The model is the one the help search already ships (vendor/minilm: all-MiniLM-L6-v2, quantized
   ONNX, Transformers.js 4.3.0). That build runs on ONNX Runtime Web, so it runs here in headless
   Chromium through Playwright, exactly as a page would run it. The page loads from a made-up
   origin whose only answers are files inside the model folder; every other request is aborted and
   recorded. Remote models are off and there is no fallback model: if the files are missing or the
   model fails, the caller marks the ML stage unavailable.

   Inputs are never truncated. A candidate longer than the token limit is cut into overlapping
   word-aligned windows that keep their exact offsets, and the page refuses any input over the
   limit instead of letting the tokenizer cut it. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const PREPROCESSING = 'ws-collapse-v1';
const DEFAULTS = Object.freeze({ tokenLimit: 256, overlapTokens: 32, maxWindows: 64 });
const ORIGIN = 'http://discovery.invalid/';
const REQUIRED = ['lib/transformers.min.js', 'lib/ort-wasm-simd-threaded.asyncify.mjs', 'lib/ort-wasm-simd-threaded.asyncify.wasm',
  `models/${MODEL}/config.json`, `models/${MODEL}/tokenizer.json`, `models/${MODEL}/tokenizer_config.json`,
  `models/${MODEL}/special_tokens_map.json`, `models/${MODEL}/onnx/model_quantized.onnx`];
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm' };

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Embedding input only. The original text and its offsets are never changed.
const prepare = text => String(text).replace(/\s+/g, ' ').trim();

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

function modelFingerprint(dir) {
  const missing = REQUIRED.filter(f => !fs.existsSync(path.join(dir, f)));
  if (missing.length) throw new Error(`Local model assets are missing from ${dir}: ${missing.join(', ')}. The ML stage needs the vendored model; nothing is downloaded.`);
  const assets = {};
  for (const file of walk(dir).sort()) assets[path.relative(dir, file).split(path.sep).join('/')] = sha256(fs.readFileSync(file));
  const tok = ['tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json'].map(f => assets[`models/${MODEL}/${f}`]);
  return { assets, assetsDigest: sha256(JSON.stringify(assets)), tokenizerDigest: sha256(tok.join('|')) };
}

function cacheKey(info, config, input) {
  return sha256(JSON.stringify({
    v: 1, model: info.name || MODEL, assets: info.assetsDigest, tokenizer: info.tokenizerDigest, runtime: info.runtime,
    preprocessing: PREPROCESSING, pooling: 'mean', normalize: true, dtype: 'q8', tokenLimit: config.tokenLimit, input
  }));
}

async function createChromiumEmbedder({ root, modelDir = 'vendor/minilm', tokenLimit = DEFAULTS.tokenLimit } = {}) {
  const dir = path.resolve(root, modelDir);
  const fingerprint = modelFingerprint(dir);
  let playwright, playwrightVersion;
  try {
    const paths = [root, path.join(__dirname, '..', '..')];
    playwright = require(require.resolve('@playwright/test', { paths }));
    playwrightVersion = require(require.resolve('@playwright/test/package.json', { paths })).version;
  } catch (err) { throw new Error('Playwright is not installed (run npm ci); the ML stage needs its Chromium.'); }
  const browser = await playwright.chromium.launch();
  const blocked = [];
  try {
    const context = await browser.newContext({ serviceWorkers: 'block', acceptDownloads: false });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url === ORIGIN) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>discovery embeddings</title>' });
      if (url.startsWith(ORIGIN + 'vendor/minilm/')) {
        const file = path.resolve(dir, decodeURIComponent(new URL(url).pathname.slice('/vendor/minilm/'.length)));
        if (file.startsWith(dir + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
          return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        }
      }
      blocked.push(url);
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    await page.goto(ORIGIN);
    const runtime = await page.evaluate(async ({ model }) => {
      const base = location.origin + '/vendor/minilm/';
      const t = await import(base + 'lib/transformers.min.js');
      t.env.allowRemoteModels = false;
      t.env.allowLocalModels = true;
      t.env.localModelPath = '/vendor/minilm/models/';
      t.env.useBrowserCache = false;
      t.env.backends.onnx.wasm.wasmPaths = base + 'lib/';
      t.env.backends.onnx.wasm.numThreads = 1;
      window.__pipe = await t.pipeline('feature-extraction', model, { dtype: 'q8', device: 'wasm' });
      const ort = t.env.backends.onnx;
      return { transformers: t.env.version, onnxruntime: (ort.versions && (ort.versions.web || ort.versions.common)) || null };
    }, { model: MODEL });
    const info = {
      name: MODEL, dtype: 'q8', pooling: 'mean', normalize: true, ...fingerprint,
      runtime: { transformers: runtime.transformers, onnxruntime: runtime.onnxruntime, browser: 'chromium ' + browser.version(), playwright: playwrightVersion }
    };
    return {
      info, blocked, page,
      async countTokens(texts) {
        return page.evaluate(texts => texts.map(t => window.__pipe.tokenizer(t).input_ids.data.length), texts);
      },
      async embed(texts) {
        return page.evaluate(async ({ texts, limit }) => {
          const out = [];
          for (const t of texts) {
            const n = window.__pipe.tokenizer(t).input_ids.data.length;
            if (n > limit) throw new Error(`Input of ${n} tokens exceeds the token limit of ${limit}; window it first.`);
            out.push(Array.from((await window.__pipe(t, { pooling: 'mean', normalize: true })).data));
          }
          return out;
        }, { texts, limit: tokenLimit });
      },
      async close() { await browser.close(); }
    };
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// Code-point-safe middle of [start, end).
function middle(text, start, end) {
  let m = Math.floor((start + end) / 2);
  if (m > start && /[\uDC00-\uDFFF]/.test(text[m]) && /[\uD800-\uDBFF]/.test(text[m - 1])) m--;
  return m;
}

/* Windows for one candidate. countTokens(texts) returns token counts including [CLS]/[SEP].
   Returns { status: 'embedded' | 'windowed' | 'too_long', tokens, windows }. */
async function planWindows(text, start, end, countTokens, config) {
  const { tokenLimit, overlapTokens, maxWindows } = config;
  const [whole] = await countTokens([prepare(text.slice(start, end))]);
  if (whole <= tokenLimit) return { status: 'embedded', tokens: whole, windows: [] };
  const [special] = await countTokens(['']);
  const budget = tokenLimit - special;
  let pieces = [...text.slice(start, end).matchAll(/\S+/g)].map(m => [start + m.index, start + m.index + m[0].length]);
  // A single word over the budget is cut at code points until every piece fits.
  for (let round = 0; round < 40; round++) {
    const counts = await countTokens(pieces.map(([a, b]) => text.slice(a, b)));
    const over = counts.map((c, i) => c - special > budget && pieces[i][1] - pieces[i][0] > 1);
    if (!over.some(Boolean)) { pieces = pieces.map((p, i) => [p[0], p[1], counts[i] - special]); break; }
    pieces = pieces.flatMap((p, i) => over[i] ? [[p[0], middle(text, p[0], p[1])], [middle(text, p[0], p[1]), p[1]]] : [p]);
  }
  const windows = [];
  let i = 0;
  while (i < pieces.length) {
    let j = i, sum = 0;
    while (j < pieces.length && sum + pieces[j][2] <= budget) sum += pieces[j++][2];
    if (j === i) j = i + 1;
    // Word-piece counts add up per word for this tokenizer; the exact count is checked anyway.
    let tokens;
    for (;;) {
      [tokens] = await countTokens([prepare(text.slice(pieces[i][0], pieces[j - 1][1]))]);
      if (tokens <= tokenLimit || j === i + 1) break;
      j--;
    }
    if (tokens > tokenLimit) return { status: 'too_long', tokens: whole, windows: [] };
    const w = { start: pieces[i][0], end: pieces[j - 1][1] };
    windows.push({ ...w, quote: text.slice(w.start, w.end), tokens });
    if (windows.length > maxWindows) return { status: 'too_long', tokens: whole, windows: [] };
    if (j >= pieces.length) break;
    let k = j, overlap = 0;
    while (k - 1 > i && overlap + pieces[k - 1][2] <= overlapTokens) overlap += pieces[--k][2];
    i = Math.max(i + 1, Math.min(k, j - 1));
  }
  return { status: 'windowed', tokens: whole, windows };
}

function readCache(file, key, stats) {
  if (!fs.existsSync(file)) return null;
  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (entry.key === key && Array.isArray(entry.vector) && entry.vector.length === entry.dims && entry.dims > 0 &&
        entry.vector.every(Number.isFinite)) return entry.vector;
  } catch (err) { /* fall through: a damaged entry is recomputed */ }
  stats.rejected++;
  return null;
}

function normalize(v) {
  const n = Math.hypot(...v) || 1;
  return v.map(x => x / n);
}

/* Vectors for every candidate that is not context-only. Sets candidate.embedding in place and
   returns Map(candidateId → vector). Any embedder error propagates: the caller decides the stage. */
async function embedCandidates(candidates, messages, embedder, config, cacheDir, stats) {
  const text = new Map(messages.map(m => [m.messageId, m.text]));
  const vectors = new Map();
  const vectorFor = async input => {
    const key = cacheKey(embedder.info, config, input);
    const file = path.join(cacheDir, key.slice(0, 2), key + '.json');
    const cached = readCache(file, key, stats);
    if (cached) { stats.hits++; return cached; }
    const [v] = await embedder.embed([input]);
    stats.misses++;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ key, dims: v.length, vector: v }), { mode: 0o600 });
    return v;
  };
  for (const c of candidates) {
    if (c.embedding.status === 'context_only') continue;
    const plan = await planWindows(text.get(c.messageId), c.start, c.end, t => embedder.countTokens(t), config);
    c.embedding = { status: plan.status, tokens: plan.tokens, windows: plan.windows };
    if (plan.status === 'too_long') continue;
    const inputs = plan.status === 'embedded' ? [prepare(c.quote)] : plan.windows.map(w => prepare(w.quote));
    const vs = [];
    for (const input of inputs) vs.push(await vectorFor(input));
    vectors.set(c.candidateId, vs.length === 1 ? vs[0] : normalize(vs[0].map((_, d) => vs.reduce((s, v) => s + v[d], 0) / vs.length)));
  }
  return vectors;
}

module.exports = { MODEL, PREPROCESSING, DEFAULTS, prepare, cacheKey, modelFingerprint, planWindows, embedCandidates, createChromiumEmbedder };
