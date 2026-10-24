// Help search in Node: the "nothing was handed over" rule and keyword suggestions.
// The ML search needs a browser and is covered by tests/ocr-browser/help.spec.cjs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/help-cards.js'), 'utf8'), ctx);
const help = ctx.window.TFS_HELP;
const { keywordSearch, _test } = await import(path.join(root, 'js/help-search.js'));
let checks = 0;
const test = (name, run) => { run(); checks++; console.log('PASS ' + name); };
const first = q => (keywordSearch(q, help)[0] || {}).id;

test('Something handed over: the specific card comes first, even with "not" or "hung up" in the sentence', () => {
  for (const [q, card] of [
    ['I gave them my password but did not send money.', 'code'],
    ['I sent gift card numbers and then hung up.', 'giftcard'],
    ['I let them on my computer but never paid', 'remote'],
    ['I told them my social security number before I hung up', 'identity'],
    ["I didn't hang up, I read them the code", 'code']
  ]) {
    assert.equal(_test.nothingHandedOver(q), false, q);
    assert.equal(first(q), card, q);
  }
});

test('Nothing handed over: "Something else, or I am not sure" comes first', () => {
  for (const q of [
    'they asked for my code but I did not give it',
    'I almost bought the gift cards but stopped at the register',
    'I hung up before I gave them anything',
    "They wanted my PIN but I didn't tell them",
    "I haven't paid anything yet"
  ]) {
    assert.equal(_test.nothingHandedOver(q), true, q);
    assert.equal(first(q), 'other', q);
  }
});

test('No negation at all: the rule stays out of the way', () => {
  assert.equal(_test.nothingHandedOver('I read the six numbers to the man on the phone'), false);
  assert.equal(first('I bought gift cards and read them the numbers'), 'giftcard');
});

console.log('Help search groups: ' + checks + '/' + checks);
