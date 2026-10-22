// Check the actual page contract, including IDs selected by loops and screen maps.
// Unknown lookup expressions fail closed so new syntax cannot silently evade this check.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'check.html'), 'utf8');
const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]));
const required = new Set();
const problems = [];
const strings = text => [...text.matchAll(/['"]([^'"]*)['"]/g)].map(m => m[1]);
const alias = app.match(/const\s+(\w+)\s*=\s*[^;\n]*document\.getElementById\(\w+\)/);
if (!alias) throw new Error('App element lookup helper not found; update the page contract check');

function addTemplate(expression) {
  const template = expression.match(/^`([^`$]*)\$\{\w+\}([^`]*)`$/);
  // The app's channel buttons are generated from its declared channel values.
  const channels = app.match(/const\s+(?:CHANNELS|possibleChannels)\s*=\s*\[([^\]]+)\]/);
  if (!template || template[1] !== 'channel-' || !channels) return false;
  strings(channels[1]).forEach(value => required.add(template[1] + value + template[2]));
  return true;
}

function addExpression(expression) {
  expression = expression.trim();
  if (/^(['"])[^'"]+\1$/.test(expression)) {
    required.add(expression.slice(1, -1));
  } else if (/^\w+\s*===\s*['"][^'"]+['"]\s*\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]+['"]$/.test(expression)) {
    strings(expression).slice(1).forEach(id => required.add(id));
  } else if (addTemplate(expression)) {
    // All declared channels were expanded above.
  } else if (expression === 'id') {
    const loops = [...app.matchAll(/for\s*\(const id of (\[[\s\S]*?\])|\[([^\]]+)\]\.forEach\(id\s*=>/g)];
    if (!loops.length) problems.push('Unresolved ID loop');
    loops.forEach(loop => {
      const values = loop[1] || loop[2];
      strings(values).forEach(id => required.add(id));
      for (const template of values.matchAll(/`[^`]+`/g)) {
        if (!addTemplate(template[0])) problems.push('Unresolved loop template: ' + template[0]);
      }
    });
  } else if (expression === 'targetHeading') {
    const map = app.match(/const headingMap\s*=\s*\{([^}]+)\}/);
    if (map) strings(map[1]).forEach(id => required.add(id));
    else problems.push('Unresolved screen heading map');
  } else if (expression === 'domId') {
    const map = app.match(/const fieldsToFill\s*=\s*\{([^}]+)\}/);
    if (map) {
      for (const field of map[1].matchAll(/(?:^|,)\s*(?:['"]([^'"]+)['"]|(\w+))\s*:/g)) required.add(field[1] || field[2]);
    } else problems.push('Unresolved result field map');
  } else problems.push('Unresolved element lookup: ' + expression);
}

for (const call of app.matchAll(new RegExp('\\b' + alias[1] + '\\(([^)]*)\\)', 'g'))) addExpression(call[1]);
// The helper's own lookup is accounted for by its calls; any direct lookup is checked too.
const withoutHelper = app.replace(alias[0], '');
for (const call of withoutHelper.matchAll(/document\.getElementById\(([^)]*)\)/g)) addExpression(call[1]);
if (!required.size) problems.push('No app element IDs were checked');
for (const id of required) if (!ids.has(id)) problems.push('Missing in check.html: ' + id);
console.log('App element contract: ' + (problems.length ? 'FAIL' : '1/1') + ' (' + required.size + ' IDs checked)');
problems.forEach(problem => console.error(problem));
process.exitCode = problems.length ? 1 : 0;
