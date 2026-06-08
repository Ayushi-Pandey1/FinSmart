const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

async function calculateEligibility(userId) {
  const userResult = await pool.query(
    'SELECT monthly_income FROM users WHERE id = $1',
    [userId]
  );
  const monthlyIncome = parseFloat(userResult.rows[0]?.monthly_income) || 0;
  const annualIncome = monthlyIncome * 12;

  // Get last 3 months spending
  const spendResult = await pool.query(
    `SELECT SUM(amount) as total_spent
     FROM transactions
     WHERE user_id = $1 AND transaction_type = 'expense' AND transaction_date >= NOW() - INTERVAL '90 days'`,
    [userId]
  );
  const incomeResult = await pool.query(
    `SELECT SUM(amount) as total_income
     FROM transactions
     WHERE user_id = $1 AND transaction_type = 'income' AND transaction_date >= NOW() - INTERVAL '90 days'`,
    [userId]
  );

  const totalSpent = parseFloat(spendResult.rows[0]?.total_spent) || 0;
  const totalIncome = parseFloat(incomeResult.rows[0]?.total_income) || 0;
  const effectiveIncome = totalIncome > 0 ? totalIncome / 3 : monthlyIncome;
  const avgMonthlySpend = totalSpent / 3;
  const savingsRate = effectiveIncome > 0
    ? Math.max(0, ((effectiveIncome - avgMonthlySpend) / effectiveIncome) * 100)
    : 0;

  const debtSpend = await pool.query(
    `SELECT SUM(amount) as debt_payments
     FROM transactions
     WHERE user_id = $1 AND category IN ('Loan', 'Debt')
     AND transaction_date >= NOW() - INTERVAL '90 days'`,
    [userId]
  );
  const debtRatio = monthlyIncome > 0
    ? (parseFloat(debtSpend.rows[0]?.debt_payments || 0) / 3 / monthlyIncome) * 100
    : 0;

  const products = await pool.query('SELECT * FROM financial_products ORDER BY product_type, min_income');

  const results = products.rows.map(product => {
    let eligible = true;
    const tips = [];
    let score = 100;

    if (annualIncome < parseFloat(product.min_income)) {
      eligible = false;
      score -= 40;
      tips.push(`Increase annual income to at least £${product.min_income.toLocaleString()}`);
    }
    if (annualIncome > parseFloat(product.max_income)) {
      eligible = false;
      score -= 20;
      tips.push('Your income exceeds the maximum threshold for this product');
    }
    if (savingsRate < parseFloat(product.min_savings_rate)) {
      if (product.min_savings_rate > 0) {
        eligible = false;
        score -= 30;
        tips.push(`Improve savings rate to at least ${product.min_savings_rate}% of income`);
      }
    }
    if (debtRatio > parseFloat(product.max_debt_ratio)) {
      eligible = false;
      score -= 30;
      tips.push(`Reduce debt repayments to below ${product.max_debt_ratio}% of monthly income`);
    }

    if (eligible && tips.length === 0) {
      tips.push('You meet all eligibility criteria for this product');
    }

    return {
      product: {
        id: product.id,
        name: product.name,
        type: product.product_type,
        description: product.description,
        provider: product.provider,
        interestRate: product.interest_rate,
      },
      isEligible: eligible,
      score: Math.max(0, score),
      improvementTips: tips,
    };
  });

  return {
    results,
    userProfile: {
      annualIncome,
      monthlyIncome,
      avgMonthlySpend: Math.round(avgMonthlySpend * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
      debtRatio: Math.round(debtRatio * 10) / 10,
    },
  };
}

// GET eligibility results
router.get('/', auth, async (req, res) => {
  try {
    const data = await calculateEligibility(req.user.userId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
