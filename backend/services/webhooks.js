const crypto = require('crypto');
const { pool } = require('../db');
const { enqueueWebhookJob } = require('../queue');
const { getWebhookRetryIntervalsInSeconds } = require('../utils/paymentValidation');

function generateWebhookSignature(payloadString, webhookSecret) {
  return crypto.createHmac('sha256', webhookSecret).update(payloadString).digest('hex');
}

async function getMerchantWebhook(merchantId) {
  const result = await pool.query(
    'SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1',
    [merchantId]
  );
  return result.rows[0] || null;
}

async function createWebhookLogAndEnqueue(merchantId, event, payload) {
  const merchantWebhook = await getMerchantWebhook(merchantId);
  if (!merchantWebhook || !merchantWebhook.webhook_url) {
    return null;
  }

  const result = await pool.query(
    `INSERT INTO webhook_logs (merchant_id, event, payload, status, attempts, created_at)
     VALUES ($1, $2, $3, 'pending', 0, CURRENT_TIMESTAMP)
     RETURNING id`,
    [merchantId, event, payload]
  );

  const webhookLogId = result.rows[0].id;
  await enqueueWebhookJob(webhookLogId, 0);
  return webhookLogId;
}

async function markWebhookAttemptResult(webhookLog, updateData) {
  const {
    status,
    attempts,
    responseCode,
    responseBody,
    nextRetryAt,
    lastAttemptAt,
  } = updateData;

  await pool.query(
    `UPDATE webhook_logs
     SET status = $1,
         attempts = $2,
         response_code = $3,
         response_body = $4,
         next_retry_at = $5,
         last_attempt_at = $6
     WHERE id = $7`,
    [status, attempts, responseCode, responseBody, nextRetryAt, lastAttemptAt, webhookLog.id]
  );
}

function calculateNextRetryAt(attemptNumber) {
  const intervals = getWebhookRetryIntervalsInSeconds();
  const delaySeconds = intervals[attemptNumber] || 0;
  const nextDate = new Date(Date.now() + delaySeconds * 1000);
  return { delayMs: delaySeconds * 1000, nextDate };
}

module.exports = {
  generateWebhookSignature,
  createWebhookLogAndEnqueue,
  markWebhookAttemptResult,
  calculateNextRetryAt,
  getMerchantWebhook,
};
