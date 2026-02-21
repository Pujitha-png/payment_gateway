const express = require('express');
const router = express.Router();
const { pool } = require('../db'); 

// GET /api/v1/test/merchant
router.get('/merchant', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, api_key FROM merchants WHERE email = 'test@example.com'"
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

module.exports = router;
