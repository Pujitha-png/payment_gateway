const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');
const { generatePaymentId, generateRefundId } = require('../utils/idGenerator');
const {
  validateVPA,
  normalizeCardNumber,
  luhnCheck,
  detectCardNetwork,
  validateExpiry,
} = require('../utils/paymentValidation');
const { enqueuePaymentJob, enqueueRefundJob } = require('../queue');
const { createWebhookLogAndEnqueue } = require('../services/webhooks');

function badRequest(res, code, description) {
  return res.status(400).json({ error: { code, description } });
}

function notFound(res, description) {
  return res.status(404).json({ error: { code: 'NOT_FOUND_ERROR', description } });
}

async function generateUniquePaymentId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generatePaymentId();
    const existing = await pool.query('SELECT id FROM payments WHERE id = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate unique payment id');
}

async function generateUniqueRefundId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateRefundId();
    const existing = await pool.query('SELECT id FROM refunds WHERE id = $1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }
  throw new Error('Could not generate unique refund id');
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
    status: 'pending',
    captured: false,
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
      (id, order_id, merchant_id, amount, currency, method, status, captured, vpa, card_network, card_last4, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      paymentData.id,
      paymentData.order_id,
      paymentData.merchant_id,
      paymentData.amount,
      paymentData.currency,
      paymentData.method,
      paymentData.status,
      paymentData.captured,
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

function buildPaymentWebhookPayload(event, payment) {
  return {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        vpa: payment.vpa,
        status: payment.status,
        card_network: payment.card_network,
        card_last4: payment.card_last4,
        created_at: payment.created_at,
      },
    },
  };
}

async function emitPaymentCreatedEvents(paymentData) {
  const createdPayload = buildPaymentWebhookPayload('payment.created', paymentData);
  const pendingPayload = buildPaymentWebhookPayload('payment.pending', paymentData);
  await createWebhookLogAndEnqueue(paymentData.merchant_id, 'payment.created', createdPayload);
  await createWebhookLogAndEnqueue(paymentData.merchant_id, 'payment.pending', pendingPayload);
}

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, order_id, amount, currency, method, status, captured, card_network, card_last4, vpa, created_at, updated_at FROM payments WHERE merchant_id=$1 ORDER BY created_at DESC',
      [req.merchant.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to fetch payments');
  }
});

router.post('/', authenticate, async (req, res) => {
  const idempotencyKey = req.header('Idempotency-Key');
  const { order_id } = req.body;
  if (!order_id) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'order_id is required');
  }

  try {
    if (idempotencyKey) {
      const existing = await pool.query(
        `SELECT response, expires_at
         FROM idempotency_keys
         WHERE key = $1 AND merchant_id = $2`,
        [idempotencyKey, req.merchant.id]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        if (new Date(record.expires_at).getTime() > Date.now()) {
          return res.status(201).json(record.response);
        }

        await pool.query(
          'DELETE FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
          [idempotencyKey, req.merchant.id]
        );
      }
    }

    const order = await getOrderForMerchant(order_id, req.merchant.id);
    if (!order) return notFound(res, 'Order not found');

    const created = await createPaymentRecord(order, req.body);
    if (created.error) {
      return badRequest(res, created.error.code, created.error.description);
    }

    await emitPaymentCreatedEvents(created.paymentData);
    await enqueuePaymentJob(created.paymentData.id);

    const responseBody = {
      id: created.paymentData.id,
      order_id: created.paymentData.order_id,
      amount: created.paymentData.amount,
      currency: created.paymentData.currency,
      method: created.paymentData.method,
      status: 'pending',
      captured: false,
      ...(created.paymentData.vpa ? { vpa: created.paymentData.vpa } : {}),
      ...(created.paymentData.card_network ? { card_network: created.paymentData.card_network } : {}),
      ...(created.paymentData.card_last4 ? { card_last4: created.paymentData.card_last4 } : {}),
      created_at: created.paymentData.created_at,
    };

    if (idempotencyKey) {
      await pool.query(
        `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '24 hours')
         ON CONFLICT (key, merchant_id)
         DO UPDATE SET
           response = EXCLUDED.response,
           expires_at = EXCLUDED.expires_at`,
        [idempotencyKey, req.merchant.id, responseBody]
      );
    }

    return res.status(201).json(responseBody);
  } catch (err) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to create payment');
  }
});

router.get('/:payment_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, amount, currency, method, status, vpa, card_network, card_last4,
              captured, error_code, error_description, created_at, updated_at
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

    await emitPaymentCreatedEvents(created.paymentData);
    await enqueuePaymentJob(created.paymentData.id);

    return res.status(201).json({
      id: created.paymentData.id,
      order_id: created.paymentData.order_id,
      amount: created.paymentData.amount,
      currency: created.paymentData.currency,
      method: created.paymentData.method,
      status: 'pending',
      captured: false,
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
              captured, error_code, error_description, created_at, updated_at
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

router.post('/:payment_id/capture', authenticate, async (req, res) => {
  const { amount } = req.body || {};

  try {
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND merchant_id = $2`,
      [req.params.payment_id, req.merchant.id]
    );

    if (result.rows.length === 0) return notFound(res, 'Payment not found');

    const payment = result.rows[0];
    if (payment.status !== 'success' || payment.captured === true) {
      return badRequest(res, 'BAD_REQUEST_ERROR', 'Payment not in capturable state');
    }

    if (!Number.isInteger(amount) || amount !== Number(payment.amount)) {
      return badRequest(res, 'BAD_REQUEST_ERROR', 'Capture amount must match payment amount');
    }

    const updated = await pool.query(
      `UPDATE payments
       SET captured = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, order_id, amount, currency, method, status, captured, created_at, updated_at`,
      [payment.id]
    );

    return res.status(200).json(updated.rows[0]);
  } catch (error) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to capture payment');
  }
});

router.post('/:payment_id/refunds', authenticate, async (req, res) => {
  const { amount, reason } = req.body || {};

  if (!Number.isInteger(amount) || amount <= 0) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Invalid refund amount');
  }

  try {
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
      [req.params.payment_id, req.merchant.id]
    );

    if (paymentResult.rows.length === 0) return notFound(res, 'Payment not found');

    const payment = paymentResult.rows[0];
    if (payment.status !== 'success') {
      return badRequest(res, 'BAD_REQUEST_ERROR', 'Payment not in refundable state');
    }

    const refundedResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS total
       FROM refunds
       WHERE payment_id = $1 AND status IN ('pending', 'processed')`,
      [payment.id]
    );
    const totalRefunded = Number(refundedResult.rows[0].total || 0);
    const availableAmount = Number(payment.amount) - totalRefunded;

    if (amount > availableAmount) {
      return badRequest(res, 'BAD_REQUEST_ERROR', 'Refund amount exceeds available amount');
    }

    const refundId = await generateUniqueRefundId();

    const refundInsert = await pool.query(
      `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
       RETURNING id, payment_id, amount, reason, status, created_at`,
      [refundId, payment.id, req.merchant.id, amount, reason || null]
    );

    const refund = refundInsert.rows[0];

    const payload = {
      event: 'refund.created',
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        refund,
      },
    };

    await createWebhookLogAndEnqueue(req.merchant.id, 'refund.created', payload);
    await enqueueRefundJob(refund.id);

    return res.status(201).json(refund);
  } catch (error) {
    return badRequest(res, 'BAD_REQUEST_ERROR', 'Unable to create refund');
  }
});

module.exports = router;
