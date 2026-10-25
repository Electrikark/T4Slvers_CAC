'use strict';
const crypto = require('node:crypto');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// A deterministic stand-in for the model: hashed words, normalized. Counts a token per word plus
// [CLS]/[SEP]. Used where a test is about the pipeline, not about the model.
function fakeEmbedderFactory(log = { embedded: [], counted: [] }, options = {}) {
  return async () => ({
    info: { name: 'fake-hash-64', assetsDigest: 'fake', tokenizerDigest: 'fake', assets: {}, runtime: { transformers: 'none', onnxruntime: 'none', browser: 'none' } },
    blocked: [],
    async countTokens(texts) { log.counted.push(...texts); return texts.map(t => (t.match(/\S+/g) || []).length + 2); },
    async embed(texts) {
      log.embedded.push(...texts);
      if (options.failAfter != null && log.embedded.length > options.failAfter) throw new Error('injected inference failure');
      return texts.map(t => {
        const v = new Array(64).fill(0);
        for (const w of t.toLowerCase().match(/[a-z]+/g) || []) v[parseInt(sha(w).slice(0, 4), 16) % 64] += 1;
        const n = Math.hypot(...v) || 1;
        return v.map(x => Math.fround(x / n));
      });
    },
    async close() {}
  });
}

module.exports = { fakeEmbedderFactory };
