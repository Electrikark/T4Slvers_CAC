// The how-to guides: the "checked on a phone" record cannot be faked or half-filled, every
// button a guide quotes is really on check.html, and the pages say only what was checked.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const build = require('../scripts/build-howto.cjs');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const data = build.load();
const help = read('help.html');
const check = read('check.html');
const TODAY = '2026-10-25';
let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('  ok   ' + name); };
const clone = value => JSON.parse(JSON.stringify(value));
const firstPhone = d => d.guides.find(g => g.kind === 'phone');
const good = { by: 'Naman Raichura', on: '2026-10-25', phone: 'iPhone 13', system: 'iOS 26.0.1', app: 'Messages' };

console.log('How-to guides');

ok('every phone device in the shipped data is unchecked or fully checked', () => {
  const devices = [...data.guides.filter(g => g.kind === 'phone').flatMap(g => g.devices), ...data.practice.screenshot.devices];
  assert.ok(devices.length >= 10);
  for (const dev of devices) {
    const problem = build.checkProblem(dev, TODAY);
    assert.ok(problem === null || problem === 'not checked', `${dev.id}: ${problem}`);
  }
});

ok('a complete record counts as checked', () => {
  assert.equal(build.checkProblem({ app: 'Messages', checked: good }, TODAY), null);
});

ok('each missing or blank field refuses the record', () => {
  for (const field of build.CHECK_FIELDS) {
    const record = { ...good };
    delete record[field];
    assert.match(build.checkProblem({ app: 'Messages', checked: record }, TODAY), new RegExp(field));
    assert.match(build.checkProblem({ app: 'Messages', checked: { ...good, [field]: '   ' } }, TODAY), new RegExp(field));
  }
});

ok('placeholder names and values are refused', () => {
  for (const by of ['TODO', 'TBD', 'REVIEWER_NAME', 'name', 'xxx', 'Placeholder person', '?']) {
    assert.ok(build.checkProblem({ app: 'Messages', checked: { ...good, by } }, TODAY), by);
  }
});

ok('dates must be real and not in the future', () => {
  for (const on of ['2026-02-30', '10/25/2026', '2026-10-26', 'yesterday']) {
    assert.ok(build.checkProblem({ app: 'Messages', checked: { ...good, on } }, TODAY), on);
  }
});

ok('a record must name the app the steps are written for', () => {
  assert.match(build.checkProblem({ app: 'Messages', checked: { ...good, app: 'WhatsApp' } }, TODAY), /Messages/);
  assert.equal(build.checkProblem({ app: 'Messages', checked: { ...good, app: 'Messages 26.0' } }, TODAY), null);
});

ok('a half-filled record stops the build instead of being shown as unchecked', () => {
  const broken = clone(data);
  firstPhone(broken).devices[0].checked = { by: 'Naman Raichura' };
  assert.throws(() => build.render({ help, check, data: broken, today: TODAY }), /missing on/);
});

ok('a checked device says which one phone was checked, and the count goes up', () => {
  const done = clone(data);
  firstPhone(done).devices[0].checked = good;
  const out = build.render({ help, check, data: done, today: TODAY });
  assert.match(out.help, /Checked on one iPhone 13, iOS 26\.0\.1, Messages, on October 25, 2026\. Other phones and versions may look different\./);
  const before = build.counts(data, TODAY), after = build.counts(done, TODAY);
  assert.equal(after.checked, before.checked + 1);
  assert.match(out.help, new RegExp(`${after.checked} of ${after.total} phone guides have been checked`));
});

ok('the shipped pages claim no phone check', () => {
  const { checked } = build.counts(data, TODAY);
  assert.equal(checked, 0, 'Update this test only after a real phone check is recorded in data/how-to.js');
  assert.doesNotMatch(help + check, /class="howto-checked"/);
});

ok('every unchecked phone guide says so, and both checker routes lead to those guides', () => {
  const devices = data.guides.filter(g => g.kind === 'phone').flatMap(g => g.devices.map(d => [g, d]));
  for (const [guide, dev] of devices) {
    const helpBlock = help.split(`id="${guide.id}-${dev.id}"`)[1].split('</section>')[0];
    assert.match(helpBlock, /Not yet checked on a phone/, `${guide.id}-${dev.id}`);
    if (guide.inline) {
      const route = guide.inline === 'paste' ? 'text-and-email' : 'screenshots';
      assert.ok(check.includes(`href="help.html#${route}"`), `route for ${guide.id}`);
      assert.ok(help.includes(`id="${route}"`), `destination for ${guide.id}`);
    }
  }
});

ok('a label quoted by a guide but missing from check.html stops the build', () => {
  const broken = clone(data);
  broken.guides.find(g => g.id === 'review-screenshot').uiLabels.push('Tap the magic button');
  assert.throws(() => build.render({ help, check, data: broken, today: TODAY }), /Tap the magic button/);
  // A label hidden in a comment or attribute is not on the screen.
  // Removing the real button must fail even though the generated help still quotes its label.
  const noButton = check.replace('>Or use a screenshot</button>', '><!-- Or use a screenshot --></button>');
  assert.notEqual(noButton, check);
  const quotedOnlyInHelp = noButton.replace('<!-- howto-paste:end -->', '<p>“Or use a screenshot”</p><!-- howto-paste:end -->');
  assert.throws(() => build.render({ help, check: quotedOnlyInHelp, data, today: TODAY }), /Or use a screenshot/);
});

ok('every quoted label in a step is a real label, a phone menu word, or a guide title', () => {
  // Phone menu words come from the phone, not this app; they are the steps a phone check covers.
  const phoneWords = new Set(['Copy', 'Copy text', 'Select All', 'Select all', 'Paste', 'Photo Library', 'Save to Photos', 'Add to Photos', 'Download image']);
  const titles = new Set(data.guides.map(g => g.title));
  const visible = check.replace(/<!-- howto-(paste|screenshot):start[\s\S]*?<!-- howto-\1:end -->/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const guide of data.guides) {
    const steps = guide.kind === 'app' ? guide.steps : guide.devices.flatMap(d => d.steps);
    for (const step of steps) {
      for (const [, quoted] of step.text.matchAll(/“([^”]+)”/g)) {
        const label = quoted.replace(/[.,]$/, '');
        assert.ok(phoneWords.has(label) || titles.has(label) || visible.includes(label) || ['not', 'never'].includes(label), `${guide.id}: “${quoted}”`);
      }
    }
  }
});

ok('the screenshot guide matches what the app does with screenshot text', () => {
  // The tip says a screenshot check never says Details Match; the engine must agree.
  const tip = data.guides.find(g => g.id === 'review-screenshot').tips.join(' ');
  assert.match(tip, /never says the details match/);
  const aggregate = read('js/engine/aggregate.js');
  assert.match(aggregate, /inputSource === 'screenshot'\) checks\.push\(\{ status: 'UNKNOWN', code: 'ocr_text_unverified' \}\)/);
  const ocrUi = read('js/ocr-ui.js');
  assert.match(ocrUi, /check\.disabled = busy \|\| \(form\.dataset\.inputSource === 'screenshot' && !reviewed\.checked\)/, 'Check stays locked until the review box is ticked');
  assert.match(ocrUi, /if \(form\.dataset\.inputSource === 'screenshot'\) reviewed\.checked = false;/, 'Editing unticks the review box');
});

ok('the guides never use pressure or false ease, and every picture has alt text', () => {
  const text = JSON.stringify(data);
  assert.doesNotMatch(text, /\b(?:simply|just|easy|quickly copy|hurry)\b/i);
  for (const [key, picture] of Object.entries(data.pictures)) {
    assert.ok(picture.alt && picture.alt.length > 30, key);
    assert.ok(fs.existsSync(path.join(root, picture.file)), picture.file);
  }
  for (const match of (help + check).matchAll(/<img\b[^>]*>/g)) {
    assert.match(match[0], /\balt="[^"]*"/, match[0]);
  }
});

ok('both screenshot-button safety notes are on the page', () => {
  assert.match(help, /Holding them down can start an emergency call/);
  assert.match(help, /Press on the words, not on a link/);
});

ok('practice is made up and labelled, and the practice box never runs the checker', () => {
  assert.match(data.practice.paste, /^PRACTICE MESSAGE:/);
  const script = read('js/howto.js');
  assert.doesNotMatch(script, /TfsEngine|analyze|localStorage|sessionStorage|fetch\(|XMLHttpRequest|cookie/);
  assert.doesNotMatch(help, /<script[^>]*src="js\/engine/);
});

console.log(`How-to guides: ${passed} passed`);
