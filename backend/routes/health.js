const express = require('express');
const router = express.Router();
const { pool } = require('../db');
 // your PostgreSQL connection
const Redis = require('ioredis');

// Redis client (adjust REDIS_URL in .env if needed)
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Worker status (placeholder)
let workerStatus = 'running'; // set 'stopped' if your worker is not running

router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();

  // 1️⃣ Check database
  let dbStatus = 'connected';
  try {
    await pool.query('SELECT 1'); // simple query
  } catch (err) {
    dbStatus = 'disconnected';
    console.error('DB health check failed:', err.message);
  }

  // 2️⃣ Check Redis
  let redisStatus = 'connected';
  try {
    await redis.ping();
  } catch (err) {
    redisStatus = 'disconnected';
  }

  // 3️⃣ Worker status already in workerStatus variable

  res.status(200).json({
    status: 'healthy',
    database: dbStatus,
    redis: redisStatus,
    worker: workerStatus,
    timestamp
  });
});

module.exports = router;
