const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function waitForDB(retries = 10, delay = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✅ Database connected");
      return;
    } catch (err) {
      console.log(`⏳ Waiting for DB... (${i}/${retries})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error("❌ Database not reachable");
}

module.exports = { pool, waitForDB };
