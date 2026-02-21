const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
  let database = 'connected';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    database = 'disconnected';
  }

  res.status(200).json({
    status: 'healthy',
    database,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
