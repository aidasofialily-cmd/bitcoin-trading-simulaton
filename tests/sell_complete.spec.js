const { test, expect } = require('@playwright/test');

test('should show "Sell complete!" message when successfully selling BTC', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:3000');

  const btnSideBuy = page.locator('#btn-side-buy');
  const btnSideSell = page.locator('#btn-side-sell');
  const btnSubmitOrder = page.locator('#btn-submit-order');
  const sellCompleteMessage = page.locator('#sell-complete-message');
  const inputAmount = page.locator('#input-amount');

  // Verify the sell complete message is hidden initially
  await expect(sellCompleteMessage).toBeHidden();

  // Switch to SELL side
  await btnSideSell.click();
  await expect(btnSubmitOrder).toHaveText(/Execute SELL Order/i);

  // Switch back to BUY side and buy some BTC first
  await btnSideBuy.click();
  await inputAmount.fill('1000');
  await btnSubmitOrder.click();

  // Verify we bought some BTC
  await expect(page.locator('#wallet-btc')).not.toHaveText('0.00000000 BTC');

  // Switch to SELL side
  await btnSideSell.click();

  // The sell complete message should still be hidden on tab switch
  await expect(sellCompleteMessage).toBeHidden();

  // Enter amount to sell
  await inputAmount.fill('0.01');
  await btnSubmitOrder.click();

  // Verify the sell complete message is visible
  await expect(sellCompleteMessage).toBeVisible();
  await expect(sellCompleteMessage).toContainText('Sell complete!');

  // Switch back to BUY side and verify it is hidden
  await btnSideBuy.click();
  await expect(sellCompleteMessage).toBeHidden();
});
