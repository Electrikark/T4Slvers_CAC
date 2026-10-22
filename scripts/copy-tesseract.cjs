'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'vendor/tesseract');
const checking = process.argv.includes('--check');
const modules = path.join(root, 'node_modules');
const packages = ['tesseract.js', 'tesseract.js-core', '@tesseract.js-data/eng'];
const versions = Object.fromEntries(packages.map(name => [name, JSON.parse(fs.readFileSync(path.join(modules, name, 'package.json'))).version]));
const assets = new Map([
  ['tesseract.min.js', 'tesseract.js/dist/tesseract.min.js'],
  ['worker.min.js', 'tesseract.js/dist/worker.min.js'],
  ['LICENSE-tesseract.txt', 'tesseract.js/LICENSE.md'],
  ['LICENSE-core.txt', 'tesseract.js-core/LICENSE'],
  ['tesseract.min.js.LICENSE.txt', 'tesseract.js/dist/tesseract.min.js.LICENSE.txt'],
  ['worker.min.js.LICENSE.txt', 'tesseract.js/dist/worker.min.js.LICENSE.txt'],
  ['lang/eng.traineddata.gz', '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'],
  ['lang/NOTICE.txt', 'docs/ocr/language-notice.txt'],
  ['lang/PACKAGE.json', '@tesseract.js-data/eng/package.json']
]);
for (const name of fs.readdirSync(path.join(modules, 'tesseract.js-core')).sort()) {
  if (/^tesseract-core(?:-[a-z]+)*\.wasm(?:\.js)?$/.test(name)) assets.set('core/' + name, 'tesseract.js-core/' + name);
}
const files = {};
let bytes = 0;
for (const [name, source] of assets) {
  const content = fs.readFileSync(path.join(source.startsWith('docs/') ? root : modules, source));
  bytes += content.length;
  files[name] = { bytes: content.length, sha256: crypto.createHash('sha256').update(content).digest('hex') };
  const output = path.join(target, name);
  if (checking) {
    if (!fs.existsSync(output) || !fs.readFileSync(output).equals(content)) throw new Error('Vendor asset differs: ' + name);
  } else { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, content); }
}
const manifest = JSON.stringify({ versions, language: '4.0.0_best_int/eng', files }, null, 2) + '\n';
const manifestPath = path.join(target, 'manifest.json');
if (checking) {
  if (fs.readFileSync(manifestPath, 'utf8') !== manifest) throw new Error('Vendor manifest differs');
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(dir, item.name)) : [path.relative(target, path.join(dir, item.name))]);
  const expected = new Set([...assets.keys(), 'manifest.json']);
  for (const name of walk(target)) if (!expected.has(name)) throw new Error('Unexpected vendor asset: ' + name);
} else fs.writeFileSync(manifestPath, manifest);
console.log('Tesseract vendor assets: ' + assets.size + ' verified files, ' + (bytes / 1024 / 1024).toFixed(1) + ' MiB');
