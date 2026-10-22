// Parse every script shipped by either page, including app.js, which the engine suite skips.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const scripts = new Set();
// type="module" scripts (the screenshot reader) are checked as modules.
const modules = new Set();
const problems = [];

for (const page of ['index.html', 'tests/run.html']) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const ids = new Set();
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/g)) {
    if (ids.has(match[1])) problems.push(`${page}: repeated element ID ${match[1]}`);
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)) {
    const file = path.resolve(root, path.dirname(page), match[1]);
    scripts.add(file);
    if (/\btype=["']module["']/.test(match[0])) modules.add(file);
  }
}

assert.ok(scripts.size > 0, 'No page scripts found');
for (const file of scripts) {
  try {
    if (modules.has(file)) {
      const run = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(file, 'utf8'), encoding: 'utf8' });
      if (run.status !== 0) throw new Error((run.stderr.match(/SyntaxError[^\n]*/) || [run.stderr.trim()])[0]);
    } else {
      new vm.Script(fs.readFileSync(file, 'utf8'), { filename: path.relative(root, file) });
    }
  } catch (error) {
    problems.push(`${path.relative(root, file)}: ${error.message}`);
  }
}
problems.forEach(problem => console.error(problem));
console.log(`Page scripts and unique IDs: ${problems.length ? 'FAIL' : 'PASS'} (${scripts.size} scripts)`);
process.exitCode = problems.length ? 1 : 0;
