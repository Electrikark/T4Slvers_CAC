const { test, expect } = require('@playwright/test');
const base = '/T4Slvers_CAC/';
const pages = ['index.html', 'check.html', 'recover.html', 'learn.html', 'about.html'];

test('home leads to practice, a real result, and recovery without sending input', async ({ page }) => {
  const outside = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin !== 'http://127.0.0.1:8381') {
      outside.push(route.request().url()); return route.abort();
    }
    return route.continue();
  });
  await page.goto(base);
  await page.getByRole('link', { name: /I want to feel prepared/ }).click();
  await expect(page).toHaveURL(/learn.html$/);
  await page.locator('#scam-family > summary').click();
  await page.getByRole('link', { name: /Try this message in the checker\s*: A grandchild/ }).click();
  await expect(page).toHaveURL(/check.html$/);
  await expect(page.locator('#message')).toHaveValue('Grandma, please buy 3 Apple gift cards and send me the codes.');
  await expect(page.locator('#example-loaded')).toContainText('Made-up');
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#channel-text')).toBeFocused();
  await page.locator('#channel-text').click();
  await page.getByRole('button', { name: 'Check this message' }).click();
  await expect(page.locator('#result-title')).toHaveText('This message has warning signs');
  await expect(page.locator('#result-title')).toBeFocused();
  await expect(page.locator('#self-check')).toBeHidden();
  await page.locator('#self-check-details > summary').click();
  await expect(page.locator('#method-options')).toBeVisible();
  await page.locator('#back').click();
  await expect(page.locator('#message')).toHaveValue(/Grandma/);
  await page.locator('#check-button').click();
  await expect(page.locator('#self-check')).toBeHidden();
  await page.locator('.recovery-link a').click();
  await expect(page).toHaveURL(/recover.html$/);
  await expect(page.locator('.urgent-step')).toBeVisible();
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test('recovery choices, official contacts, and unsaved checklist are usable', async ({ page }) => {
  await page.goto(base + 'recover.html');
  for (const id of ['code', 'remote', 'giftcard', 'money', 'identity', 'other']) {
    await page.locator(`#${id} > summary`).click();
    await expect(page.locator(`#${id} > .detail-body`)).toBeVisible();
  }
  const identityHelp = page.locator('#identity .topic-support');
  await expect(identityHelp.getByRole('link', { name: /Call Identity Theft Resource Center/ })).toHaveAttribute('href', 'tel:+18884005530');
  await expect(identityHelp).toContainText('Free guidance');
  await expect(identityHelp).toContainText('6 a.m.–5 p.m. Pacific / 9 a.m.–8 p.m. Eastern');
  await expect(page.locator('.topic-support')).toHaveCount(1);
  await page.locator('#identity').screenshot({ path: 'test-results/itrc-identity-phone.png' });
  await expect(page.locator('.hotline-number')).toHaveAttribute('href', 'tel:+18333728311');
  await expect(page.locator('.hotline-hours')).toContainText('10 a.m.–6 p.m. Eastern');
  await expect(page.locator('#hotline')).toContainText('age 60 or older');
  await expect(page.locator('#hotline a[href^="https:"]')).toHaveAttribute('href', 'https://ovc.ojp.gov/program/stop-elder-fraud/providing-help-restoring-hope');
  await page.locator('.today-list input').first().check();
  await page.reload();
  await expect(page.locator('.today-list input').first()).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('print opens all recovery choices and restores the reader’s previous choices', async ({ page }) => {
  await page.goto(base + 'recover.html');
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
  await expect(page.locator('#code')).not.toHaveAttribute('open', '');
});

test('information and recovery remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8381' + base);
  await page.getByRole('link', { name: /Something went wrong/ }).click();
  await page.locator('#money > summary').click();
  await expect(page.locator('#money > .detail-body')).toBeVisible();
  await expect(page.locator('.hotline-number')).toBeVisible();
  await expect(page.locator('#print-plan')).toBeHidden();
  await page.locator('#identity > summary').click();
  await expect(page.locator('#identity a[href="tel:+18884005530"]')).toBeVisible();
  await expect(page.locator('#identity .help-steps')).toContainText('IdentityTheft.gov');
  await expect(page.locator('#identity .topic-support a[href="https://www.idtheftcenter.org/contact-us/"]')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Learn the signs' }).click();
  await expect(page.getByRole('heading', { name: 'A pause is a powerful habit.' })).toBeVisible();
  await context.close();
});

test('skip link reaches the main content by keyboard', async ({ page }) => {
  await page.goto(base);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('all pages fit a narrow phone and a desktop with clear current-page navigation', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of pages) {
      const response = await page.goto(base + name);
      expect(response.status()).toBe(200);
      await expect(page.locator('h1:visible')).toHaveCount(1);
      await expect(page.locator('[aria-current="page"]')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const link of await page.locator('.site-nav a').all()) {
        const box = await link.boundingBox();
        expect(box.height).toBeGreaterThanOrEqual(48);
      }
      if (width === 390 || width === 1280) {
        await page.screenshot({ path: `test-results/site-${name.replace('.html', '')}-${width}.png`, fullPage: true });
      }
      // Check every local page/asset/fragment link, including the GitHub Pages subpath.
      const hrefs = await page.locator('a[href], link[href], script[src]').evaluateAll(nodes => nodes.map(node => node.href || node.src));
      for (const href of new Set(hrefs)) {
        const url = new URL(href);
        if (url.origin !== 'http://127.0.0.1:8381') continue;
        const result = await request.get(url.href);
        expect(result.status(), href).toBe(200);
        if (url.hash && url.pathname === new URL(page.url()).pathname) {
          await expect(page.locator(url.hash)).toHaveCount(1);
        }
      }
    }
  }
  expect(errors).toEqual([]);
});

test('enlarged text reflows on every page', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  for (const name of pages) {
    await page.goto(base + name);
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('unknown practice parameters cannot fill private text or auto-run a check', async ({ page }) => {
  await page.goto(base + 'check.html?example=%3Cscript%3E&message=private-text');
  await expect(page.locator('#message')).toHaveValue('');
  await expect(page.locator('#result')).toBeHidden();
  await page.locator('#channel-email').click();
  await page.locator('#message').fill('Your statement is ready at https://chase.com');
  await page.locator('#check-button').click();
  await page.locator('#start-again').click();
  await expect(page.locator('#message')).toHaveValue('');
  await expect(page.locator('#channel-email')).toHaveAttribute('aria-pressed', 'false');
});
