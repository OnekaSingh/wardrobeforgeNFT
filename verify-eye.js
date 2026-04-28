const { chromium } = require('playwright');
(async() => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 }, deviceScaleFactor: 1 });
  await page.goto('file:///Users/kalikelaux/Desktop/wardrobeforge/project/WardrobeForge.html#/avatar', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.locator('button[title="cyan"]').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/Users/kalikelaux/Desktop/wardrobeforge/verify-eye.png', fullPage: true });
  await browser.close();
})();
