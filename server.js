const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for SPA routes if any, or just root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// A simple API to log or store simulations if necessary, or just check status
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', service: 'Bitcoin Trading Simulation' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
