const test = require('node:test');
const assert = require('node:assert');
const BitcoinTradingSimulation = require('../src/simulation-core.js');

test('BitcoinTradingSimulation - Initialization & Seeding', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 20000,
    startPrice: 60000,
    seedLength: 20,
    ticksPerCandle: 5
  });

  assert.strictEqual(sim.usdBalance, 20000);
  assert.strictEqual(sim.btcBalance, 0);
  assert.strictEqual(sim.candles.length, 20);
  assert.strictEqual(sim.prices.length, 20);
});

test('BitcoinTradingSimulation - Market Buy Order', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    startPrice: 50000,
    seedLength: 10,
    ticksPerCandle: 5
  });

  // Force price for deterministic results
  sim.currentPrice = 50000;

  const result = sim.buyMarket(5000);
  assert.strictEqual(result.success, true);

  // Fee is 0.1% of 5000 = 5 USD. Trade amount = 4995 USD.
  // 4995 / 50000 = 0.0999 BTC.
  assert.strictEqual(sim.usdBalance, 5000);
  assert.strictEqual(sim.btcBalance, 0.0999);
  assert.strictEqual(sim.transactionHistory.length, 1);
  assert.strictEqual(sim.transactionHistory[0].type, 'BUY');
  assert.strictEqual(sim.transactionHistory[0].fee, 5);
});

test('BitcoinTradingSimulation - Market Sell Order', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    initialBtc: 2,
    startPrice: 50000,
    seedLength: 10,
    ticksPerCandle: 5
  });

  sim.currentPrice = 50000;

  const result = sim.sellMarket(1);
  assert.strictEqual(result.success, true);

  // Selling 1 BTC at 50000 USD = 50000 USD.
  // Fee is 0.1% of 50000 = 50 USD.
  // Net gained = 49950 USD.
  // New USD balance = 10000 + 49950 = 59950 USD.
  assert.strictEqual(sim.btcBalance, 1);
  assert.strictEqual(sim.usdBalance, 59950);
  assert.strictEqual(sim.transactionHistory.length, 1);
  assert.strictEqual(sim.transactionHistory[0].type, 'SELL');
  assert.strictEqual(sim.transactionHistory[0].fee, 50);
});

test('BitcoinTradingSimulation - Limit Orders Placement & Execution', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    initialBtc: 1,
    startPrice: 50000,
    seedLength: 10,
    ticksPerCandle: 5
  });

  sim.currentPrice = 50000;

  // Place limit buy order: buy 0.1 BTC at 48000 USD. Total lock up = 4800 USD.
  const limitBuyRes = sim.placeLimitOrder("BUY", 48000, 0.1);
  assert.strictEqual(limitBuyRes.success, true);
  assert.strictEqual(sim.usdBalance, 5200); // 10000 - 4800
  assert.strictEqual(sim.activeLimitOrders.length, 1);

  // Place limit sell order: sell 0.5 BTC at 52000 USD.
  const limitSellRes = sim.placeLimitOrder("SELL", 52000, 0.5);
  assert.strictEqual(limitSellRes.success, true);
  assert.strictEqual(sim.btcBalance, 0.5); // 1.0 - 0.5
  assert.strictEqual(sim.activeLimitOrders.length, 2);

  // Tick the simulation, change price slightly, shouldn't trigger
  sim.currentPrice = 49000;
  sim.checkLimitOrders();
  assert.strictEqual(sim.activeLimitOrders.length, 2);

  // Tick the simulation, price hits 48000 -> BUY trigger!
  sim.currentPrice = 48000;
  let executedIds = sim.checkLimitOrders();
  assert.ok(executedIds.includes(limitBuyRes.order.id));
  assert.strictEqual(sim.activeLimitOrders.length, 1); // sell is still active

  // Check BTC balance got updated.
  // Locked USD = 4800 USD. Fee = 4.8 USD. Net = 4795.2 USD.
  // BTC bought = 4795.2 / 48000 = 0.0999 BTC.
  // New BTC = 0.5 (remaining) + 0.0999 = 0.5999 BTC.
  assert.strictEqual(sim.btcBalance, 0.5999);

  // Tick the price to 53000 -> SELL trigger!
  sim.currentPrice = 53000;
  executedIds = sim.checkLimitOrders();
  assert.ok(executedIds.includes(limitSellRes.order.id));
  assert.strictEqual(sim.activeLimitOrders.length, 0);

  // Check USD balance got updated.
  // Sold 0.5 BTC at 53000 USD = 26500 USD.
  // Fee = 26.5 USD. Net USD = 26473.5 USD.
  // New USD = 5200 (post-buy lock) + 26473.5 = 31673.5 USD.
  assert.strictEqual(sim.usdBalance, 31673.5);
});

test('BitcoinTradingSimulation - Technical Indicators (SMA, EMA, RSI)', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    startPrice: 50000,
    seedLength: 30, // seed at least 30 to get valid SMA and RSI
    ticksPerCandle: 5
  });

  assert.strictEqual(sim.sma7.length, 30);
  assert.strictEqual(sim.sma25.length, 30);
  assert.strictEqual(sim.ema7.length, 30);
  assert.strictEqual(sim.ema25.length, 30);
  assert.strictEqual(sim.rsi14.length, 30);

  // Verify RSI behaves nicely inside [0, 100] bounds
  sim.rsi14.forEach(val => {
    assert.ok(val >= 0 && val <= 100);
  });
});

test('BitcoinTradingSimulation - Bots Trigger Logic', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    startPrice: 50000,
    seedLength: 10,
    ticksPerCandle: 2
  });

  // Enable SMA Crossover and RSI Bots
  sim.toggleBot('smaCrossover');
  sim.toggleBot('rsiReversal');

  assert.strictEqual(sim.bots.smaCrossover.enabled, true);
  assert.strictEqual(sim.bots.rsiReversal.enabled, true);

  // Manually mock indicator cross to Golden Cross
  sim.sma7 = [48000, 49000, 51000];
  sim.sma25 = [50000, 50000, 50000];
  sim.prices = [48000, 49000, 51000];

  // Run Bot trades
  sim.runBots();

  // Golden cross occurred! Should have bought.
  assert.strictEqual(sim.bots.smaCrossover.lastSignal, 'BUY');
  assert.ok(sim.usdBalance < 10); // almost everything converted to BTC
  assert.ok(sim.btcBalance > 0);
});

test('BitcoinTradingSimulation - News Triggering', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    startPrice: 50000,
    seedLength: 10,
    ticksPerCandle: 5
  });

  const newsItem = sim.triggerNews({
    headline: "Massive positive news!",
    sentiment: "bullish",
    impactDrift: 0.01,
    ticks: 5
  });

  assert.strictEqual(newsItem.headline, "Massive positive news!");
  assert.strictEqual(sim.sentiment, "bullish");
  assert.strictEqual(sim.newsImpactDrift, 0.01);
  assert.strictEqual(sim.sentimentTicksLeft, 5);
  assert.strictEqual(sim.newsFeed[0].headline, "Massive positive news!");
});

test('BitcoinTradingSimulation - Out of Stock Logic', (t) => {
  const sim = new BitcoinTradingSimulation({
    initialUsd: 1000000,
    startPrice: 50000,
    btcStock: 0.5, // low stock
    seedLength: 10,
    ticksPerCandle: 5
  });

  // Try to buy more than stock
  // 50000 USD should buy 1 BTC at 50000 USD (ignoring fee for a second)
  // But stock is only 0.5
  const result = sim.buyMarket(60000);
  assert.strictEqual(result.success, true);
  assert.strictEqual(sim.btcBalance, 0.5);
  assert.strictEqual(sim.btcStock, 0);

  // Try to buy when out of stock
  const result2 = sim.buyMarket(100);
  assert.strictEqual(result2.success, false);
  assert.strictEqual(result2.error, "Out of Stock: No BTC available to buy.");

  // Sell to replenish stock
  sim.sellMarket(0.2);
  assert.strictEqual(sim.btcStock, 0.2);
  assert.strictEqual(sim.btcBalance, 0.3);

  // Buy again
  const result3 = sim.buyMarket(100000);
  assert.strictEqual(result3.success, true);
  assert.strictEqual(sim.btcStock, 0);
  assert.strictEqual(sim.btcBalance, 0.5);
});
