const { test, expect } = require('@playwright/test');

test('should show "No Internet Connection to buy" message when offline and buying', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3000');

  const btnSubmitOrder = page.locator('#btn-submit-order');
  const noInternetBuyMessage = page.locator('#no-internet-buy-message');
  const inputAmount = page.locator('#input-amount');

  // Mock fetch to return error for connection check
  await page.route('**/api/status', async route => {
    await route.fulfill({ status: 500 });
  });

  // Trigger manual connection check to set isOffline = true
  await page.evaluate(() => {
    window.checkConnectionStatus();
  });

  // Wait for connection error banner to be visible to ensure we are "offline"
  await expect(page.locator('#connection-error-banner')).toBeVisible();

  // Enter an amount
  await inputAmount.fill('100');

  // Ensure we are on BUY side (default)
  await expect(btnSubmitOrder).toHaveText(/Execute BUY Order/i);

  // Click Execute BUY Order
  await btnSubmitOrder.click();

  // Verify the no internet message is visible
  await expect(noInternetBuyMessage).toBeVisible();
  await expect(noInternetBuyMessage).toContainText('No Internet Connection to buy');

  // Mock fetch to return success
  await page.route('**/api/status', async route => {
    await route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) });
  });

  // Trigger manual connection check to set isOffline = false
  await page.evaluate(() => {
    window.checkConnectionStatus();
  });

  // Verify the message is hidden when back online
  await expect(noInternetBuyMessage).toBeHidden();
});
