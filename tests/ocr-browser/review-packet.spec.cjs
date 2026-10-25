/* The review packet must not be able to manufacture an approval.
 *
 * RELEASE.md requires two distinct trained volunteers per contact, and
 * docs/reference-review-guide.md says "Don't add a review you did not do." Neither the
 * store nor the contact matcher enforces that. The packet page is where it is enforced,
 * so these tests are the enforcement's only guard.
 */
'use strict';

const { test, expect } = require('@playwright/test');
const path = require('node:path');

const PAGE = 'file://' + path.resolve(__dirname, '..', '..', 'docs', 'testing', 'review-packet.html');

// The first in-scope record in store order is chase.com.
function inScopeRecord(page) {
  return page.locator('.rec').filter({ hasText: 'chase.com' }).first();
}

async function fields(rec) {
  return {
    passage: rec.locator('textarea'),
    r1name: rec.locator('input').nth(0),
    r1date: rec.locator('input').nth(1),
    r2name: rec.locator('input').nth(2),
    r2date: rec.locator('input').nth(3),
    verdict: rec.locator('.verdict')
  };
}

test.beforeEach(async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  page.__errors = errors;
});

test('every record starts as draft and nothing is prefilled', async ({ page }) => {
  const recs = page.locator('.rec');
  await expect(recs).not.toHaveCount(0);
  const n = await recs.count();
  for (let i = 0; i < n; i++) {
    await expect(recs.nth(i).locator('.verdict')).toHaveText(/stays draft/);
  }
  // No reviewer name or date is suggested anywhere on the page.
  const values = await page.locator('.rec input').evaluateAll(els => els.map(e => e.value));
  expect(values.every(v => v === '')).toBe(true);
  const passages = await page.locator('.rec textarea').evaluateAll(els => els.map(e => e.value));
  expect(passages.every(v => v === '')).toBe(true);
  expect(page.__errors).toEqual([]);
});

test('a passage alone does not approve a record', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('Chase will never ask you to move money to resolve a fraud issue.');
  await expect(f.verdict).toHaveText(/stays draft/);
  await expect(f.verdict).toHaveText(/two reviewers/);
});

test('one person signing twice is one review, not two', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('Chase will never ask you to move money to resolve a fraud issue.');
  await f.r1name.fill('Naman Raichura');
  await f.r1date.fill('2026-10-24');
  await f.r2name.fill('naman raichura'); // same person, different capitals
  await f.r2date.fill('2026-10-25');
  await expect(f.verdict).toHaveText(/stays draft/);
  await expect(f.verdict).toHaveText(/same person/);
});

test('two different reviewers with their own dates approve the record', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('Chase will never ask you to move money to resolve a fraud issue.');
  await f.r1name.fill('Naman Raichura');
  await f.r1date.fill('2026-10-24');
  await f.r2name.fill('A. Volunteer');
  await f.r2date.fill('2026-10-25');
  await expect(f.verdict).toHaveText('reviewed');

  const json = JSON.parse(await page.locator('#json').textContent());
  const rec = json.chase.contacts.find(c => c.value === 'chase.com');
  expect(rec.status).toBe('reviewed');
  expect(rec.reviewedBy).toBe('Naman Raichura');
  expect(rec.checkedOn).toBe('2026-10-24');
  expect(rec.reviewDue).toBe('2027-01-22'); // the check date plus 90 days
});

test('removing either date puts the record back to draft', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('Chase will never ask you to move money to resolve a fraud issue.');
  await f.r1name.fill('Naman Raichura');
  await f.r1date.fill('2026-10-24');
  await f.r2name.fill('A. Volunteer');
  await f.r2date.fill('2026-10-25');
  await expect(f.verdict).toHaveText('reviewed');
  await f.r2date.fill('');
  await expect(f.verdict).toHaveText(/stays draft/);
});

test('a stub passage does not count as evidence', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('ok');
  await f.r1name.fill('Naman Raichura');
  await f.r1date.fill('2026-10-24');
  await f.r2name.fill('A. Volunteer');
  await f.r2date.fill('2026-10-25');
  await expect(f.verdict).toHaveText(/stays draft/);
  await expect(f.verdict).toHaveText(/supporting passage/);
});

test('records outside the release scope cannot be reviewed here', async ({ page }) => {
  const rec = page.locator('.rec').filter({ hasText: 'hsbc.com' }).first();
  await expect(rec.locator('.verdict')).toHaveText(/outside the review scope/);
  await expect(rec.locator('textarea')).toBeDisabled();
  const inputs = rec.locator('input');
  const n = await inputs.count();
  for (let i = 0; i < n; i++) await expect(inputs.nth(i)).toBeDisabled();
});

test('one approved record does not approve its neighbours', async ({ page }) => {
  const f = await fields(inScopeRecord(page));
  await f.passage.fill('Chase will never ask you to move money to resolve a fraud issue.');
  await f.r1name.fill('Naman Raichura');
  await f.r1date.fill('2026-10-24');
  await f.r2name.fill('A. Volunteer');
  await f.r2date.fill('2026-10-25');

  const json = JSON.parse(await page.locator('#json').textContent());
  const others = Object.values(json)
    .flatMap(o => o.contacts)
    .filter(c => c.value !== 'chase.com');
  expect(others.every(c => c.status === 'draft')).toBe(true);
  expect(others.every(c => c.reviewedBy === null)).toBe(true);
});
