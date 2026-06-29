const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');
const { login } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, monthlyIncome } = req.body;
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, monthly_income)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, monthly_income`,
      [email, passwordHash, firstName, lastName, monthlyIncome || 0]
    );
    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, monthlyIncome: user.monthly_income },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/forgot-password
// PoC: returns the reset token directly in the response instead of emailing it
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    // Always 200 — don't leak whether the account exists
    if (result.rows.length === 0) {
      return res.json({ message: 'If that email is registered, a reset token has been generated.' });
    }
    const userId = result.rows[0].id;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, used = false`,
      [userId, resetToken, expiresAt]
    );
    res.json({
      message: 'Reset token generated.',
      resetToken,
      pocNote: 'In production this token would be emailed. For this local proof-of-concept it is returned directly.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const result = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW() AND used = false`,
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const userId = result.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1', [userId]);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, monthly_income FROM users WHERE id = $1',
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, monthlyIncome: u.monthly_income });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth'), async (req, res) => {
  const { firstName, lastName, monthlyIncome } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, monthly_income=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, email, first_name, last_name, monthly_income`,
      [firstName, lastName, monthlyIncome, req.user.userId]
    );
    const u = result.rows[0];
    res.json({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, monthlyIncome: u.monthly_income });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
