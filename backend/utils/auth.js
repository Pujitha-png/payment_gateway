// auth.js
const { pool } = require('../db'); // destructure pool from db.js

async function authenticate(req, res, next) {
  const apiKey = req.header('X-Api-Key');
  const apiSecret = req.header('X-Api-Secret');

  if (!apiKey || !apiSecret) {
    return res.status(401).json({
      error: { code: 'AUTHENTICATION_ERROR', description: 'Invalid API credentials' }
    });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE api_key=$1 AND api_secret=$2',
      [apiKey, apiSecret]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: { code: 'AUTHENTICATION_ERROR', description: 'Invalid API credentials' }
      });
    }

    req.merchant = result.rows[0]; // save merchant info for use in handlers
    next();
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      error: { code: 'BAD_REQUEST_ERROR', description: 'Unable to authenticate' }
    });
  }
}

module.exports = authenticate;
