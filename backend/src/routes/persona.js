const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST generate persona
router.post('/generate', auth, async (req, res) => {
  try {
    const spendingResult = await pool.query(
      `SELECT category, SUM(amount) as total, COUNT(*) as count
       FROM transactions
       WHERE user_id = $1 AND transaction_date >= NOW() - INTERVAL '90 days' AND transaction_type = 'expense'
       GROUP BY category ORDER BY total DESC`,
      [req.user.userId]
    );

    const incomeResult = await pool.query(
      `SELECT SUM(amount) as total_income FROM transactions
       WHERE user_id = $1 AND transaction_date >= NOW() - INTERVAL '90 days' AND transaction_type = 'income'`,
      [req.user.userId]
    );

    const userResult = await pool.query(
      'SELECT first_name, monthly_income FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (spendingResult.rows.length === 0) {
      return res.status(400).json({ error: 'No expense transaction data found. Please add some transactions first.' });
    }

    const user = userResult.rows[0];
    const spending = spendingResult.rows;
    const totalSpend = spending.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const actualIncome = parseFloat(incomeResult.rows[0]?.total_income) || 0;
    const profileIncome = parseFloat(user.monthly_income) * 3 || 0;
    const effectiveIncome = actualIncome > 0 ? actualIncome : profileIncome;
    const savingsRate = effectiveIncome > 0 ? Math.max(0, ((effectiveIncome - totalSpend) / effectiveIncome) * 100) : 0;

    const spendingBreakdown = spending
      .map(s => `- ${s.category}: £${parseFloat(s.total).toFixed(2)} (${s.count} transactions)`)
      .join('\n');

    const prompt = `You are a friendly UK fintech financial behaviour analyst for FinSmart.

Analyse this user's data and create a personalised financial persona. Respond ONLY with valid JSON — no markdown, no code fences, no explanation before or after.

User: ${user.first_name}
Income (90 days): £${effectiveIncome.toFixed(2)}
Total Expenses (90 days): £${totalSpend.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%

Expenses by category:
${spendingBreakdown}

Return exactly this JSON structure:
{
  "personaName": "creative name e.g. The Subscription Hoarder",
  "personaEmoji": "single emoji",
  "summary": "2-3 sentences about financial personality",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "watchOuts": ["watch out 1", "watch out 2"],
  "topInsight": "one punchy specific insight",
  "actionableTip": "one concrete action for this month",
  "savingsScore": ${Math.round(Math.min(100, savingsRate * 2))}
}`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    let persona;
    try {
      // Strip any markdown fences if present
      const clean = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      persona = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    } catch (e) {
      console.error('JSON parse error, raw response:', text);
      return res.status(500).json({ error: 'AI returned an unexpected format. Please try again.' });
    }

    await pool.query(
      `INSERT INTO personas (user_id, persona_name, persona_description, insights)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, persona.personaName, persona.summary, JSON.stringify(persona)]
    );

    res.json({ ...persona, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Persona generation error:', err.message);
    res.status(500).json({ error: `Failed to generate persona: ${err.message}` });
  }
});

// GET latest persona
router.get('/latest', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM personas WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.json(null);
    const row = result.rows[0];
    try {
      const parsed = JSON.parse(row.insights);
      res.json({ ...parsed, generatedAt: row.generated_at });
    } catch {
      res.json({ personaName: row.persona_name, summary: row.persona_description, generatedAt: row.generated_at });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
