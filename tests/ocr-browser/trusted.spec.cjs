// "You don't have to decide alone" under a result: open for a warning or an unresolved result,
// sharing and copying only the fixed request, a fallback when sharing is missing or fails, and
// the result left exactly as it was.
const { test, expect } = require('@playwright/test');
const CHECK = '/T4Slvers_CAC/check.html';
const REQUEST = 'I received a message and want help checking it before I act. Can you call me?';
const MESSAGE = 'Grandma, please buy 3 Apple gift cards and send me the codes.';

// Stand-ins for the phone's share menu and the clipboard, recording what they were given.
function stubShare(page, { share = true, failShare = false, copy = true } = {}) {
  return page.addInitScript(({ share, failShare, copy }) => {
    window.handedOver = [];
    if (share) {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        window.handedOver.push({ via: 'share', ...data });
        if (failShare) throw new DOMException('Not allowed', 'NotAllowedError');
      } });
    } else {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: copy
      ? { writeText: async text => { window.handedOver.push({ via: 'copy', text }); } }
      : undefined });
  }, { share, failShare, copy });
}

async function checkMessage(page, text, channel = 'text') {
  await page.goto(CHECK);
  await page.locator(`#channel-${channel}`).click();
  await page.locator('#message').fill(text);
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toBeFocused();
}

test('under a warning the panel is open right after "Before you act", and shares only the request', async ({ page }) => {
  const outside = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:8381/')) outside.push(r.url()); });
  await stubShare(page);
  await checkMessage(page, MESSAGE);
  await expect(page.locator('#result-title')).toHaveText('Suspicious');
  const panel = page.locator('#trusted-help');
  await expect(panel).toHaveAttribute('open', '');
  const action = await page.locator('#action-note').boundingBox(), help = await panel.boundingBox();
  const next = await page.locator('.next-steps').boundingBox();
  expect(action.y < help.y && help.y < next.y).toBe(true);

  await page.getByRole('button', { name: 'Share this request' }).click();
  await page.getByRole('button', { name: 'Copy this request' }).click();
  await expect(page.locator('#request-status')).toHaveText('Copied. Paste it into a message to someone you trust.');
  const handedOver = await page.evaluate(() => window.handedOver);
  expect(handedOver).toEqual([{ via: 'share', text: REQUEST }, { via: 'copy', text: REQUEST }]);
  expect(JSON.stringify(handedOver)).not.toContain('gift');

  // Asking someone leaves the result exactly as it was.
  await expect(page.locator('#result-title')).toHaveText('Suspicious');
  await expect(page.locator('#message')).toHaveValue(MESSAGE);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('without a share menu only Copy shows; if sharing fails the reader is told what else to do', async ({ page }) => {
  await stubShare(page, { share: false });
  await checkMessage(page, MESSAGE);
  await expect(page.getByRole('button', { name: 'Share this request' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Copy this request' })).toBeVisible();

  const other = await page.context().newPage();
  await stubShare(other, { failShare: true });
  await checkMessage(other, MESSAGE);
  await other.getByRole('button', { name: 'Share this request' }).click();
  await expect(other.locator('#request-status')).toHaveText('Sharing did not open. You can copy the request instead, or read it to them on the phone.');
});

test('with neither share nor copy the request can still be read, and "No one available" opens', async ({ page }) => {
  await stubShare(page, { share: false, copy: false });
  await checkMessage(page, 'Hi, this is Dr. Patel’s office reminding you of your appointment on Tuesday at 10:30.');
  await expect(page.locator('#result-title')).toHaveText('Insufficient Evidence');
  await expect(page.locator('#trusted-help')).toHaveAttribute('open', '');
  await expect(page.locator('#share-request')).toBeHidden();
  await expect(page.locator('#copy-request')).toBeHidden();
  await expect(page.locator('#trusted-request')).toHaveText(REQUEST);
  await page.getByText('No one available? View other ways to get help.').click();
  await expect(page.locator('#no-one-available a[href^="tel:"]')).toHaveAttribute('href', 'tel:+18333728311');
  await expect(page.locator('#no-one-available')).toContainText('Closed on some holidays.');
});

test('a new check starts with the status cleared and "No one available" folded again', async ({ page }) => {
  await stubShare(page);
  await checkMessage(page, MESSAGE);
  await page.getByRole('button', { name: 'Copy this request' }).click();
  await page.getByText('No one available? View other ways to get help.').click();
  await page.locator('#start-again').click();
  await checkMessage(page, MESSAGE);
  await expect(page.locator('#request-status')).toHaveText('');
  await expect(page.locator('#no-one-available')).not.toHaveAttribute('open', '');
});
