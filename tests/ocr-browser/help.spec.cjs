// "Already did something?" help: the menu needs no download; search only suggests; the ML
// search loads only when asked for and its failure leaves the menu and keyword search working.
const { test, expect } = require('@playwright/test');

const URL = '/T4Slvers_CAC/';
const modelRequests = page => {
  const seen = [];
  page.on('request', r => { if (r.url().includes('/vendor/minilm/')) seen.push(r.url()); });
  return seen;
};

test('the menu lists every topic and opens official steps with sources, with no model download', async ({ page }) => {
  const model = modelRequests(page);
  await page.goto(URL);
  const menu = page.locator('#help-menu .help-topic');
  await expect(menu).toHaveCount(6);
  await expect(page.locator('#help-draft')).toBeVisible();
  await menu.filter({ hasText: 'I sent money or paid' }).click();
  await expect(page.locator('#help-card-title')).toHaveText('I sent money or paid');
  await expect(page.locator('#help-card-title')).toBeFocused();
  await page.locator('#help-card .help-topic', { hasText: 'Zelle' }).click();
  await expect(page.locator('#help-card .help-steps li')).toHaveCount(2);
  await expect(page.locator('#help-card a.help-source').first()).toHaveAttribute('href', /consumer\.ftc\.gov/);
  await page.locator('#help-card button', { hasText: 'Back to' }).click();
  await expect(page.locator('#help-card-title')).toHaveText('I sent money or paid');
  expect(model).toEqual([]);
});

test('keyword search suggests topics, never opens one by itself, and admits when nothing fits', async ({ page }) => {
  const model = modelRequests(page);
  await page.goto(URL);
  await page.fill('#help-query', 'I bought gift cards and read them the numbers');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/gift card/i);
  await expect(page.locator('#help-card')).toBeHidden();
  await page.fill('#help-query', 'what time does the workshop start');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic')).toHaveCount(0);
  await expect(page.locator('#help-status')).toContainText('could not match');
  await page.fill('#help-query', 'they asked for my code but I did not give it');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/Something else/);
  expect(model).toEqual([]);
});

test('ML search loads locally only after the person starts typing, and stays on this site', async ({ page }) => {
  const outside = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8381/')) outside.push(r.url()); });
  const model = modelRequests(page);
  await page.goto(URL + '?search=ml');
  expect(model).toEqual([]);
  await page.focus('#help-query');
  await page.fill('#help-query', 'I read the six numbers from my text to the man on the phone');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/code or password/, { timeout: 60000 });
  expect(model.length).toBeGreaterThan(0);
  expect(outside).toEqual([]);
});

test('if the model cannot load, the menu and keyword search still work', async ({ page }) => {
  await page.route('**/vendor/minilm/**', route => route.abort());
  await page.goto(URL + '?search=ml');
  await page.focus('#help-query');
  await expect(page.locator('#help-status')).toContainText('could not load', { timeout: 30000 });
  await page.fill('#help-query', 'I sent money by Western Union');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/wire transfer/i);
  await page.locator('#help-menu .help-topic', { hasText: 'computer or phone' }).click();
  await expect(page.locator('#help-card .help-steps li')).toHaveCount(4);
});
