const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');
const { v4: uuidv4 } = require('uuid');
const { generateOrderId } = require('../utils/idGenerator');

// ------------------ Existing endpoints ------------------

// Create Order
router.post('/', authenticate, async (req, res) => {
  const merchant = req.merchant;
  const { amount, currency = 'INR', receipt, notes } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'amount must be at least 100'
      }
    });
  }

  const orderId = generateOrderId();
  const createdAt = new Date().toISOString();
  const updatedAt = createdAt;

  try {
    const query = `
      INSERT INTO orders(id, merchant_id, amount, currency, receipt, notes, status, created_at, updated_at)
      VALUES($1,$2,$3,$4,$5,$6,'created',$7,$8)
      RETURNING *
    `;
    const values = [orderId, merchant.id, amount, currency, receipt, notes || {}, createdAt, updatedAt];
    const result = await pool.query(query, values);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Something went wrong'
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
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Something went wrong'
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
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Something went wrong'
      }
    });
  }
});

module.exports = router;
