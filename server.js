const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to your Supabase Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 1. GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. CREATE INVOICE (Deduct Stock & Save Sale)
app.post('/api/checkout', async (req, res) => {
  const { items, total, payment_method, customer_phone } = req.body;
  try {
    await pool.query('BEGIN');
    const invoice = await pool.query(
      'INSERT INTO invoices (total_amount, payment_method, customer_phone) VALUES ($1, $2, $3) RETURNING id',
      [total, payment_method, customer_phone]
    );

    for (let item of items) {
      await pool.query('UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2', [item.qty, item.id]);
      await pool.query('INSERT INTO invoice_items (invoice_id, product_id, qty, price) VALUES ($1, $2, $3, $4)', 
      [invoice.rows[0].id, item.id, item.qty, item.price]);
    }

    await pool.query('COMMIT');
    res.json({ success: true, invoice_id: invoice.rows[0].id });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// Serve the Frontend
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
