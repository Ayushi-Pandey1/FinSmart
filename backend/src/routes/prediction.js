const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Weighted moving average: more recent months get higher weight
function weightedMovingAverage(values) {
  if (values.length === 0) return 0;
  const weights = values.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weighted = values.reduce((sum, val, i) => sum + val * weights[i], 0);
  return weighted / totalWeight;
}

// GET expense predictions
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT to_char(transaction_date, 'YYYY-MM') as month,
              category, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1 AND transaction_date >= NOW() - INTERVAL '6 months'
       GROUP BY month, category
       ORDER BY month ASC, category`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ predictions: [], message: 'Not enough data for predictions' });
    }

    // Group by category
    const byCategory = {};
    result.rows.forEach(row => {
      if (!byCategory[row.category]) byCategory[row.category] = {};
      byCategory[row.category][row.month] = parseFloat(row.total);
    });

    // Get all months in range
    const allMonths = [...new Set(result.rows.map(r => r.month))].sort();
    const nextMonth = getNextMonth(allMonths[allMonths.length - 1] || new Date().toISOString().slice(0, 7));

    const predictions = Object.entries(byCategory).map(([category, monthData]) => {
      const values = allMonths.map(m => monthData[m] || 0);
      const predicted = weightedMovingAverage(values);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const trend = values.length >= 2
        ? ((values[values.length - 1] - values[0]) / values[0]) * 100
        : 0;

      return {
        category,
        predictedAmount: Math.round(predicted * 100) / 100,
        averageAmount: Math.round(average * 100) / 100,
        trend: Math.round(trend),
        trendDirection: trend > 5 ? 'up' : trend < -5 ? 'down' : 'stable',
        historicalData: allMonths.map(m => ({ month: m, amount: monthData[m] || 0 })),
        nextMonth,
      };
    });

    predictions.sort((a, b) => b.predictedAmount - a.predictedAmount);

    const totalPredicted = predictions.reduce((sum, p) => sum + p.predictedAmount, 0);
    res.json({ predictions, totalPredicted: Math.round(totalPredicted * 100) / 100, nextMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function getNextMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const next = new Date(year, month, 1);
  return next.toISOString().slice(0, 7);
}

module.exports = router;
