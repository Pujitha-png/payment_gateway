require('dotenv').config();

const { Worker } = require('bullmq');
const { pool, waitForDB } = require('./db');
const {
  redisConnection,
  paymentQueue,
  webhookQueue,
  refundQueue,
  enqueueWebhookJob,
} = require('./queue');
const {
  getPaymentProcessingDelay,
  shouldPaymentSucceed,
  getRefundProcessingDelay,
} = require('./utils/paymentValidation');
const {
  createWebhookLogAndEnqueue,
  generateWebhookSignature,
  calculateNextRetryAt,
  markWebhookAttemptResult,
  getMerchantWebhook,
} = require('./services/webhooks');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enqueuePaymentEvents(merchantId, paymentRow) {
  const createdPayload = {
    event: 'payment.created',
    timestamp: Math.floor(Date.now() / 1000),
    data: { payment: paymentRow },
  };
  const pendingPayload = {
    event: 'payment.pending',
    timestamp: Math.floor(Date.now() / 1000),
    data: { payment: paymentRow },
  };
  await createWebhookLogAndEnqueue(merchantId, 'payment.created', createdPayload);
  await createWebhookLogAndEnqueue(merchantId, 'payment.pending', pendingPayload);
}

async function processPaymentJob(job) {
  const { paymentId } = job.data;
  const result = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
  const payment = result.rows[0];
  if (!payment) return;
  if (payment.status !== 'pending') return;

  const delay = getPaymentProcessingDelay();
  await sleep(delay);

  const success = shouldPaymentSucceed(payment.method);
  let updatedPayment;

  if (success) {
    const update = await pool.query(
      `UPDATE payments
       SET status = 'success', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [paymentId]
    );
    updatedPayment = update.rows[0];
  } else {
    const update = await pool.query(
      `UPDATE payments
       SET status = 'failed',
           error_code = 'PAYMENT_FAILED',
           error_description = 'Payment could not be processed',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [paymentId]
    );
    updatedPayment = update.rows[0];
  }

  const event = success ? 'payment.success' : 'payment.failed';
  const payload = {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: { payment: updatedPayment },
  };

  await createWebhookLogAndEnqueue(updatedPayment.merchant_id, event, payload);
}

async function deliverWebhookJob(job) {
  const { webhookLogId } = job.data;
  const logResult = await pool.query('SELECT * FROM webhook_logs WHERE id = $1', [webhookLogId]);
  if (logResult.rows.length === 0) return;

  const webhookLog = logResult.rows[0];
  if (webhookLog.status === 'success' || webhookLog.status === 'failed') return;

  const merchantWebhook = await getMerchantWebhook(webhookLog.merchant_id);
  if (!merchantWebhook || !merchantWebhook.webhook_url) {
    return;
  }

  if (!merchantWebhook.webhook_secret) {
    await markWebhookAttemptResult(webhookLog, {
      status: 'failed',
      attempts: Number(webhookLog.attempts || 0) + 1,
      responseCode: null,
      responseBody: 'Webhook secret not configured',
      nextRetryAt: null,
      lastAttemptAt: new Date().toISOString(),
    });
    return;
  }

  const payloadString = JSON.stringify(webhookLog.payload);
  const signature = generateWebhookSignature(payloadString, merchantWebhook.webhook_secret);
  const attempts = Number(webhookLog.attempts || 0) + 1;

  let responseCode = null;
  let responseBody = null;
  let success = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(merchantWebhook.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body: payloadString,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseCode = response.status;
    responseBody = await response.text();
    success = response.status >= 200 && response.status < 300;
  } catch (err) {
    responseBody = err.message || 'Webhook delivery failed';
  }

  if (success) {
    await markWebhookAttemptResult(webhookLog, {
      status: 'success',
      attempts,
      responseCode,
      responseBody,
      nextRetryAt: null,
      lastAttemptAt: new Date().toISOString(),
    });
    return;
  }

  if (attempts >= 5) {
    await markWebhookAttemptResult(webhookLog, {
      status: 'failed',
      attempts,
      responseCode,
      responseBody,
      nextRetryAt: null,
      lastAttemptAt: new Date().toISOString(),
    });
    return;
  }

  const { delayMs, nextDate } = calculateNextRetryAt(attempts);

  await markWebhookAttemptResult(webhookLog, {
    status: 'pending',
    attempts,
    responseCode,
    responseBody,
    nextRetryAt: nextDate.toISOString(),
    lastAttemptAt: new Date().toISOString(),
  });

  await enqueueWebhookJob(webhookLog.id, delayMs);
}

async function processRefundJob(job) {
  const { refundId } = job.data;

  const refundResult = await pool.query('SELECT * FROM refunds WHERE id = $1', [refundId]);
  const refund = refundResult.rows[0];
  if (!refund) return;
  if (refund.status !== 'pending') return;

  const paymentResult = await pool.query('SELECT * FROM payments WHERE id = $1', [refund.payment_id]);
  const payment = paymentResult.rows[0];
  if (!payment || payment.status !== 'success') return;

  const refundedResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS total
     FROM refunds
     WHERE payment_id = $1 AND status IN ('pending', 'processed')`,
    [refund.payment_id]
  );
  const totalRefunded = Number(refundedResult.rows[0].total || 0);

  if (totalRefunded > Number(payment.amount)) {
    return;
  }

  await sleep(getRefundProcessingDelay());

  const processedResult = await pool.query(
    `UPDATE refunds
     SET status = 'processed', processed_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING *`,
    [refund.id]
  );

  const processedRefund = processedResult.rows[0];

  const processedTotalResult = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS total
     FROM refunds
     WHERE payment_id = $1 AND status = 'processed'`,
    [refund.payment_id]
  );

  if (Number(processedTotalResult.rows[0].total || 0) >= Number(payment.amount)) {
    await pool.query(
      `UPDATE payments
       SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [payment.id]
    );
  }

  const payload = {
    event: 'refund.processed',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      refund: processedRefund,
      payment: {
        id: payment.id,
        amount: payment.amount,
        order_id: payment.order_id,
      },
    },
  };

  await createWebhookLogAndEnqueue(refund.merchant_id, 'refund.processed', payload);
}

async function enqueuePendingWebhookRetries() {
  const result = await pool.query(
    `SELECT id, next_retry_at
     FROM webhook_logs
     WHERE status = 'pending'
       AND next_retry_at IS NOT NULL
       AND next_retry_at <= CURRENT_TIMESTAMP`
  );

  await Promise.all(result.rows.map((row) => enqueueWebhookJob(row.id, 0)));
}

async function start() {
  await waitForDB();

  const paymentWorker = new Worker('process-payment', processPaymentJob, {
    connection: redisConnection,
  });

  const webhookWorker = new Worker('deliver-webhook', deliverWebhookJob, {
    connection: redisConnection,
  });

  const refundWorker = new Worker('process-refund', processRefundJob, {
    connection: redisConnection,
  });

  paymentWorker.on('error', (error) => console.error('Payment worker error:', error));
  webhookWorker.on('error', (error) => console.error('Webhook worker error:', error));
  refundWorker.on('error', (error) => console.error('Refund worker error:', error));

  setInterval(async () => {
    try {
      await redisConnection.set('worker:heartbeat', '1', 'EX', 15);
    } catch (error) {
      console.error('Failed to write worker heartbeat:', error.message);
    }
  }, 5000);

  setInterval(async () => {
    try {
      await enqueuePendingWebhookRetries();
    } catch (error) {
      console.error('Failed to enqueue pending webhook retries:', error.message);
    }
  }, 5000);

  console.log('✅ Worker service started');
}

start().catch((error) => {
  console.error('❌ Worker failed to start', error);
  process.exit(1);
});
