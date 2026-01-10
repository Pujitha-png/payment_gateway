const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

// ------------------ Helper functions ------------------
function validateVPA(vpa) {
  const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return pattern.test(vpa);
}

function luhnCheck(cardNumber) {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function detectCardNetwork(cardNumber) {
  const num = cardNumber.replace(/\D/g, '');
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^(60|65|8[1-9])/.test(num)) return 'rupay';
  return 'unknown';
}

function validateExpiry(month, year) {
  const m = parseInt(month);
  let y = parseInt(year);
  if (y < 100) y += 2000;
  const now = new Date();
  const expiry = new Date(y, m - 1, 1);
  return expiry >= new Date(now.getFullYear(), now.getMonth(), 1);
}

// ------------------ Authentication middleware ------------------
async function authenticate(req, res, next) {
  const apiKey = req.header('X-Api-Key');
  const apiSecret = req.header('X-Api-Secret');

  if (!apiKey || !apiSecret) {
    return res.status(401).json({
      error: { code: 'AUTHENTICATION_ERROR', description: 'Invalid API credentials' }
    });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE api_key=$1 AND api_secret=$2',
      [apiKey, apiSecret]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: { code: 'AUTHENTICATION_ERROR', description: 'Invalid API credentials' }
      });
    }

    req.merchant = result.rows[0];
    next();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', description: err.message }
    });
  }
}

// ------------------ NEW: Public checkout endpoint ------------------

// POST /api/v1/payments/public
router.post('/public', async (req, res) => {
  const { order_id, method, vpa, card } = req.body;

  try {
    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE id=$1',
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND_ERROR', description: 'Order not found' }
      });
    }

    const order = orderRes.rows[0];

    const paymentData = {
      id: 'pay_' + uuidv4().replace(/-/g, '').substring(0, 16),
      order_id,
      merchant_id: order.merchant_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      method,
      status: 'processing',
      created_at: new Date(),
      updated_at: new Date()
    };

    if (method === 'upi') {
      if (!vpa || !validateVPA(vpa)) {
        return res.status(400).json({
          error: { code: 'INVALID_VPA', description: 'VPA format invalid' }
        });
      }
      paymentData.vpa = vpa;
    } else if (method === 'card') {
      if (
        !card ||
        !card.number ||
        !card.expiry_month ||
        !card.expiry_year ||
        !card.cvv ||
        !card.holder_name
      ) {
        return res.status(400).json({
          error: { code: 'INVALID_CARD', description: 'Card validation failed' }
        });
      }

      if (!luhnCheck(card.number)) {
        return res.status(400).json({
          error: { code: 'INVALID_CARD', description: 'Card validation failed' }
        });
      }

      if (!validateExpiry(card.expiry_month, card.expiry_year)) {
        return res.status(400).json({
          error: { code: 'EXPIRED_CARD', description: 'Card expiry date invalid' }
        });
      }

      paymentData.card_network = detectCardNetwork(card.number);
      paymentData.card_last4 = card.number.slice(-4);
    } else {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid payment method' }
      });
    }

    await pool.query(
      `INSERT INTO payments 
       (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        paymentData.id,
        paymentData.order_id,
        paymentData.merchant_id,
        paymentData.amount,
        paymentData.currency,
        paymentData.method,
        paymentData.status,
        paymentData.vpa || null,
        paymentData.card_network || null,
        paymentData.card_last4 || null,
        paymentData.created_at,
        paymentData.updated_at
      ]
    );

    setTimeout(async () => {
      const success = true;
      await pool.query(
        `UPDATE payments SET status=$1, updated_at=$2 WHERE id=$3`,
        [success ? 'success' : 'failed', new Date(), paymentData.id]
      );
    }, 1000);

    res.status(201).json(paymentData);
  } catch (err) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', description: err.message }
    });
  }
});

// GET /api/v1/payments/:payment_id/public
router.get('/:payment_id/public', async (req, res) => {
  const { payment_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, order_id, amount, currency, method, status, created_at FROM payments WHERE id=$1',
      [payment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND_ERROR', description: 'Payment not found' }
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', description: err.message }
    });
  }
});

module.exports = router;
