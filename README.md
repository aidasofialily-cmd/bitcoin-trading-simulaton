# Bitcoin Trading Simulation

An interactive Bitcoin trading simulation and algorithmic trading dashboard. This project allows users to simulate Bitcoin trading in a sandbox environment with real-time price updates, technical indicators, and automated trading bots.

## Features

- **Real-Time Simulation**: Experience a live trading environment with dynamic price movements generated via a Geometric Brownian Motion model.
- **Technical Indicators**: Monitor market trends using:
  - **RSI (Relative Strength Index)**: Identifies overbought (>70) and oversold (<30) conditions.
  - **SMA-7 & SMA-25**: Simple Moving Averages for short-term and medium-term trend analysis.
- **Algorithmic Trading Bots**:
  - **SMA Crossover Bot**: Executes trades based on Golden Cross (BUY) and Death Cross (SELL) signals.
  - **RSI Reversal Bot**: Automatically buys when RSI is oversold and sells when it's overbought.
  - **Grid Trading Bot**: Places multiple limit orders within a price range to capture profits from market volatility.
- **Market Intelligence**: A dynamic news feed that injects volatility and market sentiment (Bullish/Bearish/Neutral) into the simulation.
- **Trading Terminal**: Manually execute market and limit orders with real-time feedback on execution and fees.
- **Portfolio Tracking**: Real-time monitoring of USD balance, BTC holdings, and overall session PnL percentage.
- **Connectivity Monitoring**: Built-in system to monitor server status and notify users of connection issues.

## Project Structure

- `public/`: Contains the frontend assets, including the UI (`index.html`), client-side logic (`app.js`), and a copy of the simulation core.
- `src/`: Contains the source code for the `BitcoinTradingSimulation` core logic (`simulation-core.js`), used by both the server (for testing) and the client.
- `server.js`: An Express server that serves the static frontend and provides a status API.
- `tests/`: Includes unit tests for the simulation core and frontend verification tests using Playwright.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (comes with Node.js)

### Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Playwright** (optional, for frontend tests):
   ```bash
   npx playwright install chromium
   ```

### Running the Application

1. **Start the Server**:
   Launch the Express backend:
   ```bash
   npm start
   ```
   *Note: The server defaults to port 3000. You can specify a different port using the `PORT` environment variable:*
   ```bash
   PORT=8080 npm start
   ```

2. **Access the Application**:
   Open your web browser and navigate to:
   `http://localhost:3000` (or your custom port)

## Testing

The project includes a suite of tests to ensure core logic stability.

### Unit Tests
To run the simulation core unit tests:
```bash
npm test
```

### Frontend Verification
To run Playwright tests for UI verification:
```bash
npx playwright test
```

## Troubleshooting Guide

### 1. Port Already in Use
**Issue**: The server fails to start with an error like `EADDRINUSE: address already in use :::3000`.
**Solution**: Another process is using port 3000. You can either kill that process or start this server on a different port:
```bash
PORT=3001 npm start
```

### 2. "Out of Stock" Message
**Issue**: A warning appears saying "Out of Stock: No BTC available to buy."
**Description**: The simulation has a finite supply of BTC (default 10.0 BTC). If you or the bots buy up all available stock, manual BUY orders will be disabled.
**Solution**: Sell some of your BTC holdings to replenish the market stock, or use the "Reset" button to restart the simulation.

### 3. "Connection Lost" / Red Banner
**Issue**: A red banner appears at the top of the screen saying "Connection Lost".
**Description**: The frontend polls the `/api/status` endpoint every 5 seconds. This banner appears if the server becomes unreachable.
**Solution**: Ensure the Node.js server is still running in your terminal. If you restarted the server on a different port, make sure to update the URL in your browser.

### 4. Bots Not Executing Trades
**Issue**: Bots are enabled but no trades are appearing in the history.
**Description**: Bots require specific market conditions and sufficient balances:
- **SMA Crossover**: Needs a clear "cross" between SMA-7 and SMA-25.
- **RSI Reversal**: RSI must hit the oversold/overbought thresholds (30/70).
- **All Bots**: Require enough USD (for buying) or BTC (for selling) to meet minimum trade sizes.
- **Stock**: Bots cannot buy if the BTC stock is depleted.

### 5. Playwright Tests Failing
**Issue**: Running `npx playwright test` fails.
**Solution**: Ensure you have installed the necessary browser binaries using `npx playwright install chromium`. Also, ensure the server is NOT running on the same port if the test expects to launch its own instance, or check the test configuration.

## License

This project is licensed under the MIT License.
