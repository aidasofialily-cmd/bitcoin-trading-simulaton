/**
 * BitcoinTradingSimulation
 * Core logic for tracking balances, order matching, technical indicators,
 * price generation (Random Walk / GBM), bots, and news events.
 */

class BitcoinTradingSimulation {
  constructor(options = {}) {
    this.initialUsd = options.initialUsd || 10000;
    this.usdBalance = this.initialUsd;
    this.btcBalance = options.initialBtc || 0;
    this.btcStock = options.btcStock !== undefined ? options.btcStock : 10.0;
    this.transactionFeePercent = options.transactionFeePercent !== undefined ? options.transactionFeePercent : 0.001; // 0.1%

    this.currentPrice = options.startPrice || 50000;
    this.basePrice = this.currentPrice;

    // Simulation price generation parameters
    this.drift = options.drift !== undefined ? options.drift : 0.0001; // upward drift
    this.volatility = options.volatility !== undefined ? options.volatility : 0.003; // max change per tick

    // News & Market Sentiment
    this.sentiment = 'neutral'; // 'bullish', 'bearish', 'neutral'
    this.sentimentTicksLeft = 0;
    this.newsImpactDrift = 0;

    // Price History
    this.prices = [];
    this.candles = []; // { open, high, low, close, timestamp, volume }
    this.ticksPerCandle = options.ticksPerCandle || 5;
    this.currentCandleTicks = [];

    // Indicators History
    this.sma7 = [];
    this.sma25 = [];
    this.ema7 = [];
    this.ema25 = [];
    this.rsi14 = [];

    // Lists
    this.activeLimitOrders = [];
    this.transactionHistory = [];
    this.newsFeed = [];

    // Bots Configuration & States
    this.bots = {
      smaCrossover: {
        enabled: false,
        name: "SMA Crossover Bot",
        lastSignal: null, // 'BUY' or 'SELL'
        tradePercent: 1.0, // trade 100% of available funds
      },
      rsiReversal: {
        enabled: false,
        name: "RSI Reversal Bot",
        oversoldLimit: 30,
        overboughtLimit: 70,
        lastSignal: null,
        tradePercent: 1.0,
      },
      gridTrading: {
        enabled: false,
        name: "Grid Trading Bot",
        gridRangePercent: 0.04, // ±2% grid bounds
        gridLevels: 5,
        lowerPrice: 0,
        upperPrice: 0,
        grids: [], // { price, type, orderId, triggered }
      }
    };

    // Pre-seed some historical data so the app starts with a nice chart!
    this.seedHistory(options.seedLength || 100);
  }

  // Pre-seed price data to populate charts on first render
  seedHistory(length) {
    let price = this.currentPrice - (length * 5 * this.currentPrice * this.drift);
    if (price < 1000) price = 1000;

    for (let i = 0; i < length; i++) {
      let candleTicks = [];
      let open = price;
      let high = price;
      let low = price;

      for (let t = 0; t < this.ticksPerCandle; t++) {
        // Simple random walk for seeding
        const change = (Math.random() - 0.48) * this.volatility; // slightly bullish drift
        price = price * (1 + change);
        if (price < 100) price = 100;
        candleTicks.push(price);
        if (price > high) high = price;
        if (price < low) low = price;
      }

      const close = price;
      const timestamp = Date.now() - (length - i) * 5000; // simulated history

      this.prices.push(close);
      const candle = { open, high, low, close, timestamp, volume: Math.random() * 10 + 2 };
      this.candles.push(candle);

      // Re-calculate indicators progressively
      this.calculateIndicatorsForNewCandle();
    }

    this.currentPrice = price;
  }

  // Process a single price tick
  tick() {
    // 1. Update news/sentiment impact
    if (this.sentimentTicksLeft > 0) {
      this.sentimentTicksLeft--;
      if (this.sentimentTicksLeft === 0) {
        this.sentiment = 'neutral';
        this.newsImpactDrift = 0;
      }
    }

    // 2. Generate new price
    // Geometric Brownian Motion / Random Walk with custom drift and sentiment multiplier
    const rand = (Math.random() - 0.5) * 2; // -1 to 1
    const totalDrift = this.drift + this.newsImpactDrift;
    const priceChangePercent = totalDrift + (rand * this.volatility);

    const prevPrice = this.currentPrice;
    this.currentPrice = this.currentPrice * (1 + priceChangePercent);
    if (this.currentPrice < 100) this.currentPrice = 100;

    // Round to 2 decimals for realistic asset pricing
    this.currentPrice = Math.round(this.currentPrice * 100) / 100;

    // 3. Aggregate into candles
    this.currentCandleTicks.push(this.currentPrice);
    let newCandleCreated = false;

    if (this.currentCandleTicks.length >= this.ticksPerCandle) {
      const open = this.currentCandleTicks[0];
      const close = this.currentCandleTicks[this.currentCandleTicks.length - 1];
      const high = Math.max(...this.currentCandleTicks);
      const low = Math.min(...this.currentCandleTicks);
      const timestamp = Date.now();
      const volume = Math.random() * 5 + 0.5;

      const candle = { open, high, low, close, timestamp, volume };
      this.candles.push(candle);
      this.prices.push(close);

      // limit history arrays
      if (this.candles.length > 300) {
        this.candles.shift();
        this.prices.shift();
      }

      // Re-calculate tech indicators
      this.calculateIndicatorsForNewCandle();

      // Clear tick accumulator
      this.currentCandleTicks = [];
      newCandleCreated = true;
    }

    // 4. Process Limit Orders
    this.checkLimitOrders();

    // 5. Run Bots trading actions
    this.runBots();

    return {
      price: this.currentPrice,
      changePercent: ((this.currentPrice - prevPrice) / prevPrice) * 100,
      newCandleCreated
    };
  }

  // Calculate moving averages and RSI
  calculateIndicatorsForNewCandle() {
    // SMA-7
    if (this.prices.length >= 7) {
      const sum = this.prices.slice(-7).reduce((acc, p) => acc + p, 0);
      this.sma7.push(sum / 7);
    } else {
      this.sma7.push(this.prices[this.prices.length - 1]);
    }

    // SMA-25
    if (this.prices.length >= 25) {
      const sum = this.prices.slice(-25).reduce((acc, p) => acc + p, 0);
      this.sma25.push(sum / 25);
    } else {
      this.sma25.push(this.prices[this.prices.length - 1]);
    }

    // EMA-7
    if (this.ema7.length === 0) {
      this.ema7.push(this.prices[0]);
    } else {
      const k = 2 / (7 + 1);
      const prevEma = this.ema7[this.ema7.length - 1];
      const currentPrice = this.prices[this.prices.length - 1];
      this.ema7.push(currentPrice * k + prevEma * (1 - k));
    }

    // EMA-25
    if (this.ema25.length === 0) {
      this.ema25.push(this.prices[0]);
    } else {
      const k = 2 / (25 + 1);
      const prevEma = this.ema25[this.ema25.length - 1];
      const currentPrice = this.prices[this.prices.length - 1];
      this.ema25.push(currentPrice * k + prevEma * (1 - k));
    }

    // RSI-14
    if (this.prices.length >= 15) {
      let gains = 0;
      let losses = 0;

      for (let i = this.prices.length - 14; i < this.prices.length; i++) {
        const diff = this.prices[i] - this.prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }

      let avgGain = gains / 14;
      let avgLoss = losses / 14;

      if (avgLoss === 0) {
        this.rsi14.push(100);
      } else {
        const rs = avgGain / avgLoss;
        this.rsi14.push(100 - (100 / (1 + rs)));
      }
    } else {
      this.rsi14.push(50); // Default middle ground
    }

    // Keep indicator lists matched to candle length
    if (this.sma7.length > 300) this.sma7.shift();
    if (this.sma25.length > 300) this.sma25.shift();
    if (this.ema7.length > 300) this.ema7.shift();
    if (this.ema25.length > 300) this.ema25.shift();
    if (this.rsi14.length > 300) this.rsi14.shift();
  }

  // Wallet and portfolio values
  getPortfolioValue() {
    return this.usdBalance + (this.btcBalance * this.currentPrice);
  }

  getProfitPercentage() {
    const portfolio = this.getPortfolioValue();
    return ((portfolio - this.initialUsd) / this.initialUsd) * 100;
  }

  // Trading Mechanics: Market Orders
  buyMarket(usdAmount, isBot = false, botName = "") {
    if (this.btcStock <= 0) return { success: false, error: "Out of Stock: No BTC available to buy." };
    if (usdAmount <= 0) return { success: false, error: "Invalid amount." };

    if (usdAmount > this.usdBalance) {
      usdAmount = this.usdBalance; // Auto-adjust to maximum available
    }

    if (usdAmount <= 0) {
      return { success: false, error: "Insufficient USD balance." };
    }

    let fee = usdAmount * this.transactionFeePercent;
    let usdToTrade = usdAmount - fee;
    let btcGained = usdToTrade / this.currentPrice;

    // Cap by available stock
    if (btcGained > this.btcStock) {
      btcGained = this.btcStock;
      usdToTrade = btcGained * this.currentPrice;
      usdAmount = usdToTrade / (1 - this.transactionFeePercent);
      fee = usdAmount * this.transactionFeePercent;
    }

    this.usdBalance -= usdAmount;
    this.btcBalance += btcGained;
    this.btcStock -= btcGained;

    const tx = {
      id: "TX-" + Math.floor(Math.random() * 1000000),
      type: "BUY",
      orderType: "MARKET",
      amount: btcGained,
      price: this.currentPrice,
      totalUSD: usdAmount,
      fee,
      timestamp: Date.now(),
      isBot,
      botName
    };

    this.transactionHistory.unshift(tx);
    return { success: true, tx };
  }

  sellMarket(btcAmount, isBot = false, botName = "") {
    if (btcAmount <= 0) return { success: false, error: "Invalid amount." };
    if (btcAmount > this.btcBalance) {
      btcAmount = this.btcBalance; // Auto-adjust to maximum available
    }

    if (btcAmount <= 0) {
      return { success: false, error: "Insufficient BTC balance." };
    }

    const rawUsdGained = btcAmount * this.currentPrice;
    const fee = rawUsdGained * this.transactionFeePercent;
    const usdGained = rawUsdGained - fee;

    this.btcBalance -= btcAmount;
    this.usdBalance += usdGained;
    this.btcStock += btcAmount;

    const tx = {
      id: "TX-" + Math.floor(Math.random() * 1000000),
      type: "SELL",
      orderType: "MARKET",
      amount: btcAmount,
      price: this.currentPrice,
      totalUSD: usdGained,
      fee,
      timestamp: Date.now(),
      isBot,
      botName
    };

    this.transactionHistory.unshift(tx);
    return { success: true, tx };
  }

  // Trading Mechanics: Limit Orders
  placeLimitOrder(type, targetPrice, amount) {
    if (amount <= 0 || targetPrice <= 0) {
      return { success: false, error: "Invalid target price or amount." };
    }

    const totalUSD = amount * targetPrice;

    if (type === "BUY") {
      // For buy limit order, lock up the USD
      if (totalUSD > this.usdBalance) {
        return { success: false, error: "Insufficient USD balance for limit buy." };
      }
      this.usdBalance -= totalUSD;
    } else if (type === "SELL") {
      // For sell limit order, lock up the BTC
      if (amount > this.btcBalance) {
        return { success: false, error: "Insufficient BTC balance for limit sell." };
      }
      this.btcBalance -= amount;
    } else {
      return { success: false, error: "Invalid order type." };
    }

    const order = {
      id: "LO-" + Math.floor(Math.random() * 1000000),
      type,
      targetPrice: parseFloat(targetPrice),
      amount: parseFloat(amount),
      totalUSD: parseFloat(totalUSD),
      timestamp: Date.now()
    };

    this.activeLimitOrders.push(order);
    return { success: true, order };
  }

  cancelLimitOrder(orderId) {
    const idx = this.activeLimitOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false, error: "Order not found." };

    const order = this.activeLimitOrders[idx];
    if (order.type === "BUY") {
      this.usdBalance += order.totalUSD;
    } else {
      this.btcBalance += order.amount;
    }

    this.activeLimitOrders.splice(idx, 1);
    return { success: true, orderId };
  }

  checkLimitOrders() {
    const executedOrders = [];

    // We filter out executed orders
    this.activeLimitOrders = this.activeLimitOrders.filter(order => {
      let triggered = false;

      if (order.type === "BUY" && this.currentPrice <= order.targetPrice) {
        if (this.btcStock <= 0) return true; // Keep order active if out of stock

        triggered = true;
        // Execute buy limit order
        // Note: USD was already locked (subtracted) at order placement
        let currentOrderTotalUSD = order.totalUSD;
        let fee = currentOrderTotalUSD * this.transactionFeePercent;
        let netUSD = currentOrderTotalUSD - fee;
        // The actual purchase price is the current price (often slightly lower/better than target)
        let btcGained = netUSD / this.currentPrice;

        // Cap by available stock
        if (btcGained > this.btcStock) {
          btcGained = this.btcStock;
          netUSD = btcGained * this.currentPrice;
          currentOrderTotalUSD = netUSD / (1 - this.transactionFeePercent);
          fee = currentOrderTotalUSD * this.transactionFeePercent;

          // Refund unused USD
          const refund = order.totalUSD - currentOrderTotalUSD;
          this.usdBalance += refund;
        }

        this.btcBalance += btcGained;
        this.btcStock -= btcGained;

        const tx = {
          id: "TX-" + Math.floor(Math.random() * 1000000),
          type: "BUY",
          orderType: "LIMIT",
          amount: btcGained,
          price: this.currentPrice,
          totalUSD: currentOrderTotalUSD,
          fee,
          timestamp: Date.now(),
          isBot: false
        };
        this.transactionHistory.unshift(tx);
        executedOrders.push(order.id);
        return false; // remove from list
      }

      if (order.type === "SELL" && this.currentPrice >= order.targetPrice) {
        triggered = true;
        // Execute sell limit order
        // Note: BTC was locked (subtracted) at order placement
        const rawUSD = order.amount * this.currentPrice;
        const fee = rawUSD * this.transactionFeePercent;
        const netUSD = rawUSD - fee;

        this.usdBalance += netUSD;
        this.btcStock += order.amount;

        const tx = {
          id: "TX-" + Math.floor(Math.random() * 1000000),
          type: "SELL",
          orderType: "LIMIT",
          amount: order.amount,
          price: this.currentPrice,
          totalUSD: netUSD,
          fee,
          timestamp: Date.now(),
          isBot: false
        };
        this.transactionHistory.unshift(tx);
        executedOrders.push(order.id);
        return false; // remove from list
      }

      return true; // keep in list
    });

    return executedOrders;
  }

  // Trigger simulated news
  triggerNews(event) {
    let selectedEvent = event;

    if (!selectedEvent) {
      // Pick a random news item from predefined bank
      const newsBank = [
        {
          headline: "SEC formally approves all spot Bitcoin ETF filings!",
          sentiment: "bullish",
          impactDrift: 0.005,
          ticks: 12
        },
        {
          headline: "Major global logistics firm adopts BTC for settlement.",
          sentiment: "bullish",
          impactDrift: 0.002,
          ticks: 8
        },
        {
          headline: "Rumors: Tech giant preparing to purchase $5B in BTC.",
          sentiment: "bullish",
          impactDrift: 0.0015,
          ticks: 6
        },
        {
          headline: "Leading crypto exchange suffers massive $500M exploit!",
          sentiment: "bearish",
          impactDrift: -0.006,
          ticks: 15
        },
        {
          headline: "Regulators announce strict KYC rules for unhosted wallets.",
          sentiment: "bearish",
          impactDrift: -0.002,
          ticks: 8
        },
        {
          headline: "Fears of inflation drive investors to sound-money assets.",
          sentiment: "bullish",
          impactDrift: 0.001,
          ticks: 10
        },
        {
          headline: "High-profile whale dumps 12,000 BTC onto market orderbooks.",
          sentiment: "bearish",
          impactDrift: -0.003,
          ticks: 5
        }
      ];

      selectedEvent = newsBank[Math.floor(Math.random() * newsBank.length)];
    }

    this.sentiment = selectedEvent.sentiment;
    this.newsImpactDrift = selectedEvent.impactDrift;
    this.sentimentTicksLeft = selectedEvent.ticks;

    const newsItem = {
      id: "NEWS-" + Date.now(),
      headline: selectedEvent.headline,
      sentiment: selectedEvent.sentiment,
      timestamp: Date.now()
    };

    this.newsFeed.unshift(newsItem);
    if (this.newsFeed.length > 50) this.newsFeed.pop();

    return newsItem;
  }

  // Toggle Bot State
  toggleBot(botKey) {
    if (this.bots[botKey]) {
      this.bots[botKey].enabled = !this.bots[botKey].enabled;

      // Handle initialization of Grid Trading Bot orders
      if (botKey === 'gridTrading' && this.bots.gridTrading.enabled) {
        this.initializeGridTrading();
      } else if (botKey === 'gridTrading' && !this.bots.gridTrading.enabled) {
        this.cancelGridTradingOrders();
      }

      return this.bots[botKey].enabled;
    }
    return false;
  }

  // Run Automated Trading Bots
  runBots() {
    // We run the indicators check when we have enough data
    const lastIdx = this.prices.length - 1;
    if (lastIdx < 1) return;

    // 1. SMA Crossover Bot
    if (this.bots.smaCrossover.enabled && this.sma7.length >= 2 && this.sma25.length >= 2) {
      const prevSma7 = this.sma7[this.sma7.length - 2];
      const currSma7 = this.sma7[this.sma7.length - 1];
      const prevSma25 = this.sma25[this.sma25.length - 2];
      const currSma25 = this.sma25[this.sma25.length - 1];

      // Golden Cross (Fast SMA crosses above Slow SMA) -> BUY
      if (prevSma7 <= prevSma25 && currSma7 > currSma25) {
        if (this.bots.smaCrossover.lastSignal !== 'BUY' && this.usdBalance > 5) {
          this.buyMarket(this.usdBalance * this.bots.smaCrossover.tradePercent, true, "SMA Crossover");
          this.bots.smaCrossover.lastSignal = 'BUY';
        }
      }
      // Death Cross (Fast SMA crosses below Slow SMA) -> SELL
      else if (prevSma7 >= prevSma25 && currSma7 < currSma25) {
        if (this.bots.smaCrossover.lastSignal !== 'SELL' && this.btcBalance > 0.0001) {
          this.sellMarket(this.btcBalance * this.bots.smaCrossover.tradePercent, true, "SMA Crossover");
          this.bots.smaCrossover.lastSignal = 'SELL';
        }
      }
    }

    // 2. RSI Reversal Bot
    if (this.bots.rsiReversal.enabled && this.rsi14.length >= 1) {
      const currRsi = this.rsi14[this.rsi14.length - 1];

      // Oversold (< 30) -> BUY
      if (currRsi <= this.bots.rsiReversal.oversoldLimit) {
        if (this.bots.rsiReversal.lastSignal !== 'BUY' && this.usdBalance > 5) {
          this.buyMarket(this.usdBalance * this.bots.rsiReversal.tradePercent, true, "RSI Reversal");
          this.bots.rsiReversal.lastSignal = 'BUY';
        }
      }
      // Overbought (> 70) -> SELL
      else if (currRsi >= this.bots.rsiReversal.overboughtLimit) {
        if (this.bots.rsiReversal.lastSignal !== 'SELL' && this.btcBalance > 0.0001) {
          this.sellMarket(this.btcBalance * this.bots.rsiReversal.tradePercent, true, "RSI Reversal");
          this.bots.rsiReversal.lastSignal = 'SELL';
        }
      }
    }

    // 3. Grid Trading Bot
    // Since Grid trading depends on static limit orders triggering,
    // we also check if any triggered grid levels need to be reset.
    if (this.bots.gridTrading.enabled) {
      this.maintainGridTrading();
    }
  }

  // Grid Trading Setup and Maintenance
  initializeGridTrading() {
    this.cancelGridTradingOrders(); // cancel any stale grids
    const currentPrice = this.currentPrice;
    const bot = this.bots.gridTrading;

    bot.lowerPrice = currentPrice * (1 - bot.gridRangePercent / 2);
    bot.upperPrice = currentPrice * (1 + bot.gridRangePercent / 2);
    bot.grids = [];

    const priceStep = (bot.upperPrice - bot.lowerPrice) / (bot.gridLevels - 1);

    // Distribute Grid levels
    for (let i = 0; i < bot.gridLevels; i++) {
      const gridPrice = Math.round((bot.lowerPrice + i * priceStep) * 100) / 100;

      // Determine Grid Type
      // Below current price = BUY Grid
      // Above current price = SELL Grid
      if (gridPrice < currentPrice) {
        // Place active BUY order
        // Allocate a portion of available balance
        const usdToSpend = (this.usdBalance / (bot.gridLevels)) * 0.95; // safe margin
        const btcAmount = usdToSpend / gridPrice;

        if (btcAmount > 0.0001 && usdToSpend > 5) {
          const res = this.placeLimitOrder("BUY", gridPrice, btcAmount);
          if (res.success) {
            bot.grids.push({
              price: gridPrice,
              type: "BUY",
              orderId: res.order.id,
              triggered: false
            });
          }
        }
      } else if (gridPrice > currentPrice) {
        // Place active SELL order
        const btcToSell = (this.btcBalance / (bot.gridLevels)) * 0.95; // safe margin

        if (btcToSell > 0.0001) {
          const res = this.placeLimitOrder("SELL", gridPrice, btcToSell);
          if (res.success) {
            bot.grids.push({
              price: gridPrice,
              type: "SELL",
              orderId: res.order.id,
              triggered: false
            });
          }
        }
      }
    }
  }

  maintainGridTrading() {
    const bot = this.bots.gridTrading;

    bot.grids.forEach(grid => {
      if (grid.triggered) return;

      // Check if orderId is no longer in activeLimitOrders (meaning it triggered!)
      const stillActive = this.activeLimitOrders.some(o => o.id === grid.orderId);
      if (!stillActive) {
        grid.triggered = true;

        // Automatically place opposite order at a neighboring grid tier to capture grid profit!
        // For a BUY grid that triggered (meaning we bought low), place a SELL order at gridPrice * 1.015 (or next grid level up)
        const priceStep = (bot.upperPrice - bot.lowerPrice) / (bot.gridLevels - 1);

        if (grid.type === "BUY") {
          // Triggered Buy -> place Sell Order at higher grid Price or grid + step
          const targetSellPrice = Math.round((grid.price + priceStep) * 100) / 100;
          // Calculate net BTC we bought (using grid price and approximate cost)
          const btcBought = (grid.price * 0.01) / grid.price; // or just a fixed fractional amount for bot trade consistency
          const targetBtc = 0.01; // consistent size

          if (this.btcBalance >= targetBtc) {
            const res = this.placeLimitOrder("SELL", targetSellPrice, targetBtc);
            if (res.success) {
              // Replace this grid tier
              grid.price = targetSellPrice;
              grid.type = "SELL";
              grid.orderId = res.order.id;
              grid.triggered = false;
            }
          }
        } else {
          // Triggered Sell -> place Buy Order at lower grid Price or grid - step
          const targetBuyPrice = Math.round((grid.price - priceStep) * 100) / 100;
          const targetBtc = 0.01;
          const usdRequired = targetBtc * targetBuyPrice;

          if (this.usdBalance >= usdRequired) {
            const res = this.placeLimitOrder("BUY", targetBuyPrice, targetBtc);
            if (res.success) {
              // Replace this grid tier
              grid.price = targetBuyPrice;
              grid.type = "BUY";
              grid.orderId = res.order.id;
              grid.triggered = false;
            }
          }
        }
      }
    });
  }

  cancelGridTradingOrders() {
    const bot = this.bots.gridTrading;
    bot.grids.forEach(grid => {
      this.cancelLimitOrder(grid.orderId);
    });
    bot.grids = [];
  }
}

// Export module for Node and Browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BitcoinTradingSimulation;
}
