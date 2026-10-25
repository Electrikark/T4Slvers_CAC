const { test, expect } = require('@playwright/test');
const CHECK = '/T4Slvers_CAC/check.html';
async function check(page, text) {
  await page.goto(CHECK);
  await page.locator('#channel-text').click();
  await page.locator('#message').fill(text);
  await page.locator('#check-button').click();
}
test('With all panels closed, code and payment findings retain their actions and limits', async ({page}) => {
  await check(page, 'Chase: Please send us your login code. Buy gift cards and send me the codes.');
  await expect(page.locator('#result-title')).toHaveText('This message has warning signs');
  await expect(page.locator('#result-scope')).toBeVisible();
  await expect(page.locator('#result-scope')).toContainText('cannot verify who sent');
  await expect(page.locator('[data-action="codes"]')).toContainText('Do not send or read out');
  await expect(page.locator('[data-action="gifts"]')).toContainText('Do not buy gift cards');
  await expect(page.locator('#result details[open]')).toHaveCount(0);
  await expect(page.locator('#visible-limits')).toContainText('no link');
  await page.screenshot({path:'test-results/redesign-result-phone.png',fullPage:true});
  await page.setViewportSize({width:1280,height:1050});
  await page.screenshot({path:'test-results/redesign-result-desktop.png',fullPage:true});
});
test('Urgency and secrecy share a visible action without erasing either behavior', async ({page}) => {
  await check(page, 'Please act now. Keep this secret from your family.');
  const pressure = page.locator('[data-action="pressure"]');
  await expect(pressure).toHaveCount(1);
  await expect(pressure).toContainText('act quickly');
  await expect(pressure).toContainText('keep it secret');
  await expect(pressure.locator('.protective-step')).toBeVisible();
});
test('An ordinary result carries no safety assurance and keeps a next step visible', async ({page}) => {
  await check(page, 'See you at lunch on Sunday!');
  await expect(page.locator('#result-title')).toHaveText('There isn’t enough information');
  await expect(page.locator('#action-groups')).toContainText('does not establish that the message is safe');
  await expect(page.locator('.protective-step')).toBeVisible();
  await expect(page.locator('#result-scope')).toBeVisible();
});
test('A fictional reviewed record yields an exact website label, with no sender assurance', async ({page}) => {
  await page.goto(CHECK);
  await page.evaluate(() => {
    window.TFS_STORE.orgs.find(o => o.id === 'chase').humanReview = {
      reviewer:'Fictional browser fixture', date:'2026-10-12', reviewDue:'2099-12-31', sourceUrl:'https://example.invalid/fixture'
    };
  });
  await page.locator('#channel-text').click();
  await page.locator('#message').fill('Chase: Your statement is ready at https://chase.com');
  await page.locator('#check-button').click();
  await expect(page.locator('#result-title')).toHaveText('Website address matches our records');
  await expect(page.locator('#result-scope')).toContainText('cannot verify who sent');
  await expect(page.locator('#visible-limits')).toContainText('hidden links were not checked');
  await expect(page.locator('#action-groups')).toContainText('hang up');
  await page.screenshot({path:'test-results/redesign-match-phone.png',fullPage:true});
});
test('Explanation controls work by keyboard and every new check folds them again', async ({page}) => {
  await check(page, 'Grandma, please buy 3 Apple gift cards and send me the codes.');
  const why = page.locator('#why-section > summary');
  await page.keyboard.press('Tab');
  await expect(why).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#why-section')).toHaveAttribute('open','');
  await expect(page.locator('#why-list')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.locator('#why-section')).not.toHaveAttribute('open','');
  await page.keyboard.press('Tab');
  await expect(page.locator('#trusted-help > summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#followup-details > summary')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#next-list')).toBeVisible();
  await page.locator('#trusted-help > summary').click();
  await page.locator('#back').click();
  await page.locator('#check-button').click();
  await expect(page.locator('#result details[open]')).toHaveCount(0);
});
test('A recovery first step is readable with its full plan closed', async ({page}) => {
  await page.goto('/T4Slvers_CAC/recover.html');
  await expect(page.locator('#giftcard .topic-first')).toBeVisible();
  await expect(page.locator('#giftcard .topic-first')).toContainText('Call the gift card company');
  await expect(page.locator('#giftcard > .detail-body')).toBeHidden();
  await expect(page.locator('.urgent-step')).toBeVisible();
});
