const TEST_ORIGIN = `http://127.0.0.1:${process.env.TFS_TEST_PORT || 8381}`;
// The learn page in a browser: the practice goes one message at a time, the guide's examples
// load into the checker and get a warning there, and nothing is stored or sent.
const { test, expect } = require('@playwright/test');
const LEARN = '/T4Slvers_CAC/learn.html';

test('practice shows one message at a time, answers gently, and can start again', async ({ page }) => {
  const outside = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', r => { if (!r.url().startsWith((TEST_ORIGIN + '/'))) outside.push(r.url()); });
  await page.goto(LEARN);
  const items = page.locator('.practice-item');
  const total = await items.count();
  await expect(page.locator('.practice-item:visible')).toHaveCount(1);
  await expect(page.locator('#practice-1 .practice-count')).toContainText(`Message 1 of ${total}`);

  // A scam called ordinary is "easy to miss", never "wrong", and its answer opens.
  await page.locator('#practice-1').getByRole('button', { name: 'It looks ordinary' }).click();
  await expect(page.locator('#practice-1 .practice-feedback')).toHaveText('This one is easy to miss. That is what it is made for.');
  await expect(page.locator('#practice-1 .practice-feedback')).toBeFocused();
  await expect(page.locator('#practice-1 .practice-answer')).toHaveAttribute('open', '');
  await expect(page.locator('#practice-1 .practice-verdict')).toHaveText('This one is a scam.');
  await expect(page.locator('#practice-1 [data-choice="ordinary"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#practice-1').getByRole('button', { name: 'Next message' }).click();
  await expect(page.locator('#practice-2')).toBeVisible();
  await expect(page.locator('#practice-1')).toBeHidden();
  await expect(page.locator('#practice-2 .practice-count')).toBeFocused();

  // Pausing on an ordinary message is never wrong.
  await page.locator('#practice-2').getByRole('button', { name: 'I would pause' }).click();
  await expect(page.locator('#practice-2 .practice-feedback')).toHaveText('Pausing is never wrong. This one looks ordinary, though.');

  // Choosing is optional: opening the answer is enough to go on.
  await page.locator('#practice-2').getByRole('button', { name: 'Next message' }).click();
  await page.locator('#practice-3 .practice-answer > summary').click();
  await expect(page.locator('#practice-3 .practice-next')).toBeVisible();

  for (let n = 3; n <= total; n++) {
    const item = page.locator(`#practice-${n}`);
    if (n > 3) await item.getByRole('button', { name: 'I would pause' }).click();
    await item.locator('.practice-next').click();
  }
  await expect(page.locator('#practice-done')).toBeVisible();
  await expect(page.locator('#practice-done-title')).toBeFocused();
  await expect(page.locator('.practice-item:visible')).toHaveCount(0);

  await page.getByRole('button', { name: 'Start again' }).click();
  await expect(page.locator('#practice-1')).toBeVisible();
  await expect(page.locator('#practice-1 .practice-feedback')).toBeHidden();
  await expect(page.locator('#practice-1 .practice-answer')).not.toHaveAttribute('open', '');
  await expect(page.locator('#practice-1 [data-choice="ordinary"]')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('a guide example loads into the checker, waits for the reader, and gets a warning', async ({ page }) => {
  await page.goto(LEARN);
  await page.locator('#scam-computer > summary').click();
  await page.getByRole('link', { name: /Try this message in the checker\s*: Computer help/ }).click();
  await expect(page).toHaveURL(/check.html$/);
  await expect(page.locator('#message')).toHaveValue(/Microsoft Security Alert/);
  await expect(page.locator('#example-loaded')).toHaveText('Made-up practice message. Choose Not sure, then Check this message when you are ready.');
  await expect(page.locator('#channel-unknown')).toBeFocused();
  await expect(page.locator('#result')).toBeHidden();
  await page.locator('#channel-unknown').click();
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('This message has warning signs');
});

test('every guide card opens, links to its warning signs, and to a recovery topic that exists', async ({ page, request }) => {
  await page.goto(LEARN);
  for (const card of await page.locator('.guide-card').all()) {
    await card.locator('summary').click();
    await expect(card.locator('.detail-body')).toBeVisible();
    for (const sign of await card.locator('.guide-signs a').all()) {
      await expect(page.locator(await sign.getAttribute('href'))).toHaveCount(1);
    }
    const recover = await card.locator('a.guide-recover').getAttribute('href');
    const [file, hash] = recover.split('#');
    const html = await (await request.get('/T4Slvers_CAC/' + file)).text();
    expect(html).toContain(`<details id="${hash}"`);
  }
});

test('without JavaScript every practice message and its answer can be read', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(TEST_ORIGIN + LEARN);
  const total = await page.locator('.practice-item').count();
  await expect(page.locator('.practice-item:visible')).toHaveCount(total);
  await expect(page.locator('.practice-choices:visible')).toHaveCount(0);
  await page.locator('#practice-1 .practice-answer > summary').click();
  await expect(page.locator('#practice-1 .practice-verdict')).toBeVisible();
  await page.locator('#scam-romance > summary').click();
  await expect(page.locator('#scam-romance .help-steps li').first()).toBeVisible();
  await context.close();
});
