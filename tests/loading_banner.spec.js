const { test, expect } = require('@playwright/test');

test('loading banner should be visible during connection check', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3000');

  const loadingBanner = page.locator('#loading-banner');

  // Verify it starts hidden
  await expect(loadingBanner).toBeHidden();

  // Mock fetch to slow down the connection check so we can catch the loading banner
  await page.route('**/api/status', async route => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await route.fulfill({ status: 200, body: JSON.stringify({ status: 'running' }) });
  });

  // Trigger manual connection check
  await page.evaluate(() => {
    window.checkConnectionStatus();
  });

  // Now it should definitely be visible because we delayed the response
  await expect(loadingBanner).toBeVisible();

  // And it should eventually be hidden
  await expect(loadingBanner).toBeHidden({ timeout: 5000 });
});
