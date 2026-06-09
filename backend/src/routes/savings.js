const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all goals
router.get('/', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(r.rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// POST create goal
router.post('/', auth, async (req, res) => {
  try {
    const { goalName, targetAmount, currentAmount = 0, targetDate, category = 'General' } = req.body;
    const r = await pool.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, target_date, category)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.userId, goalName, targetAmount, currentAmount, targetDate || null, category]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// PUT update progress
router.put('/:id', auth, async (req, res) => {
  try {
    const { currentAmount } = req.body;
    const r = await pool.query(
      `UPDATE savings_goals SET current_amount=$1, updated_at=NOW()
       WHERE id=$2 AND user_id=$3 RETURNING *`,
      [currentAmount, req.params.id, req.user.userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// DELETE goal
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM savings_goals WHERE id=$1 AND user_id=$2', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
