// The learn page: written from data/scam-guide.js, every guide example warned about by the
// checker, and every message and answer readable without JavaScript.
// A match between page and data says the page shows what the data says. It does not say the
// advice is right; that is the human review recorded in data/scam-guide.js (approvedBy).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { render, loadGuide, block, OWN_ADVICE } = require('../scripts/build-learn.cjs');
const { loadEngine } = require('../eval/engine.cjs');

const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const page = read('learn.html');
const guide = loadGuide();
const engine = loadEngine();
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS ' + name); };
const warned = result => result.assessment === 'suspicious' || result.requestRisk.level === 'high';

function helpCards() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(read('data/help-cards.js'), sandbox);
  return sandbox.TFS_HELP;
}

test('learn.html is exactly what data/scam-guide.js produces', () => {
  assert.equal(render(page, guide), page, 'run node scripts/build-learn.cjs');
});

test('A change to the data is caught', () => {
  const changed = JSON.parse(JSON.stringify(guide));
  changed.scams[0].steps[0].text += ' (edited)';
  assert.notEqual(render(page, changed), page);
});

test('The four warning signs the guide links to are on the page', () => {
  for (const n of Object.keys(guide.signs)) assert.match(page, new RegExp(`<article id="sign-${n}" class="lesson-card">`));
  for (const s of guide.scams) for (const n of s.signs) assert.ok(guide.signs[n], s.id + ' sign ' + n);
});

test('Every guide example gets a warning from the checker, on the channel it names', () => {
  for (const s of guide.scams) {
    const result = engine.analyze(s.example.text, s.example.channel);
    assert.ok(warned(result), `${s.id}: ${result.assessment} / ${result.requestRisk.level}`);
  }
});

test('The old practice link still loads the same grandchild message', () => {
  const family = guide.scams.find(s => s.id === 'family');
  assert.equal(family.example.text, 'Grandma, please buy 3 Apple gift cards and send me the codes.');
  assert.equal(family.example.channel, 'text');
});

test('Each scam links to the checker with its own id and to a real recovery topic', () => {
  const help = helpCards(), recover = read('recover.html');
  const ids = guide.scams.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'repeated scam id');
  for (const s of guide.scams) {
    assert.match(s.id, /^[a-z]+$/, s.id);
    assert.ok(page.includes(`href="check.html?example=${s.id}"`), s.id);
    assert.ok(help.cards.some(c => c.id === s.recover), s.id + ' recover ' + s.recover);
    assert.ok(recover.includes(`<details id="${s.recover}" class="help-topic-card">`), s.recover);
  }
});

test('Every step is on the page with its source, or labeled as the project’s own advice', () => {
  const generated = block(guide);
  let own = 0;
  const steps = guide.scams.flatMap(s => s.steps).concat(guide.practice.map(p => p.todo));
  for (const step of steps) {
    assert.ok(generated.includes(step.text.replace(/&/g, '&amp;')), step.text);
    if (step.source) assert.ok(generated.includes(`href="${guide.sources[step.source].url}"`), step.source);
    else own++;
  }
  assert.equal((generated.match(new RegExp(OWN_ADVICE, 'g')) || []).length, own);
});

test('Practice: made-up scams and ordinary messages, each mark found in its message', () => {
  const scams = guide.practice.filter(p => p.scam), ordinary = guide.practice.filter(p => !p.scam);
  assert.ok(scams.length >= 3 && ordinary.length >= 2, 'too few of one kind');
  for (const p of scams) {
    assert.ok(p.marks.length > 0, p.id + ' has nothing to notice');
    for (const m of p.marks) assert.ok(p.text.includes(m.words), p.id + ': ' + m.words);
  }
  for (const p of ordinary) assert.equal(p.marks.length, 0, p.id);
});

test('An ordinary practice message gets no warning from the checker either', () => {
  for (const p of guide.practice.filter(p => !p.scam)) {
    const result = engine.analyze(p.text, 'text');
    assert.equal(result.requestRisk.level, 'none', p.id);
    assert.notEqual(result.assessment, 'suspicious', p.id);
  }
});

test('Without JavaScript every message, answer and scam shows; the choices appear only with it', () => {
  const generated = block(guide);
  assert.ok(!/<(?:li|details)[^>]*\bhidden/.test(generated), 'a message or scam is hidden');
  assert.ok(!/<script/.test(generated));
  assert.equal((generated.match(/<div class="practice-choices" hidden>/g) || []).length, guide.practice.length);
  assert.equal((generated.match(/class="practice-answer"/g) || []).length, guide.practice.length);
});

test('The page says nothing is saved, and the practice script stores and sends nothing', () => {
  assert.match(page, /Nothing you choose on this page is saved or sent\./);
  const script = read('js/learn.js');
  assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|sendBeacon/.test(script));
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(script));
});

test('Someone with no one to ask is given the hotline', () => {
  assert.match(page, /id="no-one-to-ask"[\s\S]*href="tel:\+18333728311"/);
  assert.match(page, /href="recover\.html#hotline"/);
});

test('The checker loads the guide before its page script', () => {
  const check = read('check.html');
  assert.ok(check.indexOf('src="data/scam-guide.js"') > 0);
  assert.ok(check.indexOf('src="data/scam-guide.js"') < check.indexOf('src="js/app.js"'));
});

test('A draft notice shows until the guide is approved', () => {
  if (guide.approvedBy) assert.ok(!page.includes('id="guide-draft"'));
  else assert.match(page, /id="guide-draft" class="help-draft">Draft:/);
});

console.log('Learn page: ' + checks + '/' + checks);
