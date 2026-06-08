require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/persona', require('./routes/persona'));
app.use('/api/predictions', require('./routes/prediction'));
app.use('/api/eligibility', require('./routes/eligibility'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/creditcard', require('./routes/creditcard'));
app.use('/api/savings', require('./routes/savings'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'FinSmart', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 FinSmart API running on http://localhost:${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
});
