const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// POST /api/creditcard/check
router.post('/check', auth, async (req, res) => {
  try {
    const { cardName, creditLimit, apr, monthlyFee = 0, cardType = 'standard' } = req.body;
    const userId = req.user.userId;

    const userResult = await pool.query('SELECT monthly_income FROM users WHERE id = $1', [userId]);
    const monthlyIncome = parseFloat(userResult.rows[0]?.monthly_income) || 0;

    const spendResult = await pool.query(
      `SELECT SUM(amount) as total FROM transactions
       WHERE user_id = $1 AND transaction_type = 'expense'
       AND transaction_date >= NOW() - INTERVAL '90 days'`, [userId]
    );
    const avgMonthlySpend = (parseFloat(spendResult.rows[0]?.total) || 0) / 3;

    const debtResult = await pool.query(
      `SELECT SUM(amount) as total FROM transactions
       WHERE user_id = $1 AND category IN ('Loan','Debt','Credit Card')
       AND transaction_date >= NOW() - INTERVAL '90 days'`, [userId]
    );
    const avgMonthlyDebt = (parseFloat(debtResult.rows[0]?.total) || 0) / 3;

    const catResult = await pool.query(
      `SELECT category, SUM(amount) as total FROM transactions
       WHERE user_id = $1 AND transaction_type = 'expense'
       AND transaction_date >= NOW() - INTERVAL '90 days'
       GROUP BY category ORDER BY total DESC LIMIT 5`, [userId]
    );

    const limitNum = parseFloat(creditLimit) || 0;
    const aprNum = parseFloat(apr) || 0;
    const feeNum = parseFloat(monthlyFee) || 0;

    let score = 100;
    const issues = [];
    const positives = [];
    const recommendations = [];
    const studentTips = [];

    // ── Student/young adult specific scoring ──────────────────────────────

    // 1. Income — students/part-time workers often have low income
    const isLowIncome = monthlyIncome < 1500;
    const limitToIncomeRatio = monthlyIncome > 0 ? limitNum / monthlyIncome : 999;

    if (isLowIncome && limitNum > 1000) {
      score -= 25;
      issues.push(`A £${limitNum.toLocaleString()} limit is high for a monthly income of £${monthlyIncome.toFixed(0)} — common trap for students and part-time workers`);
      studentTips.push('As a student or young adult, start with a low-limit card (£500–£1,000) to build credit history safely');
    } else if (limitToIncomeRatio <= 1) {
      positives.push(`Credit limit is sensibly sized at ${limitToIncomeRatio.toFixed(1)}× your monthly income — good for credit building without overexposure`);
    }

    // 2. APR — students often carry balances after unexpected costs
    if (aprNum > 35) {
      score -= 30;
      issues.push(`${aprNum}% APR is extremely high — one missed payment on £500 costs £~${((500 * aprNum / 100) / 12).toFixed(0)}/month in interest`);
      studentTips.push('Look for student credit cards from Barclays, Aqua, or Capital One with APRs around 20–25%');
    } else if (aprNum > 25) {
      score -= 15;
      issues.push(`${aprNum}% APR is above average — manageable only if you clear the full balance every month`);
      studentTips.push('Set up a direct debit to pay the full balance monthly — prevents interest entirely');
    } else if (aprNum <= 0) {
      positives.push('0% introductory APR — excellent for building credit with no interest risk if cleared in time');
      studentTips.push('Note when the 0% period ends and set a calendar reminder to clear the balance before then');
    } else {
      positives.push(`${aprNum}% APR is reasonable — manageable if you pay in full each month`);
    }

    // 3. Monthly fee — especially impactful for students
    if (feeNum > 0) {
      const feeVsIncome = monthlyIncome > 0 ? (feeNum / monthlyIncome) * 100 : 100;
      if (feeVsIncome > 3) {
        score -= 20;
        issues.push(`£${feeNum}/month fee (£${(feeNum * 12).toFixed(0)}/year) is ${feeVsIncome.toFixed(1)}% of your income — hard to justify on a student or entry-level budget`);
        studentTips.push('Most student and young adult cards have no annual fee — Monzo, Starling, and student-specific cards are fee-free');
      } else {
        positives.push(`£${feeNum}/month fee is manageable at your income level`);
      }
    } else {
      positives.push('No monthly fee — ideal for students and those building credit on a budget');
    }

    // 4. Debt ratio — students especially shouldn't be stretched
    const newDebtRatio = monthlyIncome > 0 ? ((avgMonthlyDebt + feeNum) / monthlyIncome) * 100 : 0;
    if (newDebtRatio > 35) {
      score -= 20;
      issues.push(`Your debt payments would be ${newDebtRatio.toFixed(1)}% of income — above the 35% threshold recommended for young adults`);
      studentTips.push('Prioritise clearing existing debts (especially overdrafts) before adding credit card obligations');
    } else if (newDebtRatio > 20) {
      score -= 8;
      issues.push(`Debt ratio of ${newDebtRatio.toFixed(1)}% is approaching the caution zone — monitor closely`);
    } else {
      positives.push(`Debt-to-income ratio of ${newDebtRatio.toFixed(1)}% is healthy — well within the safe zone`);
    }

    // 5. Savings buffer — critical for students with irregular income
    const netMonthly = monthlyIncome - avgMonthlySpend - feeNum;
    const savingsRate = monthlyIncome > 0 ? (netMonthly / monthlyIncome) * 100 : 0;
    if (savingsRate < 0) {
      score -= 20;
      issues.push(`You're currently spending more than you earn — taking on credit now adds significant financial risk`);
      studentTips.push('Before applying for any credit, aim for at least 1 month of expenses saved as an emergency buffer');
    } else if (savingsRate < 5) {
      score -= 10;
      issues.push(`Savings rate of ${savingsRate.toFixed(1)}% leaves almost no buffer — one unexpected bill could force a credit card balance`);
      studentTips.push('Even saving £50/month builds an emergency fund — this reduces reliance on credit for unexpected costs');
    } else {
      positives.push(`Savings rate of ${savingsRate.toFixed(1)}% gives you a buffer — good position to manage a credit card responsibly`);
    }

    // 6. Credit building opportunity — positive framing for young adults
    if (score >= 60 && isLowIncome) {
      positives.push('Using a credit card responsibly (spending small amounts and clearing monthly) is one of the best ways to build a credit score as a young adult');
      studentTips.push('Use it for one recurring purchase like a streaming subscription — set the full direct debit — never miss a payment');
    }

    score = Math.max(0, Math.min(100, score));

    let verdict, verdictColor, verdictIcon;
    if (score >= 75) { verdict = 'Suitable for You'; verdictColor = '#10b981'; verdictIcon = '✅'; }
    else if (score >= 50) { verdict = 'Proceed with Caution'; verdictColor = '#f59e0b'; verdictIcon = '⚠️'; }
    else { verdict = 'Not Recommended Right Now'; verdictColor = '#ef4444'; verdictIcon = '❌'; }

    const balanceScenario = limitNum * 0.3;
    const monthlyInterestCost = aprNum > 0 ? (balanceScenario * (aprNum / 100)) / 12 : 0;

    res.json({
      cardName: cardName || 'Your Card',
      score,
      verdict,
      verdictColor,
      verdictIcon,
      issues,
      positives,
      recommendations,
      studentTips,
      userProfile: {
        monthlyIncome,
        avgMonthlySpend: Math.round(avgMonthlySpend * 100) / 100,
        savingsRate: Math.round(savingsRate * 10) / 10,
        newDebtRatio: Math.round(newDebtRatio * 10) / 10,
        isLowIncome,
      },
      costProjection: {
        monthlyFee: feeNum,
        annualFee: feeNum * 12,
        balanceScenario: Math.round(balanceScenario),
        monthlyInterestIfCarrying: Math.round(monthlyInterestCost * 100) / 100,
        annualCostWorstCase: Math.round(((monthlyInterestCost * 12) + (feeNum * 12)) * 100) / 100,
      },
      topCategories: catResult.rows.map(c => ({
        category: c.category,
        monthly: Math.round((parseFloat(c.total) / 3) * 100) / 100,
      })),
    });
  } catch (err) {
    console.error('Credit card check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
