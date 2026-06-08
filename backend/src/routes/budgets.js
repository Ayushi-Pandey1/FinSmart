const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET budgets for a month
router.get('/', auth, async (req, res) => {
  const { month } = req.query;
  const monthYear = month || new Date().toISOString().slice(0, 7);
  try {
    const budgets = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1 AND month_year = $2',
      [req.user.userId, monthYear]
    );

    const spending = await pool.query(
      `SELECT category, SUM(amount) as spent
       FROM transactions
       WHERE user_id = $1 AND to_char(transaction_date, 'YYYY-MM') = $2
       GROUP BY category`,
      [req.user.userId, monthYear]
    );

    const spendMap = {};
    spending.rows.forEach(s => { spendMap[s.category] = parseFloat(s.spent); });

    const result = budgets.rows.map(b => ({
      ...b,
      spent: spendMap[b.category] || 0,
      remaining: parseFloat(b.monthly_limit) - (spendMap[b.category] || 0),
      percentage: Math.min(100, ((spendMap[b.category] || 0) / parseFloat(b.monthly_limit)) * 100),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / PUT budget
router.post('/', auth, async (req, res) => {
  const { category, monthlyLimit, monthYear } = req.body;
  if (!category || !monthlyLimit) return res.status(400).json({ error: 'Category and limit required' });
  const my = monthYear || new Date().toISOString().slice(0, 7);
  try {
    const result = await pool.query(
      `INSERT INTO budgets (user_id, category, monthly_limit, month_year)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, category, month_year)
       DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit
       RETURNING *`,
      [req.user.userId, category, parseFloat(monthlyLimit), my]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE budget
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET compliance rate
router.get('/compliance', auth, async (req, res) => {
  const { month } = req.query;
  const monthYear = month || new Date().toISOString().slice(0, 7);
  try {
    const budgets = await pool.query(
      'SELECT * FROM budgets WHERE user_id = $1 AND month_year = $2',
      [req.user.userId, monthYear]
    );
    if (budgets.rows.length === 0) return res.json({ rate: null, message: 'No budgets set' });

    const spending = await pool.query(
      `SELECT category, SUM(amount) as spent
       FROM transactions
       WHERE user_id = $1 AND to_char(transaction_date, 'YYYY-MM') = $2
       GROUP BY category`,
      [req.user.userId, monthYear]
    );

    const spendMap = {};
    spending.rows.forEach(s => { spendMap[s.category] = parseFloat(s.spent); });

    let compliant = 0;
    budgets.rows.forEach(b => {
      const spent = spendMap[b.category] || 0;
      if (spent <= parseFloat(b.monthly_limit)) compliant++;
    });

    const rate = Math.round((compliant / budgets.rows.length) * 100);
    res.json({ rate, compliant, total: budgets.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
