# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verify-eye.spec.mjs >> verify eye color overlay
- Location: verify-eye.spec.mjs:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[title="cyan"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5] [cursor=pointer]:
      - img "WardrobeForge" [ref=e6]
      - generic [ref=e7]: WARDROBEFORGE
    - generic [ref=e8]:
      - generic [ref=e9] [cursor=pointer]: HOME
      - generic [ref=e10] [cursor=pointer]: MY AVATAR
      - generic [ref=e11] [cursor=pointer]: CLOTHING NFTS
      - generic [ref=e12] [cursor=pointer]: PRIVACY
      - generic [ref=e13] [cursor=pointer]: TERMS
      - button "CONNECT" [ref=e14] [cursor=pointer]
  - main [ref=e15]
  - contentinfo [ref=e16]:
    - generic [ref=e17]: "? WARDROBEFORGE · 2026 · EVERY THREAD A TWIN"
    - generic [ref=e18]: HOME·AVATAR·NFTS·PRIVACY·TERMS
```

# Test source

```ts
  1  | import { test } from '@playwright/test';
  2  | 
  3  | test('verify eye color overlay', async ({ page }) => {
  4  |   await page.setViewportSize({ width: 1200, height: 1200 });
  5  |   await page.goto('http://127.0.0.1:8000/WardrobeForge.html#/avatar', { waitUntil: 'load' });
  6  |   await page.waitForTimeout(2500);
> 7  |   await page.locator('button[title="cyan"]').click();
     |                                              ^ Error: locator.click: Test timeout of 30000ms exceeded.
  8  |   await page.waitForTimeout(300);
  9  |   await page.screenshot({ path: '/Users/kalikelaux/Desktop/wardrobeforge/verify-eye.png', fullPage: true });
  10 | });
  11 | 
```