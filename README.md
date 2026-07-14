# Bitcoin Trading Simulation

An interactive Bitcoin trading simulation and algorithmic trading dashboard. This project allows users to simulate Bitcoin trading in a sandbox environment with real-time price updates, technical indicators, and automated trading bots.

## Features

- **Real-Time Simulation**: Experience a live trading environment with dynamic price movements.
- **Technical Indicators**: Monitor market trends using RSI, SMA-7, and SMA-25.
- **Algorithmic Trading Bots**:
  - **SMA Crossover Bot**: Automatically trades based on Golden and Death crosses.
  - **RSI Reversal Bot**: Executes trades based on oversold and overbought conditions.
  - **Grid Trading Bot**: Places multiple orders within a price range to capture volatility.
- **Market Intelligence**: A news feed that injects volatility and market sentiment into the simulation.
- **Trading Terminal**: Manually execute market and limit orders.
- **Portfolio Tracking**: Monitor your USD and BTC balances, as well as session PnL.

## How to Open

To run the Bitcoin Trading Simulation locally, follow these steps:

1. **Install Dependencies**:
   Ensure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

2. **Start the Server**:
   Launch the Express backend:
   ```bash
   npm start
   ```

3. **Access the Application**:
   Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```

## Testing

The project includes a suite of tests to ensure core logic stability. To run the tests, use:

```bash
npm test
```

For frontend verification using Playwright:
```bash
npx playwright install
npm test # or your specific playwright command if configured
```

## License

This project is licensed under the MIT License.
