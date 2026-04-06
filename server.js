const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 1. IMPORTANT: This tells the server it's okay to accept data from your website
app.use(cors());
app.use(express.json());

// 2. Connect to Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 3. Checkout Route (Saves the Bill)
app.post('/api/checkout', async (req, res) => {
  console.log("Pay button clicked! Data received:", req.body);
  
  const { items, total, payment_method } = req.body;
  
  try {
    // Start a transaction (Ensures all data saves or nothing saves)
    await pool.query('BEGIN');
    
    // Insert into Invoices
    const invoiceResult = await pool.query(
      'INSERT INTO invoices (total_amount, payment_method) VALUES ($1, $2) RETURNING id',
      [total, payment_method]
    );
    
    const invoiceId = invoiceResult.rows[0].id;

    // Loop through items and save them
    for (let item of items) {
      await pool.query(
        'INSERT INTO invoice_items (invoice_id, product_id, qty, price) VALUES ($1, $2, $3, $4)', 
        [invoiceId, item.id, item.qty, item.price]
      );
    }

    await pool.query('COMMIT');
    console.log("Bill Saved Successfully! ID:", invoiceId);
    res.json({ success: true, invoice_id: invoiceId });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Serve the POS Screen
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Render usually uses Port 10000
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
