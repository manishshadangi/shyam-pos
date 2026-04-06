const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test the connection on startup
pool.connect((err) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION ERROR:', err.stack);
  } else {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
  }
});

// API Route for Checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const { total, payment_method } = req.body;
    const result = await pool.query(
      'INSERT INTO invoices (total_amount, payment_method) VALUES ($1, $2) RETURNING id',
      [total, payment_method]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve the Frontend (This part is critical for Render)
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Render Port logic
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is live on port ${PORT}`);
});
