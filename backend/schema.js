const { pool } = require('./db');

async function initializeSchema() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS merchants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      api_key VARCHAR(64) UNIQUE NOT NULL,
      api_secret VARCHAR(64) NOT NULL,
      webhook_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY CHECK (id ~ '^order_[A-Za-z0-9]{16}$'),
      merchant_id UUID NOT NULL REFERENCES merchants(id),
      amount INTEGER NOT NULL CHECK (amount >= 100),
      currency VARCHAR(3) DEFAULT 'INR',
      receipt VARCHAR(255),
      notes JSONB,
      status VARCHAR(20) DEFAULT 'created',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(64) PRIMARY KEY CHECK (id ~ '^pay_[A-Za-z0-9]{16}$'),
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id),
      merchant_id UUID NOT NULL REFERENCES merchants(id),
      amount INTEGER NOT NULL,
      currency VARCHAR(3) DEFAULT 'INR',
      method VARCHAR(20) NOT NULL CHECK (method IN ('upi', 'card')),
      status VARCHAR(20) DEFAULT 'processing',
      vpa VARCHAR(255),
      card_network VARCHAR(20),
      card_last4 VARCHAR(4),
      error_code VARCHAR(50),
      error_description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);');
}

module.exports = { initializeSchema };