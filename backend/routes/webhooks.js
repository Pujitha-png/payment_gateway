const express = require('express');
const { randomBytes } = require('crypto');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');
const { enqueueWebhookJob } = require('../queue');
const { createWebhookLogAndEnqueue } = require('../services/webhooks');

router.get('/config', authenticate, async (req, res) => {
  const result = await pool.query(
    'SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1',
    [req.merchant.id]
  );
  return res.status(200).json(result.rows[0] || { webhook_url: null, webhook_secret: null });
});

router.put('/config', authenticate, async (req, res) => {
  const { webhook_url, regenerate_secret } = req.body || {};
  const nextSecret = regenerate_secret
    ? `whsec_${randomBytes(16).toString('hex').slice(0, 16)}`
    : req.merchant.webhook_secret;

  const result = await pool.query(
    `UPDATE merchants
     SET webhook_url = $1,
         webhook_secret = COALESCE($2, webhook_secret),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
     RETURNING webhook_url, webhook_secret`,
    [webhook_url || null, nextSecret || null, req.merchant.id]
  );

  return res.status(200).json(result.rows[0]);
});

router.post('/test', authenticate, async (req, res) => {
  const payload = {
    event: 'payment.pending',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      payment: {
        id: 'pay_test_webhook',
        amount: 100,
        currency: 'INR',
        status: 'pending',
      },
    },
  };

  const webhookLogId = await createWebhookLogAndEnqueue(req.merchant.id, 'payment.pending', payload);
  if (!webhookLogId) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Webhook URL is not configured',
      },
    });
  }

  return res.status(200).json({ id: webhookLogId, status: 'pending' });
});

router.get('/', authenticate, async (req, res) => {
  const limit = Math.max(1, Number(req.query.limit || 10));
  const offset = Math.max(0, Number(req.query.offset || 0));

  const [dataResult, totalResult] = await Promise.all([
    pool.query(
      `SELECT id, event, status, attempts, created_at, last_attempt_at, response_code
       FROM webhook_logs
       WHERE merchant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.merchant.id, limit, offset]
    ),
    pool.query(
      'SELECT COUNT(*)::int AS total FROM webhook_logs WHERE merchant_id = $1',
      [req.merchant.id]
    ),
  ]);

  return res.status(200).json({
    data: dataResult.rows,
    total: totalResult.rows[0].total,
    limit,
    offset,
  });
});

router.post('/:webhook_id/retry', authenticate, async (req, res) => {
  const result = await pool.query(
    `UPDATE webhook_logs
     SET attempts = 0,
         status = 'pending',
         next_retry_at = CURRENT_TIMESTAMP,
         last_attempt_at = NULL
     WHERE id = $1 AND merchant_id = $2
     RETURNING id, status`,
    [req.params.webhook_id, req.merchant.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND_ERROR',
        description: 'Webhook log not found',
      },
    });
  }

  await enqueueWebhookJob(result.rows[0].id, 0);

  return res.status(200).json({
    id: result.rows[0].id,
    status: result.rows[0].status,
    message: 'Webhook retry scheduled',
  });
});

module.exports = router;
