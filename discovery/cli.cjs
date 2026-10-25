#!/usr/bin/env node
/* npm run discovery -- --input <eligible-source> [--input …] --split dev --today <YYYY-MM-DD> --out <folder>
     [--cutoff 0.35] [--token-limit 256] [--cache <folder>] [--no-ml]
   Exit 0: report written (the ML stage may still be unavailable; the report says so).
   Exit 2: refused (data boundary, options) or failed before writing. */
'use strict';
const path = require('node:path');
const { runDiscovery, Refusal, DEFAULT_CUTOFF } = require('./lib/run.cjs');

function parse(argv) {
  const o = { inputs: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    const take = () => { if (v === undefined || v.startsWith('--')) throw new Refusal(`${a} needs a value`); i++; return v; };
    if (a === '--input') o.inputs.push(take());
    else if (a === '--split') o.split = take();
    else if (a === '--today') o.today = take();
    else if (a === '--out') o.out = take();
    else if (a === '--cutoff') o.cutoff = Number(take());
    else if (a === '--token-limit') o.tokenLimit = Number(take());
    else if (a === '--cache') o.cacheDir = take();
    else if (a === '--no-ml') o.ml = false;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Refusal(`Unknown option ${a}`);
  }
  return o;
}

(async () => {
  let o;
  try { o = parse(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exitCode = 2; return; }
  if (o.help) {
    console.log('npm run discovery -- --input <eligible-source> --split dev --today <YYYY-MM-DD> --out <folder> [--cutoff ' + DEFAULT_CUTOFF + '] [--token-limit 256] [--cache <folder>] [--no-ml]\nSee discovery/README.md.');
    return;
  }
  if (!o.today) { console.error('--today is required: pass the reference date explicitly (YYYY-MM-DD).'); process.exitCode = 2; return; }
  try {
    const r = await runDiscovery({ ...o, root: path.join(__dirname, '..') });
    process.exitCode = r.ok ? 0 : 1;
  } catch (err) {
    console.error(err instanceof Refusal ? 'Refused: ' + err.message : 'Failed: ' + (err.stack || err));
    process.exitCode = 2;
  }
})();
