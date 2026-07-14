// App Controller for Bitcoin Trading Simulation

let sim;
let simInterval = null;
let currentSpeed = 1; // 1 tick per second default
let isPaused = false;
let chartInstance = null;

// DOM Elements
const totalPortfolioEl = document.getElementById('total-portfolio');
const pnlPercentEl = document.getElementById('pnl-percent');
const walletUsdEl = document.getElementById('wallet-usd');
const walletBtcEl = document.getElementById('wallet-btc');

const btnPauseResume = document.getElementById('btn-pause-resume');
const btnReset = document.getElementById('btn-reset');

const speed1x = document.getElementById('speed-1x');
const speed5x = document.getElementById('speed-5x');
const speed10x = document.getElementById('speed-10x');
const simSpeedText = document.getElementById('sim-speed-text');

// Trade form
const tabMarket = document.getElementById('tab-market');
const tabLimit = document.getElementById('tab-limit');
const btnSideBuy = document.getElementById('btn-side-buy');
const btnSideSell = document.getElementById('btn-side-sell');
const limitPriceGroup = document.getElementById('limit-price-group');
const labelAmount = document.getElementById('label-amount');
const maxAvailableLabel = document.getElementById('max-available-label');
const amountPrefix = document.getElementById('amount-prefix');
const inputAmount = document.getElementById('input-amount');
const inputLimitPrice = document.getElementById('input-limit-price');
const btnSubmitOrder = document.getElementById('btn-submit-order');
const btcStockLabel = document.getElementById('btc-stock-label');
const outOfStockMessage = document.getElementById('out-of-stock-message');

// Stats bar
const priceMainEl = document.getElementById('price-main');
const priceHighEl = document.getElementById('price-high');
const priceLowEl = document.getElementById('price-low');
const marketSentimentEl = document.getElementById('market-sentiment');

// Chart stats
const rsiValEl = document.getElementById('rsi-val');
const sma7ValEl = document.getElementById('sma7-val');
const sma25ValEl = document.getElementById('sma25-val');

// News Shock
const btnTriggerNews = document.getElementById('btn-trigger-news');
const newsFeedEl = document.getElementById('news-feed');

// Bot toggles & signals
const botSmaToggle = document.getElementById('bot-sma-toggle');
const botSmaSignal = document.getElementById('bot-sma-signal');
const botRsiToggle = document.getElementById('bot-rsi-toggle');
const botRsiSignal = document.getElementById('bot-rsi-signal');
const botGridToggle = document.getElementById('bot-grid-toggle');
const botGridStatus = document.getElementById('bot-grid-status');

// Lists
const limitOrdersList = document.getElementById('limit-orders-list');
const limitOrdersCount = document.getElementById('limit-orders-count');
const txHistoryList = document.getElementById('tx-history-list');

const connectionErrorBanner = document.getElementById('connection-error-banner');
const backOnlineBanner = document.getElementById('back-online-banner');
const loadingBanner = document.getElementById('loading-banner');

// Connection logic state
let isOffline = false;
let backOnlineTimeoutId = null;

// Current Form State
let currentOrderType = 'MARKET'; // MARKET or LIMIT
let currentSide = 'BUY'; // BUY or SELL

// Initialize Simulation
function initSimulation() {
  sim = new BitcoinTradingSimulation({
    initialUsd: 10000,
    startPrice: 50000,
    seedLength: 100,
    ticksPerCandle: 5
  });

  // Seed default news
  sim.newsFeed = [
    {
      id: "NEWS-INIT-1",
      headline: "Simulation started. Bitcoin prices stable at $50,000 baseline.",
      sentiment: "neutral",
      timestamp: Date.now() - 30000
    }
  ];

  isPaused = false;
  currentSpeed = 1;
  updateSpeedUI();
  updateUI();
  initChart();
  startInterval();
}

// Chart.js Setup
function initChart() {
  const ctx = document.getElementById('trading-chart').getContext('2d');

  if (chartInstance) {
    chartInstance.destroy();
  }

  const chartData = getChartData();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'BTC Close Price ($)',
          data: chartData.prices,
          borderColor: '#10b981', // green
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.1
        },
        {
          label: 'SMA-7',
          data: chartData.sma7,
          borderColor: '#3b82f6', // blue
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          borderDash: [3, 3]
        },
        {
          label: 'SMA-25',
          data: chartData.sma25,
          borderColor: '#a855f7', // purple
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#c9d1d9',
            font: { size: 10 }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#161b22',
          titleColor: '#f0f6fc',
          bodyColor: '#c9d1d9',
          borderColor: '#30363d',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e', maxTicksLimit: 10, font: { size: 9 } }
        },
        y: {
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e', font: { size: 9 } }
        }
      }
    }
  });
}

function getChartData() {
  const candlesToRender = sim.candles.slice(-40); // show last 40 candles
  const indexOffset = sim.candles.length - candlesToRender.length;

  const labels = candlesToRender.map((c, i) => {
    const d = new Date(c.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  const prices = candlesToRender.map(c => c.close);
  const sma7 = sim.sma7.slice(-40);
  const sma25 = sim.sma25.slice(-40);

  return { labels, prices, sma7, sma25 };
}

function updateChart() {
  if (!chartInstance) return;
  const chartData = getChartData();

  chartInstance.data.labels = chartData.labels;
  chartInstance.data.datasets[0].data = chartData.prices;
  chartInstance.data.datasets[1].data = chartData.sma7;
  chartInstance.data.datasets[2].data = chartData.sma25;

  // Dynamic color depending on price vs previous candle close
  if (chartData.prices.length >= 2) {
    const lastPrice = chartData.prices[chartData.prices.length - 1];
    const prevPrice = chartData.prices[chartData.prices.length - 2];
    if (lastPrice >= prevPrice) {
      chartInstance.data.datasets[0].borderColor = '#10b981';
      chartInstance.data.datasets[0].backgroundColor = 'rgba(16, 185, 129, 0.05)';
    } else {
      chartInstance.data.datasets[0].borderColor = '#ef4444';
      chartInstance.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.05)';
    }
  }

  chartInstance.update('none'); // silent update
}

// Global Core Ticking
function startInterval() {
  if (simInterval) clearInterval(simInterval);
  if (isPaused) return;

  const msInterval = 1000 / currentSpeed;
  simInterval = setInterval(() => {
    const tickResult = sim.tick();

    // Update live stats instantly
    priceMainEl.textContent = formatUSD(tickResult.price);

    // Animate color flash based on tick gain/loss
    if (tickResult.changePercent > 0) {
      priceMainEl.className = "text-base font-extrabold text-green-400 transition-all duration-300";
    } else if (tickResult.changePercent < 0) {
      priceMainEl.className = "text-base font-extrabold text-red-400 transition-all duration-300";
    }

    if (tickResult.newCandleCreated) {
      updateChart();
    }

    updateUI();
  }, msInterval);
}

// Render overall UI Elements
function updateUI() {
  // Balances
  const totalPortfolioValue = sim.getPortfolioValue();
  const profitPct = sim.getProfitPercentage();

  totalPortfolioEl.textContent = formatUSD(totalPortfolioValue);
  pnlPercentEl.textContent = `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}%`;
  pnlPercentEl.className = `text-lg font-bold ${profitPct >= 0 ? 'text-green-400' : 'text-red-400'}`;

  walletUsdEl.textContent = formatUSD(sim.usdBalance);
  walletBtcEl.textContent = `${sim.btcBalance.toFixed(8)} BTC`;

  // Stock tracking
  btcStockLabel.textContent = `Stock: ${sim.btcStock.toFixed(4)} BTC`;
  if (sim.btcStock <= 0 && currentSide === 'BUY') {
    outOfStockMessage.classList.remove('hidden');
    btnSubmitOrder.disabled = true;
    lucide.createIcons();
  } else {
    outOfStockMessage.classList.add('hidden');
    btnSubmitOrder.disabled = false;
  }

  // Form limits & dynamic hints
  maxAvailableLabel.textContent = currentSide === 'BUY'
    ? `Max: ${formatUSD(sim.usdBalance)}`
    : `Max: ${sim.btcBalance.toFixed(6)} BTC`;

  // Price Stats
  if (sim.candles.length > 0) {
    const last40 = sim.candles.slice(-40);
    const high = Math.max(...last40.map(c => c.high));
    const low = Math.min(...last40.map(c => c.low));
    priceHighEl.textContent = formatUSD(high);
    priceLowEl.textContent = formatUSD(low);
  }

  // Sentiment
  marketSentimentEl.textContent = sim.sentiment.toUpperCase();
  if (sim.sentiment === 'bullish') {
    marketSentimentEl.className = "text-sm font-extrabold text-green-400 tracking-wider";
  } else if (sim.sentiment === 'bearish') {
    marketSentimentEl.className = "text-sm font-extrabold text-red-400 tracking-wider";
  } else {
    marketSentimentEl.className = "text-sm font-extrabold text-gray-400 tracking-wider";
  }

  // Indicators labels
  if (sim.rsi14.length > 0) {
    const currentRsi = sim.rsi14[sim.rsi14.length - 1];
    rsiValEl.textContent = currentRsi.toFixed(1);
    if (currentRsi >= 70) {
      rsiValEl.className = "text-red-500 font-bold";
    } else if (currentRsi <= 30) {
      rsiValEl.className = "text-green-500 font-bold";
    } else {
      rsiValEl.className = "text-gray-300";
    }
  }

  if (sim.sma7.length > 0) {
    sma7ValEl.textContent = formatUSD(sim.sma7[sim.sma7.length - 1]);
  }
  if (sim.sma25.length > 0) {
    sma25ValEl.textContent = formatUSD(sim.sma25[sim.sma25.length - 1]);
  }

  // Render lists
  renderLimitOrders();
  renderTransactionHistory();
  renderNewsFeed();

  // Update Bot details
  botSmaToggle.checked = sim.bots.smaCrossover.enabled;
  botSmaSignal.textContent = sim.bots.smaCrossover.lastSignal || "NONE";
  botSmaSignal.className = sim.bots.smaCrossover.lastSignal === 'BUY' ? 'text-green-400 font-bold' : (sim.bots.smaCrossover.lastSignal === 'SELL' ? 'text-red-400 font-bold' : 'text-gray-300');

  botRsiToggle.checked = sim.bots.rsiReversal.enabled;
  botRsiSignal.textContent = sim.bots.rsiReversal.lastSignal || "NONE";
  botRsiSignal.className = sim.bots.rsiReversal.lastSignal === 'BUY' ? 'text-green-400 font-bold' : (sim.bots.rsiReversal.lastSignal === 'SELL' ? 'text-red-400 font-bold' : 'text-gray-300');

  botGridToggle.checked = sim.bots.gridTrading.enabled;
  botGridStatus.innerHTML = sim.bots.gridTrading.enabled
    ? `Grids: <strong class="text-green-400">${sim.bots.gridTrading.grids.length} Active</strong>`
    : `Status: <strong class="text-gray-400">INACTIVE</strong>`;
}

// Render dynamic table rows for limit orders
function renderLimitOrders() {
  limitOrdersCount.textContent = sim.activeLimitOrders.length;

  if (sim.activeLimitOrders.length === 0) {
    limitOrdersList.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500 italic">No active limit orders.</td></tr>`;
    return;
  }

  limitOrdersList.innerHTML = sim.activeLimitOrders.map(order => `
    <tr class="border-b border-gray-800/40 hover:bg-gray-800/10">
      <td class="py-2 font-bold ${order.type === 'BUY' ? 'text-green-400' : 'text-red-400'}">${order.type}</td>
      <td class="py-2 text-right font-mono">${formatUSD(order.targetPrice)}</td>
      <td class="py-2 text-right font-mono">${order.amount.toFixed(6)} BTC</td>
      <td class="py-2 text-center">
        <button onclick="cancelOrder('${order.id}')" class="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20 transition">
          Cancel
        </button>
      </td>
    </tr>
  `).join('');
}

// Render Transaction history cards
function renderTransactionHistory() {
  if (sim.transactionHistory.length === 0) {
    txHistoryList.innerHTML = `<div class="text-center text-gray-500 italic py-4">No transactions executed yet.</div>`;
    return;
  }

  txHistoryList.innerHTML = sim.transactionHistory.map(tx => {
    const timeStr = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isBuy = tx.type === 'BUY';
    const sourceLabel = tx.isBot ? `<span class="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1 rounded text-[9px]">${tx.botName} Bot</span>` : `<span class="bg-gray-700/40 text-gray-400 px-1 rounded text-[9px]">Manual</span>`;

    return `
      <div class="bg-gray-800/20 p-2 rounded border border-gray-800/80 flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <span class="font-bold ${isBuy ? 'text-green-400' : 'text-red-400'}">${tx.type} ${tx.orderType}</span>
          <span class="text-gray-500 text-[10px]">${timeStr}</span>
        </div>
        <div class="flex justify-between text-gray-300 font-mono text-[10px]">
          <span>Size: ${tx.amount.toFixed(6)} BTC</span>
          <span>@ ${formatUSD(tx.price)}</span>
        </div>
        <div class="flex justify-between items-center text-gray-400 text-[9px] border-t border-gray-800/40 pt-1 mt-0.5">
          <span>Paid Fee: ${formatUSD(tx.fee)}</span>
          ${sourceLabel}
        </div>
      </div>
    `;
  }).join('');
}

// Render dynamic News feeds cards
function renderNewsFeed() {
  if (sim.newsFeed.length === 0) {
    newsFeedEl.innerHTML = `<div class="text-center text-gray-500 italic py-4">No active events.</div>`;
    return;
  }

  newsFeedEl.innerHTML = sim.newsFeed.map(news => {
    const isBull = news.sentiment === 'bullish';
    const isBear = news.sentiment === 'bearish';
    const cardBorder = isBull ? 'border-green-500/30 bg-green-500/5' : (isBear ? 'border-red-500/30 bg-red-500/5' : 'border-gray-800 bg-gray-800/10');
    const badgeColor = isBull ? 'text-green-400 bg-green-500/10' : (isBear ? 'text-red-400 bg-red-500/10' : 'text-gray-400 bg-gray-800');
    const timeStr = new Date(news.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return `
      <div class="p-2.5 rounded-lg border ${cardBorder} flex flex-col gap-1 transition duration-200">
        <div class="flex justify-between items-center">
          <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeColor}">${news.sentiment}</span>
          <span class="text-gray-500 text-[9px]">${timeStr}</span>
        </div>
        <p class="text-xs text-white font-medium leading-normal">${news.headline}</p>
      </div>
    `;
  }).join('');
}

// Cancel Limit Order trigger
window.cancelOrder = function(orderId) {
  const res = sim.cancelLimitOrder(orderId);
  if (res.success) {
    updateUI();
  } else {
    alert(res.error);
  }
};

// Formatting Helper
function formatUSD(val) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// Form Switchers
tabMarket.addEventListener('click', () => {
  currentOrderType = 'MARKET';
  tabMarket.className = "order-type-tab bg-blue-600 text-white text-xs py-2 rounded-md font-medium transition";
  tabLimit.className = "order-type-tab hover:text-white text-gray-400 text-xs py-2 rounded-md font-medium transition";
  limitPriceGroup.classList.add('hidden');
  updateFormLabels();
});

tabLimit.addEventListener('click', () => {
  currentOrderType = 'LIMIT';
  tabLimit.className = "order-type-tab bg-blue-600 text-white text-xs py-2 rounded-md font-medium transition";
  tabMarket.className = "order-type-tab hover:text-white text-gray-400 text-xs py-2 rounded-md font-medium transition";
  limitPriceGroup.classList.remove('hidden');
  // Populate current price as default limit price
  inputLimitPrice.value = sim.currentPrice;
  updateFormLabels();
});

btnSideBuy.addEventListener('click', () => {
  currentSide = 'BUY';
  btnSideBuy.className = "side-btn bg-green-500/20 text-green-400 border border-green-500/30 text-xs py-2 rounded-md font-bold transition";
  btnSideSell.className = "side-btn hover:bg-red-500/10 text-gray-400 text-xs py-2 rounded-md font-bold transition";
  btnSubmitOrder.className = "bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-lg shadow-green-500/15 w-full";
  btnSubmitOrder.textContent = "Execute BUY Order";
  updateFormLabels();
});

btnSideSell.addEventListener('click', () => {
  currentSide = 'SELL';
  btnSideSell.className = "side-btn bg-red-500/20 text-red-400 border border-red-500/30 text-xs py-2 rounded-md font-bold transition";
  btnSideBuy.className = "side-btn hover:bg-green-500/10 text-gray-400 text-xs py-2 rounded-md font-bold transition";
  btnSubmitOrder.className = "bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-lg transition shadow-lg shadow-red-500/15 w-full";
  btnSubmitOrder.textContent = "Execute SELL Order";
  updateFormLabels();
});

function updateFormLabels() {
  if (currentSide === 'BUY') {
    labelAmount.textContent = currentOrderType === 'MARKET' ? "Amount to Spend (USD)" : "Amount to Buy (BTC)";
    amountPrefix.textContent = currentOrderType === 'MARKET' ? "$" : "฿";
    inputAmount.placeholder = currentOrderType === 'MARKET' ? "100.00" : "0.0100";
  } else {
    labelAmount.textContent = "Amount to Sell (BTC)";
    amountPrefix.textContent = "฿";
    inputAmount.placeholder = "0.0100";
  }
  updateUI();
}

// Percent hotkeys
document.querySelectorAll('.pct-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pct = parseFloat(btn.dataset.pct);
    if (currentSide === 'BUY') {
      if (currentOrderType === 'MARKET') {
        inputAmount.value = (sim.usdBalance * pct).toFixed(2);
      } else {
        // limit buy - target btc size based on price
        const targetPrice = parseFloat(inputLimitPrice.value) || sim.currentPrice;
        const totalUsdToSpend = sim.usdBalance * pct;
        inputAmount.value = (totalUsdToSpend / targetPrice).toFixed(6);
      }
    } else {
      // Selling btc
      inputAmount.value = (sim.btcBalance * pct).toFixed(6);
    }
  });
});

// Trigger order placement
btnSubmitOrder.addEventListener('click', () => {
  const amount = parseFloat(inputAmount.value);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount.");
    return;
  }

  if (currentOrderType === 'MARKET') {
    if (currentSide === 'BUY') {
      const res = sim.buyMarket(amount);
      if (!res.success) alert(res.error);
    } else {
      const res = sim.sellMarket(amount);
      if (!res.success) alert(res.error);
    }
  } else {
    // Limit order placement
    const targetPrice = parseFloat(inputLimitPrice.value);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      alert("Please enter a valid target price.");
      return;
    }
    const res = sim.placeLimitOrder(currentSide, targetPrice, amount);
    if (!res.success) alert(res.error);
  }

  // Clear input
  inputAmount.value = '';
  updateUI();
});

// Bots Toggles listeners
botSmaToggle.addEventListener('change', () => {
  sim.toggleBot('smaCrossover');
  updateUI();
});

botRsiToggle.addEventListener('change', () => {
  sim.toggleBot('rsiReversal');
  updateUI();
});

botGridToggle.addEventListener('change', () => {
  sim.toggleBot('gridTrading');
  updateUI();
});

// News Shock triggering
btnTriggerNews.addEventListener('click', () => {
  const news = sim.triggerNews();
  updateUI();
});

// Speed Controls listeners
speed1x.addEventListener('click', () => {
  currentSpeed = 1;
  updateSpeedUI();
  startInterval();
});

speed5x.addEventListener('click', () => {
  currentSpeed = 5;
  updateSpeedUI();
  startInterval();
});

speed10x.addEventListener('click', () => {
  currentSpeed = 10;
  updateSpeedUI();
  startInterval();
});

function updateSpeedUI() {
  [speed1x, speed5x, speed10x].forEach(btn => {
    btn.className = "speed-btn hover:text-white text-gray-400 text-xs px-2.5 py-1.5 rounded-md font-medium transition";
  });

  if (currentSpeed === 1) {
    speed1x.className = "speed-btn bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-md font-medium transition";
  } else if (currentSpeed === 5) {
    speed5x.className = "speed-btn bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-md font-medium transition";
  } else if (currentSpeed === 10) {
    speed10x.className = "speed-btn bg-blue-600 text-white text-xs px-2.5 py-1.5 rounded-md font-medium transition";
  }

  simSpeedText.textContent = `${currentSpeed}x (${currentSpeed} tick${currentSpeed > 1 ? 's' : ''}/sec)`;
}

// Pause & Resume Controls
btnPauseResume.addEventListener('click', () => {
  isPaused = !isPaused;
  if (isPaused) {
    btnPauseResume.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5"></i> <span>Resume</span>`;
    clearInterval(simInterval);
    simSpeedText.textContent = "Paused";
  } else {
    btnPauseResume.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5"></i> <span>Pause</span>`;
    updateSpeedUI();
    startInterval();
  }
  lucide.createIcons();
});

// Reset Controls
btnReset.addEventListener('click', () => {
  if (confirm("Are you sure you want to reset the simulation? All history and wallet gains will be cleared.")) {
    initSimulation();
  }
});

// Connection Monitoring
let isCheckingConnection = false;

async function checkConnectionStatus() {
  if (isCheckingConnection) return;
  isCheckingConnection = true;

  // Show loading banner while checking
  if (loadingBanner) {
    loadingBanner.classList.remove('hidden');
    lucide.createIcons();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch('/api/status', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      hideConnectionError();
    } else {
      showConnectionError();
    }
  } catch (error) {
    showConnectionError();
  } finally {
    isCheckingConnection = false;
    // Hide loading banner when check is done
    if (loadingBanner) {
      loadingBanner.classList.add('hidden');
    }
  }
}

function showConnectionError() {
  isOffline = true;
  // If we lose connection, make sure the back online banner is hidden
  hideBackOnlineBanner();

  if (connectionErrorBanner) {
    if (connectionErrorBanner.classList.contains('hidden')) {
      connectionErrorBanner.classList.remove('hidden');
      lucide.createIcons();
    }
  }
}

function hideConnectionError() {
  if (connectionErrorBanner) {
    if (!connectionErrorBanner.classList.contains('hidden')) {
      connectionErrorBanner.classList.add('hidden');
    }
  }

  // If we were offline and now we're back online, show the back online banner!
  if (isOffline) {
    isOffline = false;
    showBackOnlineBanner();
  }
}

function showBackOnlineBanner() {
  if (backOnlineBanner) {
    if (backOnlineTimeoutId) {
      clearTimeout(backOnlineTimeoutId);
    }
    backOnlineBanner.classList.remove('hidden');
    lucide.createIcons();

    // Auto hide after 3 seconds
    backOnlineTimeoutId = setTimeout(() => {
      hideBackOnlineBanner();
    }, 3000);
  }
}

function hideBackOnlineBanner() {
  if (backOnlineBanner && !backOnlineBanner.classList.contains('hidden')) {
    backOnlineBanner.classList.add('hidden');
  }
  if (backOnlineTimeoutId) {
    clearTimeout(backOnlineTimeoutId);
    backOnlineTimeoutId = null;
  }
}

window.checkConnectionNow = function() {
  checkConnectionStatus();
};

// Polling for connection status every 5 seconds
setInterval(checkConnectionStatus, 5000);
// Initial check
checkConnectionStatus();

// Boot application!
window.onload = () => {
  initSimulation();
};
