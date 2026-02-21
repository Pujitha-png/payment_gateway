const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');
const { generateOrderId } = require('../utils/idGenerator');

async function generateUniqueOrderId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateOrderId();
    const existing = await pool.query('SELECT id FROM orders WHERE id = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate unique order id');
}

// ------------------ Existing endpoints ------------------

// Create Order
router.post('/', authenticate, async (req, res) => {
  const merchant = req.merchant;
  const { amount, currency = 'INR', receipt, notes } = req.body;

  if (!Number.isInteger(amount) || amount < 100) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'amount must be at least 100'
      }
    });
  }

  if (currency && (typeof currency !== 'string' || currency.length !== 3)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'currency must be a 3 character code'
      }
    });
  }

  if (notes !== undefined && (typeof notes !== 'object' || Array.isArray(notes) || notes === null)) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'notes must be a JSON object'
      }
    });
  }

  try {
    const orderId = await generateUniqueOrderId();
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const query = `
      INSERT INTO orders(id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
      VALUES($1,$2,$3,$4,$5,$6,'created',$7,$8)
      RETURNING *
    `;
    const values = [orderId, merchant.id, amount, currency, receipt || null, notes || {}, createdAt, updatedAt];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Unable to create order'
      }
    });
  }
});

// Get Order by ID (authenticated)
router.get('/:order_id', authenticate, async (req, res) => {
  const merchant = req.merchant;
  const { order_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id=$1 AND merchant_id=$2',
      [order_id, merchant.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Unable to fetch order'
      }
    });
  }
});

// ------------------ NEW: Public endpoint for checkout ------------------

router.get('/:order_id/public', async (req, res) => {
  const { order_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, amount, currency, status FROM orders WHERE id=$1',
      [order_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Order not found'
        }
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Unable to fetch order'
      }
    });
  }
});

module.exports = router;
