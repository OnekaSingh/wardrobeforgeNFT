import { test } from '@playwright/test';

test('verify eye color overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.goto('http://127.0.0.1:8000/WardrobeForge.html#/avatar', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.locator('button[title="cyan"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/Users/kalikelaux/Desktop/wardrobeforge/verify-eye.png', fullPage: true });
});
