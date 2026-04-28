const { test } = require('@playwright/test');

test('verify eye color overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 1100 });
  await page.goto('file:///Users/kalikelaux/Desktop/wardrobeforge/project/WardrobeForge.html#/avatar');
  await page.waitForTimeout(1200);
  await page.locator('button[title="cyan"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/Users/kalikelaux/Desktop/wardrobeforge/verify-eye.png', fullPage: true });
});
