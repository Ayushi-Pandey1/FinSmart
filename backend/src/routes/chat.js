const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/chat
router.post('/', auth, async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const userResult = await pool.query(
      'SELECT first_name, monthly_income FROM users WHERE id = $1',
      [req.user.userId]
    );
    const user = userResult.rows[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [spendResult, incomeResult, budgetResult] = await Promise.all([
      pool.query(
        `SELECT category, SUM(amount) as total FROM transactions
         WHERE user_id=$1 AND transaction_type='expense' AND to_char(transaction_date,'YYYY-MM')=$2
         GROUP BY category ORDER BY total DESC`,
        [req.user.userId, currentMonth]
      ),
      pool.query(
        `SELECT SUM(amount) as total FROM transactions
         WHERE user_id=$1 AND transaction_type='income' AND to_char(transaction_date,'YYYY-MM')=$2`,
        [req.user.userId, currentMonth]
      ),
      pool.query(
        `SELECT b.category, b.monthly_limit, COALESCE(SUM(t.amount),0) as spent
         FROM budgets b
         LEFT JOIN transactions t ON t.user_id=b.user_id AND t.category=b.category
           AND to_char(t.transaction_date,'YYYY-MM')=b.month_year AND t.transaction_type='expense'
         WHERE b.user_id=$1 AND b.month_year=$2
         GROUP BY b.id, b.category, b.monthly_limit`,
        [req.user.userId, currentMonth]
      ),
    ]);

    const totalSpend = spendResult.rows.reduce((s, r) => s + parseFloat(r.total), 0);
    const totalIncome = parseFloat(incomeResult.rows[0]?.total) || parseFloat(user.monthly_income) || 0;
    const spendBreakdown = spendResult.rows.map(r => `${r.category}: £${parseFloat(r.total).toFixed(2)}`).join(', ');
    const budgetStatus = budgetResult.rows.map(b =>
      `${b.category}: spent £${parseFloat(b.spent).toFixed(2)} of £${parseFloat(b.monthly_limit).toFixed(2)}`
    ).join(', ');

    const systemContext = `You are FinSmart AI, a friendly and knowledgeable UK personal finance assistant embedded in the FinSmart financial dashboard. You speak in a warm, approachable but professional tone. You give specific, actionable UK-focused advice.

Current user: ${user.first_name}
This month (${currentMonth}):
- Total income: £${totalIncome.toFixed(2)}
- Total expenses: £${totalSpend.toFixed(2)}
- Net: £${(totalIncome - totalSpend).toFixed(2)}
- Spending by category: ${spendBreakdown || 'No data yet'}
- Budget status: ${budgetStatus || 'No budgets set'}

You have access to their real financial data above. Reference it when relevant. Keep responses concise (2-4 paragraphs max). Use UK spellings and £ for currency. You can discuss: budgeting, saving, debt management, UK financial products (ISAs, mortgages, pension), spending habits, financial goals, and general money questions.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Build Gemini chat history - no TypeScript type annotations
    const geminiHistory = [
      {
        role: 'user',
        parts: [{ text: systemContext + '\n\nPlease acknowledge you are ready to help.' }],
      },
      {
        role: 'model',
        parts: [{ text: `Hi ${user.first_name}! I'm FinSmart AI, your personal finance assistant. I can see your financial data and I'm here to help with budgeting, saving, and any money questions. What would you like to discuss?` }],
      },
    ];

    // Append conversation history (plain JS, no type annotations)
    history.forEach(function(msg) {
      geminiHistory.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    });

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get AI response. Please try again.' });
  }
});

module.exports = router;
