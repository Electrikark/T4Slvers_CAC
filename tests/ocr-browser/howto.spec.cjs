const TEST_ORIGIN = `http://127.0.0.1:${process.env.TFS_TEST_PORT || 8381}`;
// The how-to guides in a real browser: help.html, the help beside the message box, the practice,
// and the example loader. These check this app's own screens. Steps that happen in a phone's own
// apps cannot be checked here; the pages say so (see tests/howto-node.cjs).
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const BASE = '/T4Slvers_CAC/';
const HELP = BASE + 'help.html';
const CHECK = BASE + 'check.html';
const PRACTICE_PNG = path.join(__dirname, '../../assets/how-to/practice-screenshot.png');

function watch(page) {
  const outside = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', r => { if (!r.url().startsWith((TEST_ORIGIN + '/'))) outside.push(r.url()); });
  return { outside, errors };
}

// Everything the result screen says, so two checks of the same text can be compared exactly.
async function resultText(page) {
  await expect(page.locator('#result-title')).toBeVisible();
  return page.locator('#result').evaluate(el => el.innerText);
}

test('the help page offers each guide by phone, and says no phone has been checked yet', async ({ page }) => {
  const seen = watch(page);
  await page.goto(HELP);
  await expect(page.locator('h1')).toHaveText('Getting a message into the checker');
  await expect(page.locator('#howto-status')).toContainText('0 of');
  await expect(page.locator('#phone-choice')).toBeVisible();
  await expect(page.locator('#copy-text-iphone .howto-steps li')).toHaveCount(4);
  await expect(page.locator('#copy-text-iphone .howto-steps li').nth(3)).toBeVisible();
  await expect(page.locator('#copy-text-iphone .howto-unchecked')).toBeVisible();
  await expect(page.locator('#copy-text-android .howto-steps')).toBeVisible();
  // The screenshot review guide shows the app's own screens.
  await expect(page.locator('#review-screenshot img')).toHaveCount(3);
  for (const img of await page.locator('#review-screenshot img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  expect(seen.outside).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('the help page works with JavaScript off, and hides only the practice feedback', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(TEST_ORIGIN + HELP);
  await expect(page.locator('#phone-choice')).toBeHidden();
  for (const device of await page.locator('[data-phone]').all()) await expect(device).toBeVisible();
  await expect(page.locator('#take-screenshot-iphone-faceid .howto-steps')).toBeVisible();
  await expect(page.locator('#practice-box')).toBeVisible();
  await expect(page.locator('#practice-test')).toBeHidden();
  await context.close();
});

test('opening the help beside the box keeps the message, the choice, and the result the same', async ({ page }) => {
  const seen = watch(page);
  const message = 'Chase: Buy gift cards to pay the fee. Send the gift card codes today.';

  // Without opening the help.
  await page.goto(CHECK);
  await page.locator('#channel-text').click();
  await page.fill('#message', message);
  await page.click('#check-button');
  const plain = await resultText(page);

  // The same message, with the shared help opened and closed on the way.
  await page.goto(CHECK);
  await page.locator('#channel-text').click();
  await page.fill('#message', message);
  await page.locator('#help-paste > summary').click();
  await expect(page.locator('#help-paste')).toHaveAttribute('open', '');
  await expect(page.locator('.howto-routes a')).toHaveCount(2);
  await expect(page.locator('.howto-inline')).toHaveCount(1);
  await expect(page.locator('#message')).toHaveValue(message);
  await expect(page.locator('#channel-text')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#result')).toBeHidden();
  await page.locator('#help-paste > summary').click();
  await page.click('#check-button');
  expect(await resultText(page)).toBe(plain);
  await expect(page.locator('#result-title')).toHaveText('This message has warning signs');

  // A new check starts with the help folded again.
  await page.locator('#start-again').click();
  await expect(page.locator('#message')).toHaveValue('');
  expect(seen.outside).toEqual([]);
  expect(seen.errors).toEqual([]);
});

for (const route of ['text-and-email', 'screenshots']) {
  test(`the ${route} guide opens separately and preserves the checker`, async ({ page }) => {
    await page.goto(CHECK);
    await page.locator('#channel-text').click();
    await page.fill('#message', 'My original message stays here.');
    await page.locator('#help-paste > summary').click();
    const opened = page.waitForEvent('popup');
    await page.locator(`.howto-routes a[href="help.html#${route}"]`).click();
    const guide = await opened;
    await expect(guide).toHaveURL(new RegExp(`help\\.html#${route}$`));
    await expect(guide.locator(`#${route}`)).toBeInViewport();
    await expect(page.locator('#message')).toHaveValue('My original message stays here.');
    await expect(page.locator('#channel-text')).toHaveAttribute('aria-pressed', 'true');
    await guide.close();
  });
}

test('one phone choice filters every guide without storage, focus or scroll changes', async ({ page }) => {
  await page.goto(HELP);
  await expect(page.locator('[data-phone]')).toHaveCount(13);
  for (const phone of ['iphone', 'android', 'both']) {
    const button = page.locator(`[data-phone-choice="${phone}"]`);
    await button.focus();
    const before = await page.evaluate(() => window.scrollY);
    await button.press('Space');
    await expect(button).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-phone-choice][aria-pressed="true"]')).toHaveCount(1);
    for (const device of await page.locator('[data-phone]').all()) {
      if (phone === 'both' || await device.getAttribute('data-phone') === phone) await expect(device).toBeVisible();
      else await expect(device).toBeHidden();
    }
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length)).toBe(0);
  }
  await page.locator('[data-phone-choice="iphone"]').click();
  await page.reload();
  await expect(page.locator('[data-phone-choice="both"]')).toHaveAttribute('aria-pressed', 'true');
});

test('copy-and-paste practice says whether the whole message arrived, without checking it', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const seen = watch(page);
  await page.goto(HELP);
  const result = page.locator('#practice-result');
  await page.locator('#practice-test').click();
  await expect(result).toHaveText(/The box is empty/);

  // A real select, copy and paste, the way a person does it.
  await page.locator('#practice-source').click({ clickCount: 3 });
  await page.keyboard.press('ControlOrMeta+C');
  await page.locator('#practice-box').click();
  await page.keyboard.press('ControlOrMeta+V');
  await page.locator('#practice-test').click();
  await expect(result).toHaveText('It worked. The whole practice message is in the box.');

  const full = await page.locator('#practice-source').innerText();
  await page.fill('#practice-box', full.slice(0, 30));
  await page.locator('#practice-test').click();
  await expect(result).toHaveText(/Part of the message is in the box/);

  await page.fill('#practice-box', 'From: Library\n' + full);
  await page.locator('#practice-test').click();
  await expect(result).toHaveText(/plus some extra words/);

  await page.fill('#practice-box', 'Something else entirely');
  await page.locator('#practice-test').click();
  await expect(result).toHaveText(/does not look like the practice message/);

  // Typing it out is not called a paste.
  await page.locator('#practice-clear').click();
  await expect(page.locator('#practice-box')).toHaveValue('');
  await expect(page.locator('#practice-box')).toBeFocused();
  await page.locator('#practice-box').pressSequentially(full);
  await page.locator('#practice-test').click();
  await expect(result).toHaveText(/If you typed them, that works too/);

  expect(await page.evaluate(() => typeof window.TfsEngine)).toBe('undefined');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(seen.outside).toEqual([]);
  expect(seen.errors).toEqual([]);
});

test('the practice screenshot goes through the real reader and review, and gets a warning', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto(CHECK);
  await page.locator('#channel-text').click();
  await page.locator('#ocr-file').setInputFiles(PRACTICE_PNG);
  await expect(page.locator('#ocr-status')).toContainText('Text is ready to review', { timeout: 120000 });
  const read = await page.locator('#message').inputValue();
  // The guide tells the reader these words are read too, and to delete them.
  expect(read).toMatch(/PRACTICE PICTURE/);
  expect(read).toMatch(/Unknown number/);
  await expect(page.locator('#check-button')).toBeDisabled();
  // Opening the screenshot help during review changes nothing about the review.
  await page.locator('#help-paste > summary').click();
  await expect(page.locator('#check-button')).toBeDisabled();
  await expect(page.locator('#ocr-reviewed')).not.toBeChecked();
  // Follow the guide: delete the extra lines, tick the box, then check.
  const message = read.split('\n').filter(line => !/PRACTICE PICTURE|^message$|Unknown number|Text message/.test(line.trim())).join('\n').trim();
  expect(message).toMatch(/Grandma, please buy 3 Apple\s+gift cards and send me the\s+codes\./);
  await page.fill('#message', message);
  await expect(page.locator('#check-button')).toBeDisabled();
  await page.locator('#ocr-reviewed').check();
  await expect(page.locator('#check-button')).toBeEnabled();
  await page.click('#check-button');
  await expect(page.locator('#result-title')).toHaveText('This message has warning signs');
  await expect(page.locator('#ocr-result-note')).toBeVisible();
  await expect(page.locator('#result-title')).not.toHaveText(/match/i);
});

test('loading an example asks before replacing the person’s own words', async ({ page }) => {
  await page.goto(CHECK);
  const confirm = page.locator('#example-confirm');
  // Loading an example folds the demo panel (startOver), so open it before each choice.
  const examples = {
    nth: n => ({ click: async () => {
      if (!(await page.locator('#demo-tools').evaluate(el => el.open))) await page.locator('#demo-tools > summary').click();
      await page.locator('#scenario-buttons button').nth(n).click();
    } })
  };

  // An empty box loads straight away.
  await examples.nth(0).click();
  const first = await page.locator('#message').inputValue();
  expect(first.length).toBeGreaterThan(0);
  await expect(confirm).toBeHidden();
  // Replacing one example with another does not ask: nothing of the person's would be lost.
  await examples.nth(1).click();
  await expect(confirm).toBeHidden();
  expect(await page.locator('#message').inputValue()).not.toBe(first);

  // The person's own words are never replaced silently.
  await page.fill('#message', 'My own message from my bank');
  await examples.nth(0).click();
  await expect(confirm).toBeVisible();
  await expect(page.locator('#example-keep')).toBeFocused();
  await expect(page.locator('#message')).toHaveValue('My own message from my bank');
  await page.locator('#example-keep').click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('#message')).toHaveValue('My own message from my bank');
  await expect(page.locator('#message')).toBeFocused();

  // An edited example counts as the person's words too.
  await examples.nth(0).click();
  await page.locator('#example-replace').click();
  await expect(page.locator('#message')).toHaveValue(first);
  await expect(page.locator('#example-loaded')).toBeVisible();
  await page.locator('#message').press('End');
  await page.keyboard.type(' plus my note');
  await examples.nth(1).click();
  await expect(confirm).toBeVisible();

  // Starting over clears the question with everything else.
  await page.locator('#reset').click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('#message')).toHaveValue('');
});

test('help remains readable in print and forced colors, with visible keyboard focus', async ({ page }) => {
  await page.goto(HELP);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  const iphone = page.locator('[data-phone-choice="iphone"]');
  await expect(iphone).toBeFocused();
  expect(await iphone.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Space');
  await expect(iphone).toHaveAttribute('aria-pressed', 'true');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await expect(iphone).toBeVisible();
  expect(await page.locator('html').evaluate(el => getComputedStyle(el).scrollBehavior)).toBe('auto');
  await page.emulateMedia({ media: 'print', forcedColors: 'none' });
  await expect(page.locator('#phone-choice')).toBeHidden();
  for (const device of await page.locator('[data-phone]').all()) await expect(device).toBeVisible();
});

test('help links also preserve screenshot review and original image text', async ({ page }) => {
  await page.goto(CHECK);
  await page.locator('#channel-text').click();
  await page.locator('#ocr-file').setInputFiles(PRACTICE_PNG);
  await expect(page.locator('#ocr-status')).toContainText('Text is ready to review', { timeout: 120000 });
  const original = await page.locator('#message').inputValue();
  const raw = await page.locator('#ocr-raw').textContent();
  await page.locator('#help-paste > summary').click();
  const opened = page.waitForEvent('popup');
  await page.locator('.howto-routes a[href="help.html#screenshots"]').click();
  const guide = await opened;
  await expect(guide.locator('#screenshots')).toBeInViewport();
  await guide.close();
  await expect(page.locator('#message')).toHaveValue(original);
  await expect(page.locator('#ocr-raw')).toHaveText(raw);
  await expect(page.locator('#submission-form')).toHaveAttribute('data-input-source', 'screenshot');
  await expect(page.locator('#ocr-reviewed')).not.toBeChecked();
  await expect(page.locator('#check-button')).toBeDisabled();
});
