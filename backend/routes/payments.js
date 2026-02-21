const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');
const { generatePaymentId } = require('../utils/idGenerator');

function badRequest(res, code, description) {
  return res.status(400).json({ error: { code, description } });
}

function notFound(res, description) {
  return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description } });
}

function validateVPA(vpa) {
  const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return pattern.test(vpa);
}

function normalizeCardNumber(cardNumber) {
  return String(cardNumber || '').replace(/[\s-]/g, '');
}

function luhnCheck(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function detectCardNetwork(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  const firstTwo = Number(digits.slice(0, 2));

  if (digits.startsWith('4')) return 'visa';
  if (firstTwo >= 51 && firstTwo <= 55) return 'mastercard';
  if (firstTwo === 34 || firstTwo === 37) return 'amex';
  if (digits.startsWith('60') || digits.startsWith('65') || (firstTwo >= 81 && firstTwo <= 89)) return 'rupay';

  return 'unknown';
}

function validateExpiry(monthValue, yearValue) {
  const month = Number(monthValue);
  let year = Number(yearValue);

  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year)) return false;

  if (String(yearValue).length === 2) year += 2000;
  if (String(year).length !== 4) return false;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiryMonthStart = new Date(year, month - 1, 1);
  return expiryMonthStart >= currentMonthStart;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProcessingDelay() {
  const testMode = String(process.env.TEST_MODE || 'false').toLowerCase() === 'true';
  if (testMode) {
    const delay = Number(process.env.TEST_PROCESSING_DELAY || 1000);
    return Number.isFinite(delay) && delay >= 0 ? delay : 1000;
  }

  const min = Number(process.env.PROCESSING_DELAY_MIN || 5000);
  const max = Number(process.env.PROCESSING_DELAY_MAX || 10000);
  const safeMin = Number.isFinite(min) ? min : 5000;
  const safeMax = Number.isFinite(max) ? max : 10000;
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function shouldPaymentSucceed(method) {
  const testMode = String(process.env.TEST_MODE || 'false').toLowerCase() === 'true';
  if (testMode) {
    const explicit = process.env.TEST_PAYMENT_SUCCESS;
    if (explicit === undefined) return true;
    return String(explicit).toLowerCase() !== 'false';
  }

  const upiRate = Number(process.env.UPI_SUCCESS_RATE || 0.9);
  const cardRate = Number(process.env.CARD_SUCCESS_RATE || 0.95);
  const threshold = method === 'upi' ? upiRate : cardRate;
  return Math.random() < threshold;
}

async function generateUniquePaymentId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generatePaymentId();
    const existing = await pool.query('SELECT id FROM payments WHERE id = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate unique payment id');
}

async function finalizePayment(paymentId, method) {
  const success = shouldPaymentSucceed(method);
  if (success) {
    await pool.query(
      'UPDATE payments SET status=$1, updated_at=$2 WHERE id=$3',
      ['success', new Date().toISOString(), paymentId]
    );
  } else {
    await pool.query(
      'UPDATE payments SET status=$1, error_code=$2, error_description=$3, updated_at=$4 WHERE id=$5',
      ['failed', 'PAYMENT_FAILED', 'Payment could not be processed', new Date().toISOString(), paymentId]
    );
  }
}

async function createPaymentRecord(order, payload) {
  const paymentId = await generateUniquePaymentId();

  const paymentData = {
    id: paymentId,
    order_id: order.id,
    merchant_id: order.merchant_id,
    amount: order.amount,
    currency: order.currency || 'INR',
    method: payload.method,
    status: 'processing',
    vpa: null,
    card_network: null,
    card_last4: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (payload.method === 'upi') {
    if (!payload.vpa || !validateVPA(payload.vpa)) {
      return { error: { code: 'INVALID_VPA', description: 'VPA format invalid' } };
    }
    paymentData.vpa = payload.vpa;
  } else if (payload.method === 'card') {
    const card = payload.card || {};
    if (!card.number || !card.expiry_month || !card.expiry_year || !card.cvv || !card.holder_name) {
      return { error: { code: 'INVALID_CARD', description: 'Card validation failed' } };
    }

    if (!luhnCheck(card.number)) {
      return { error: { code: 'INVALID_CARD', description: 'Card validation failed' } };
    }

    if (!validateExpiry(card.expiry_month, card.expiry_year)) {
      return { error: { code: 'EXPIRED_CARD', description: 'Card expiry date invalid' } };
    }

    const normalized = normalizeCardNumber(card.number);
    paymentData.card_network = detectCardNetwork(normalized);
    paymentData.card_last4 = normalized.slice(-4);
  } else {
    return { error: { code: 'BAD_REQUEST_ERROR', description: 'Invalid payment method' } };
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
      paymentData.vpa,
      paymentData.card_network,
      paymentData.card_last4,
      paymentData.created_at,
      paymentData.updated_at,
    ]
  );

  return { paymentData };
}

async function getOrderForMerchant(orderId, merchantId) {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1 AND merchant_id = $2', [orderId, merchantId]);
  return result.rows[0] || null;
}

async function getOrderPublic(orderId) {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  return result.rows[0] || null;
}

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, order_id, amount, currency, method, status, card_network, card_last4, vpa, created_at, updated_at FROM payments WHERE merchant_id=$1 ORDER BY created_at DESC',
      [req.merchant.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to fetch payments');
  }
});

router.post('/', authenticate, async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'order_id is required');
  }

  try {
    const order = await getOrderForMerchant(order_id, req.merchant.id);
    if (!order) return notFound(res, 'Order not found');

    const created = await createPaymentRecord(order, req.body);
    if (created.error) {
      return badRequest(res, created.error.code, created.error.description);
    }

    const delay = getProcessingDelay();
    setTimeout(() => {
      finalizePayment(created.paymentData.id, created.paymentData.method).catch(() => {});
    }, delay);

    await sleep(delay);
    return res.status(201).json({
      id: created.paymentData.id,
      order_id: created.paymentData.order_id,
      amount: created.paymentData.amount,
      currency: created.paymentData.currency,
      method: created.paymentData.method,
      status: 'processing',
      ...(created.paymentData.vpa ? { vpa: created.paymentData.vpa } : {}),
      ...(created.paymentData.card_network ? { card_network: created.paymentData.card_network } : {}),
      ...(created.paymentData.card_last4 ? { card_last4: created.paymentData.card_last4 } : {}),
      created_at: created.paymentData.created_at,
    });
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to create payment');
  }
});

router.get('/:payment_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, amount, currency, method, status, vpa, card_network, card_last4,
              error_code, error_description, created_at, updated_at
       FROM payments
       WHERE id=$1 AND merchant_id=$2`,
      [req.params.payment_id, req.merchant.id]
    );

    if (result.rows.length === 0) return notFound(res, 'Payment not found');
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to fetch payment');
  }
});

router.post('/public', async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'order_id is required');
  }

  try {
    const order = await getOrderPublic(order_id);
    if (!order) return notFound(res, 'Order not found');

    const created = await createPaymentRecord(order, req.body);
    if (created.error) {
      return badRequest(res, created.error.code, created.error.description);
    }

    const delay = getProcessingDelay();
    setTimeout(() => {
      finalizePayment(created.paymentData.id, created.paymentData.method).catch(() => {});
    }, delay);

    await sleep(delay);
    return res.status(201).json({
      id: created.paymentData.id,
      order_id: created.paymentData.order_id,
      amount: created.paymentData.amount,
      currency: created.paymentData.currency,
      method: created.paymentData.method,
      status: 'processing',
      ...(created.paymentData.vpa ? { vpa: created.paymentData.vpa } : {}),
      ...(created.paymentData.card_network ? { card_network: created.paymentData.card_network } : {}),
      ...(created.paymentData.card_last4 ? { card_last4: created.paymentData.card_last4 } : {}),
      created_at: created.paymentData.created_at,
    });
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to create payment');
  }
});

router.get('/:payment_id/public', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, amount, currency, method, status, vpa, card_network, card_last4,
              error_code, error_description, created_at, updated_at
       FROM payments
       WHERE id=$1`,
      [req.params.payment_id]
    );

    if (result.rows.length === 0) return notFound(res, 'Payment not found');
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to fetch payment');
  }
});

module.exports = router;
