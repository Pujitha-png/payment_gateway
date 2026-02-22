const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticate = require('../utils/auth');

router.get('/:refund_id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, payment_id, amount, reason, status, created_at, processed_at
       FROM refunds
       WHERE id = $1 AND merchant_id = $2`,
      [req.params.refund_id, req.merchant.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND_ERROR',
          description: 'Refund not found',
        },
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Unable to fetch refund',
      },
    });
  }
});

module.exports = router;
