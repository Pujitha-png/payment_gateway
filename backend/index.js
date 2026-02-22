const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const cors = require("cors");

const { pool, waitForDB } = require("./db");
const { initializeSchema } = require("./schema");

const healthRoutes = require("./routes/health");
const ordersRoutes = require("./routes/orders");
const paymentsRoutes = require("./routes/payments");
const testRoutes = require("./routes/test");
const refundsRoutes = require("./routes/refunds");
const webhooksRoutes = require("./routes/webhooks");

const app = express();

/* ==============================
   MIDDLEWARES
================================ */
app.use(bodyParser.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-Api-Key",
      "X-Api-Secret",
      "Idempotency-Key",
      "Authorization",
    ],
    credentials: true,
  })
);

/* ==============================
   SEED TEST MERCHANT
================================ */
const seedTestMerchant = async () => {
  const id = "550e8400-e29b-41d4-a716-446655440000";
  const email = "test@example.com";
  const api_key = "key_test_abc123";
  const api_secret = "secret_test_xyz789";
  const webhook_secret = "whsec_test_abc123";
  const webhook_url = "http://webhook-receiver:4000/webhook";

  const res = await pool.query(
    "SELECT 1 FROM merchants WHERE email = $1",
    [email]
  );

  if (res.rows.length === 0) {
    await pool.query(
      `
      INSERT INTO merchants
        (id, name, email, api_key, api_secret, webhook_url, webhook_secret, is_active, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [id, "Test Merchant", email, api_key, api_secret, webhook_url, webhook_secret]
    );
    console.log("✅ Test merchant created");
  } else {
    await pool.query(
      `UPDATE merchants
       SET webhook_secret = COALESCE(webhook_secret, $1),
           webhook_url = COALESCE(webhook_url, $2),
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $3`,
      [webhook_secret, webhook_url, email]
    );
    console.log("ℹ️ Test merchant already exists");
  }
};

/* ==============================
   ROUTES
================================ */
app.use("/health", healthRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/payments", paymentsRoutes);
app.use("/api/v1/refunds", refundsRoutes);
app.use("/api/v1/webhooks", webhooksRoutes);
app.use("/api/v1/test", testRoutes);

/* ==============================
   SERVER START (CORRECT ORDER)
================================ */
const PORT = process.env.PORT || 8000;

(async () => {
  try {
    await waitForDB();
    await initializeSchema();
    await seedTestMerchant();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
