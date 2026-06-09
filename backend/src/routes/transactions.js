const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

const EXPENSE_CATEGORIES = [
  'Housing', 'Food & Groceries', 'Transport', 'Entertainment',
  'Dining Out', 'Shopping', 'Health & Fitness', 'Utilities',
  'Subscriptions', 'Education', 'Travel', 'Savings', 'Other'
];

const INCOME_SOURCES = ['Salary', 'Freelance', 'Benefits', 'Rental Income', 'Investment', 'Gift', 'Other Income'];

function autoCategory(description) {
  const d = description.toLowerCase();
  if (/salary|payroll|wages|employer|payslip/.test(d)) return 'Salary';
  if (/freelance|invoice|client payment/.test(d)) return 'Freelance';
  if (/rent|mortgage|council tax|electricity|gas|water|broadband|internet/.test(d)) return 'Housing';
  if (/tesco|sainsbury|asda|waitrose|aldi|lidl|morrisons|grocery|supermarket/.test(d)) return 'Food & Groceries';
  if (/uber|taxi|train|bus|tube|oyster|petrol|fuel|parking|tfl/.test(d)) return 'Transport';
  if (/netflix|spotify|amazon prime|disney|cinema|theatre|game|steam/.test(d)) return 'Entertainment';
  if (/restaurant|cafe|coffee|mcdonald|kfc|pizza|deliveroo|just eat|uber eats/.test(d)) return 'Dining Out';
  if (/amazon|ebay|primark|zara|h&m|asos|nike|adidas|shopping/.test(d)) return 'Shopping';
  if (/gym|fitness|health|pharmacy|doctor|dentist|nhs/.test(d)) return 'Health & Fitness';
  if (/phone|mobile|broadband|utility|bill/.test(d)) return 'Utilities';
  if (/subscription|monthly fee/.test(d)) return 'Subscriptions';
  if (/university|course|book|tuition|school/.test(d)) return 'Education';
  if (/hotel|flight|airbnb|holiday|travel|airport/.test(d)) return 'Travel';
  if (/savings|isa|investment/.test(d)) return 'Savings';
  return 'Other';
}

// GET all transactions for user
router.get('/', auth, async (req, res) => {
  try {
    const { month, type } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.user.userId];
    if (month) {
      query += ` AND to_char(transaction_date, 'YYYY-MM') = $${params.length + 1}`;
      params.push(month);
    }
    if (type) {
      query += ` AND transaction_type = $${params.length + 1}`;
      params.push(type);
    }
    query += ' ORDER BY transaction_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET available months (for historical navigation)
router.get('/months', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT to_char(transaction_date, 'YYYY-MM') as month
       FROM transactions WHERE user_id = $1
       ORDER BY month DESC`,
      [req.user.userId]
    );
    res.json(result.rows.map(r => r.month));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST single transaction
router.post('/', auth, async (req, res) => {
  const { description, amount, category, transactionDate, transactionType, incomeSource } = req.body;
  if (!description || !amount || !transactionDate) {
    return res.status(400).json({ error: 'Description, amount and date are required' });
  }
  const type = transactionType || 'expense';
  const finalCategory = type === 'income'
    ? (incomeSource || 'Other Income')
    : (category || autoCategory(description));
  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, description, amount, category, transaction_type, income_source, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.userId, description, parseFloat(amount), finalCategory, type, incomeSource || null, transactionDate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST CSV upload
router.post('/upload-csv', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const csv = req.file.buffer.toString('utf8');
    const lines = csv.split('\n').filter(l => l.trim());
    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('date') || header.includes('description') || header.includes('amount');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const inserted = [];
    const errors = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
      if (cols.length < 3) { errors.push(`Row ${i + 2}: insufficient columns`); continue; }

      const [dateStr, description, amountStr, categoryHint, typeHint] = cols;
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) { errors.push(`Row ${i + 2}: invalid amount`); continue; }

      const txType = typeHint === 'income' ? 'income' : 'expense';
      const category = categoryHint || (txType === 'income' ? 'Other Income' : autoCategory(description));
      try {
        const result = await pool.query(
          `INSERT INTO transactions (user_id, description, amount, category, transaction_type, transaction_date)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [req.user.userId, description, Math.abs(amount), category, txType, dateStr]
        );
        inserted.push(result.rows[0]);
      } catch (e) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }

    res.json({ inserted: inserted.length, errors, transactions: inserted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV processing failed' });
  }
});

// DELETE transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET spending summary by category (expenses only)
router.get('/summary', auth, async (req, res) => {
  try {
    const { month } = req.query;
    let query = `SELECT category, SUM(amount) as total, COUNT(*) as count
                 FROM transactions WHERE user_id = $1 AND transaction_type = 'expense'`;
    const params = [req.user.userId];
    if (month) {
      query += ` AND to_char(transaction_date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    query += ' GROUP BY category ORDER BY total DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET income summary by source
router.get('/income-summary', auth, async (req, res) => {
  try {
    const { month } = req.query;
    let query = `SELECT category as source, SUM(amount) as total, COUNT(*) as count
                 FROM transactions WHERE user_id = $1 AND transaction_type = 'income'`;
    const params = [req.user.userId];
    if (month) {
      query += ` AND to_char(transaction_date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    query += ' GROUP BY category ORDER BY total DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET monthly trend (income vs expenses)
router.get('/trend', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT to_char(transaction_date, 'YYYY-MM') as month,
              transaction_type, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1
       GROUP BY month, transaction_type
       ORDER BY month ASC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET category breakdown trend (expenses only)
router.get('/category-trend', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT to_char(transaction_date, 'YYYY-MM') as month,
              category, SUM(amount) as total
       FROM transactions
       WHERE user_id = $1 AND transaction_type = 'expense'
       GROUP BY month, category
       ORDER BY month ASC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/transactions/export — download CSV
router.get('/export', auth, async (req, res) => {
  try {
    const { month } = req.query;
    let query = 'SELECT * FROM transactions WHERE user_id = $1';
    const params = [req.user.userId];
    if (month) {
      query += ` AND TO_CHAR(transaction_date, 'YYYY-MM') = $2`;
      params.push(month);
    }
    query += ' ORDER BY transaction_date DESC';
    const result = await pool.query(query, params);

    const rows = result.rows;
    const headers = ['id','description','amount','category','transaction_type','income_source','transaction_date','created_at'];
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const val = r[h] == null ? '' : String(r[h]);
        return val.includes(',') ? `"${val}"` : val;
      }).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finsmart-transactions${month ? '-' + month : ''}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

module.exports = router;
