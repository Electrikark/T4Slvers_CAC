// Recovery topics and their search on recover.html, and "Why this is a warning sign" on check.html.
// The topics are plain HTML written from data/help-cards.js: no download and no JavaScript needed.
// The search only suggests topics; the ML search loads only when asked for, and its failure
// leaves the topics and keyword search working.
const { test, expect } = require('@playwright/test');

const BASE = '/T4Slvers_CAC/';
const RECOVER = BASE + 'recover.html';
const CHECK = BASE + 'check.html';
const modelRequests = page => {
  const seen = [];
  page.on('request', r => { if (r.url().includes('/vendor/minilm/')) seen.push(r.url()); });
  return seen;
};

async function check(page, text) {
  await page.locator('#channel-text').click();
  await page.fill('#message', text);
  await page.click('#check-button');
  await expect(page.locator('#result-title')).toBeVisible();
}

test('every topic is listed, opens official steps with sources, and several can stay open, with no model download', async ({ page }) => {
  const model = modelRequests(page);
  await page.goto(RECOVER);
  const topics = page.locator('#help-menu > details');
  await expect(topics).toHaveCount(6);
  await expect(page.locator('#help-draft')).toBeVisible();
  await page.locator('#code > summary').click();
  await page.locator('#money > summary').click();
  await page.locator('#money-bank > summary').click();
  await expect(page.locator('#money-bank .help-steps li')).toHaveCount(2);
  await expect(page.locator('#money-bank a.help-source').first()).toHaveAttribute('href', /consumer\.ftc\.gov/);
  await expect(page.locator('#code .help-steps li')).toHaveCount(5);
  await expect(page.locator('#code .own-advice')).toHaveText('Tech for Silvers advice');
  for (const id of ['code', 'money', 'money-bank']) await expect(page.locator('#' + id)).toHaveAttribute('open', '');
  await expect(page.locator('#money .payment-routes > details')).toHaveCount(6);
  expect(model).toEqual([]);
});

test('keyword search suggests topics, opens one only when chosen, and admits when nothing fits', async ({ page }) => {
  const model = modelRequests(page);
  await page.goto(RECOVER);
  await expect(page.locator('#help-form')).toBeVisible();
  await page.fill('#help-query', 'I bought gift cards and read them the numbers');
  await page.click('#help-find');
  const first = page.locator('#help-suggestions .help-topic').first();
  await expect(first).toHaveText(/gift card/i);
  await expect(page.locator('#giftcard')).not.toHaveAttribute('open', '');
  await first.click();
  await expect(page.locator('#giftcard')).toHaveAttribute('open', '');
  await expect(page.locator('#giftcard > summary')).toBeFocused();
  await page.fill('#help-query', 'what time does the workshop start');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic')).toHaveCount(0);
  await expect(page.locator('#help-status')).toContainText('could not match');
  await page.fill('#help-query', 'they asked for my code but I did not give it');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/Something else/);
  expect(model).toEqual([]);
});

test('a suggested payment route opens inside "I sent money or paid"', async ({ page }) => {
  await page.goto(RECOVER);
  await page.fill('#help-query', 'I sent money by Western Union');
  await page.click('#help-find');
  await page.locator('#help-suggestions .help-topic', { hasText: /wire transfer/i }).first().click();
  await expect(page.locator('#money')).toHaveAttribute('open', '');
  await expect(page.locator('#money-wire')).toHaveAttribute('open', '');
  await expect(page.locator('#money-wire .help-steps li').first()).toBeVisible();
});

test('smart search mode downloads only after its button is pressed, locally, and says when it is on', async ({ page }) => {
  const outside = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8381/')) outside.push(r.url()); });
  const model = modelRequests(page);
  await page.goto(RECOVER);
  await page.locator('.smart-search > summary').click();
  await expect(page.locator('#smart-search-on')).toBeVisible();
  await expect(page.locator('#smart-search-on')).toContainText('Turn on smart search mode');
  await expect(page.locator('.smart-search')).not.toContainText(/experimental|being tested/i);
  await page.focus('#help-query');
  await page.fill('#help-query', 'I read the code to the caller');
  await page.click('#help-find');
  await page.waitForTimeout(500);
  expect(model).toEqual([]);
  await page.click('#smart-search-on');
  await expect(page.locator('#smart-search-on')).toBeDisabled();
  await expect(page.locator('#smart-search-status')).toContainText(/Turning on|is on for this visit/);
  await expect(page.locator('#smart-search-status')).toContainText('is on for this visit', { timeout: 60000 });
  await expect(page.locator('#smart-search-on')).toHaveText('Smart search mode is on');
  expect(model.some(u => u.endsWith('.wasm'))).toBe(true);
  await page.fill('#help-query', 'I read the six numbers from my text to the man on the phone');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/code or password/, { timeout: 60000 });
  await expect(page.locator('#help-suggestions')).toHaveAttribute('data-method', 'ml');
  expect(outside).toEqual([]);
});

test('while the model is still loading, or if it never loads, keyword search answers at once', async ({ page }) => {
  await page.route('**/vendor/minilm/**', () => {});
  await page.goto(RECOVER);
  await page.locator('.smart-search > summary').click();
  await page.click('#smart-search-on');
  await page.fill('#help-query', 'I sent money by Western Union');
  const started = Date.now();
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/wire transfer/i);
  expect(Date.now() - started).toBeLessThan(3000);
  await expect(page.locator('#help-suggestions')).toHaveAttribute('data-method', 'keyword');
  await page.locator('#remote > summary').click();
  await expect(page.locator('#remote .help-steps li')).toHaveCount(4);
});

test('if smart search mode fails to load, the reader is told and the topics and keyword search still work', async ({ page }) => {
  await page.route('**/vendor/minilm/**', route => route.abort());
  await page.goto(RECOVER);
  await page.locator('.smart-search > summary').click();
  await page.click('#smart-search-on');
  await expect(page.locator('#smart-search-status')).toContainText('could not load');
  await page.fill('#help-query', 'I let them on my computer but never paid');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/computer or phone/);
});

test('a newer search is never replaced by an older one', async ({ page }) => {
  await page.goto(RECOVER);
  await page.fill('#help-query', 'I sent money by Western Union');
  await page.click('#help-find');
  await page.fill('#help-query', 'I gave them my Social Security number');
  await page.click('#help-find');
  await expect(page.locator('#help-suggestions .help-topic').first()).toHaveText(/Social Security/);
  await expect(page.locator('#help-suggestions .help-topic', { hasText: 'wire' })).toHaveCount(0);
});

test('without JavaScript every topic still opens and the search is not shown', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8381' + RECOVER);
  await expect(page.locator('#help-form')).toBeHidden();
  await page.locator('#money > summary').click();
  await page.locator('#money-crypto > summary').click();
  await expect(page.locator('#money-crypto .help-steps li')).toHaveCount(3);
  await page.locator('#other > summary').click();
  await expect(page.locator('#other .help-steps')).toContainText('877-908-3360');
  await context.close();
});

test('printing opens every topic, payment routes included, and restores the reader’s choices', async ({ page }) => {
  await page.goto(RECOVER);
  await page.locator('#money > summary').click();
  await page.evaluate(() => {
    window.print = () => {
      window.dispatchEvent(new Event('beforeprint'));
      window.printOpen = [...document.querySelectorAll('.recovery-options details')].every(el => el.open);
      window.dispatchEvent(new Event('afterprint'));
    };
  });
  await page.getByRole('button', { name: 'Print this help page' }).click();
  expect(await page.evaluate(() => window.printOpen)).toBe(true);
  await expect(page.locator('#money')).toHaveAttribute('open', '');
  await expect(page.locator('#money-bank')).not.toHaveAttribute('open', '');
  await expect(page.locator('#code')).not.toHaveAttribute('open', '');
});

test('a flagged result explains why, right under the result, quoting the request and linking its mark', async ({ page }) => {
  await page.goto(CHECK);
  await check(page, 'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.');
  const why = page.locator('#why-section');
  await expect(why).toBeVisible();
  // Directly below the result banner, before "Before you act".
  expect(await page.evaluate(() => {
    const banner = document.getElementById('result-banner'), sec = document.getElementById('why-section');
    return Boolean(banner.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await page.locator('#why-section > summary').click();
  const first = page.locator('#why-list > li').first();
  await expect(first).toContainText('gift card');
  await expect(first.locator('.why-words')).toContainText('In your message: “send me the codes”');
  await expect(first.locator('.why-quote')).toContainText('No real business or government agency');
  await expect(first.locator('a.why-source')).toHaveAttribute('href', /consumer\.ftc\.gov/);
  await expect(page.locator('#why-draft')).toBeVisible();
  const mark = first.locator('a.why-mark');
  const target = (await mark.getAttribute('href')).slice(1);
  await expect(page.locator('#' + target)).toBeAttached();
  await expect(page.locator('#' + target)).toContainText(/gift card/i);
});

test('several findings each get their own reason and words', async ({ page }) => {
  await page.goto(CHECK);
  await check(page, 'Microsoft: Your computer is infected. Install AnyDesk now and read us the code we text you.');
  await page.locator('#why-section > summary').click();
  const words = page.locator('#why-list .why-words');
  await expect(words).toHaveCount(3);
  await expect(words.nth(0)).toContainText('“Install AnyDesk”');
  await expect(words.nth(1)).toContainText('“read us the code”');
});

test('an ordinary message shows no "why", and checking again never shows an old explanation', async ({ page }) => {
  await page.goto(CHECK);
  await check(page, 'See you at lunch on Sunday!');
  await expect(page.locator('#why-section')).toBeHidden();
  await page.locator('#start-again').click();
  await check(page, 'Grandma, I’m in trouble. Please buy 3 Apple gift cards and send me the codes.');
  await expect(page.locator('#why-section')).toBeVisible();
  await page.locator('#start-again').click();
  await expect(page.locator('#why-section')).toBeHidden();
  await expect(page.locator('#why-list > li')).toHaveCount(0);
  await check(page, 'See you at lunch on Sunday!');
  await expect(page.locator('#why-section')).toBeHidden();
  await expect(page.locator('#why-list > li')).toHaveCount(0);
});
