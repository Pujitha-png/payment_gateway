const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const paymentQueue = new Queue('process-payment', { connection: redisConnection });
const webhookQueue = new Queue('deliver-webhook', { connection: redisConnection });
const refundQueue = new Queue('process-refund', { connection: redisConnection });

async function enqueuePaymentJob(paymentId) {
  return paymentQueue.add('process-payment', { paymentId });
}

async function enqueueRefundJob(refundId) {
  return refundQueue.add('process-refund', { refundId });
}

async function enqueueWebhookJob(webhookLogId, delayMs = 0) {
  return webhookQueue.add(
    'deliver-webhook',
    { webhookLogId },
    { delay: Math.max(0, Number(delayMs) || 0) }
  );
}

async function getQueueStats() {
  const [paymentCounts, webhookCounts, refundCounts] = await Promise.all([
    paymentQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    webhookQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
    refundQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  const pending =
    (paymentCounts.waiting || 0) +
    (webhookCounts.waiting || 0) +
    (refundCounts.waiting || 0) +
    (paymentCounts.delayed || 0) +
    (webhookCounts.delayed || 0) +
    (refundCounts.delayed || 0);

  const processing =
    (paymentCounts.active || 0) +
    (webhookCounts.active || 0) +
    (refundCounts.active || 0);

  const completed =
    (paymentCounts.completed || 0) +
    (webhookCounts.completed || 0) +
    (refundCounts.completed || 0);

  const failed =
    (paymentCounts.failed || 0) +
    (webhookCounts.failed || 0) +
    (refundCounts.failed || 0);

  return { pending, processing, completed, failed };
}

async function isWorkerRunning() {
  const value = await redisConnection.get('worker:heartbeat');
  return value ? 'running' : 'stopped';
}

module.exports = {
  redisConnection,
  paymentQueue,
  webhookQueue,
  refundQueue,
  enqueuePaymentJob,
  enqueueRefundJob,
  enqueueWebhookJob,
  getQueueStats,
  isWorkerRunning,
};
