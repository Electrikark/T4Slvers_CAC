// The recovery page: written from data/help-cards.js, and keeping the parts written by hand.
// A match between page and data says the page shows what the data says. It does not say the
// advice is right; that is the human review recorded in data/help-cards.js (approvedBy).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { render, loadHelp, block, OWN_ADVICE } = require('../scripts/build-recover.cjs');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'recover.html'), 'utf8');
const help = loadHelp();
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS ' + name); };
const topLevel = Array.from(help.cards.filter(c => !c.parent), c => c.id);

test('recover.html is exactly what data/help-cards.js produces', () => {
  assert.equal(render(page, help), page, 'run node scripts/build-recover.cjs');
});

test('A change to the data is caught', () => {
  const changed = JSON.parse(JSON.stringify(help));
  changed.cards[0].steps[0].text += ' (edited)';
  assert.notEqual(render(page, changed), page);
});

test('Topics: code, device, gift cards and money apart, identity, and "not sure"', () => {
  assert.deepEqual(topLevel, ['code', 'remote', 'giftcard', 'money', 'identity', 'other']);
  assert.match(help.cards.find(c => c.id === 'other').title, /Something else, or I am not sure/);
  for (const id of topLevel) assert.match(page, new RegExp(`<details id="${id}" class="help-topic-card">`));
});

test('Six payment routes, each nested under "I sent money or paid"', () => {
  const money = help.cards.find(c => c.id === 'money');
  assert.equal(money.children.length, 6);
  const start = page.indexOf('<details id="money"'), routes = page.slice(start, page.indexOf('<details id="identity"'));
  for (const id of money.children) assert.ok(routes.includes(`<details id="${id}" class="help-topic-card">`), id);
});

test('Every step is on the page with its source, or labeled as the project’s own advice', () => {
  const generated = block(help);
  let own = 0;
  for (const c of help.cards.filter(c => c.steps)) for (const s of c.steps) {
    const text = s.text.replace(/&/g, '&amp;');
    assert.ok(generated.includes(text), s.text);
    if (s.source) assert.ok(generated.includes(`href="${help.sources[s.source].url}"`), s.source);
    else own++;
  }
  assert.equal((generated.match(new RegExp(OWN_ADVICE, 'g')) || []).length, own);
});

test('Topics work without JavaScript: no topic is hidden, and several can be open', () => {
  const generated = block(help);
  assert.ok(!/<details[^>]*\b(?:hidden|name=)/.test(generated), 'a topic is hidden or grouped');
  assert.ok(!/<script/.test(generated));
  assert.match(page, /<form id="help-form" class="help-form" hidden>/, 'the search appears only with JavaScript');
});

test('The hand-written parts stay: payment box, hotline, plan, print, recovery-offer warning', () => {
  assert.match(page, /class="urgent-step"[\s\S]*Contact your payment provider now/);
  assert.match(page, /National Elder Fraud Hotline[\s\S]*href="tel:\+18333728311"/);
  assert.match(page, /A short plan for today/);
  assert.match(page, /id="print-plan"/);
  assert.match(page, /Watch for offers to “get your money back\.”/);
  assert.match(page, /refund-and-recovery-scams/);
});

test('A draft notice shows until the steps are approved', () => {
  if (help.approvedBy) assert.ok(!page.includes('id="help-draft"'));
  else assert.match(page, /id="help-draft" class="help-draft">Draft:/);
});

console.log('Recovery page: ' + checks + '/' + checks);
