const express = require('express');
const router = express.Router();
const { pool } = require('../db'); 
const { getQueueStats, isWorkerRunning } = require('../queue');

// GET /api/v1/test/merchant
router.get('/merchant', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, api_key, api_secret, webhook_secret FROM merchants WHERE email = 'test@example.com'"
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND_ERROR", description: "Test merchant not found" } });
    }
    res.json({ ...result.rows[0], seeded: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Unable to fetch test merchant" } });
  }
});

router.get('/jobs/status', async (_req, res) => {
  try {
    const stats = await getQueueStats();
    const workerStatus = await isWorkerRunning();

    return res.status(200).json({
      pending: stats.pending,
      processing: stats.processing,
      completed: stats.completed,
      failed: stats.failed,
      worker_status: workerStatus,
    });
  } catch (error) {
    return res.status(200).json({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      worker_status: 'stopped',
    });
  }
});

module.exports = router;
