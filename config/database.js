/**
 * Database Configuration using Knex.js
 *
 * This file sets up the PostgreSQL database connection using Knex.js
 * with proper connection pooling and error handling.
 */

import knex from "knex";

// SSL configuration
const sslConfig =
  process.env.DB_SSL === "true"
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === "true",
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY,
      }
    : false;

// Database configuration
const dbConfig = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "lms_database",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl: sslConfig,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
    propagateCreateError: false,
  },
  migrations: {
    tableName: "knex_migrations",
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};

// Create Knex instance
const db = knex(dbConfig);

// Connection retry logic
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

const connectWithRetry = async (retries = MAX_RETRIES) => {
  try {
    await db.raw("SELECT 1");
    return db;
  } catch (error) {
    if (retries === 0) {
      throw new Error(
        `Failed to connect to database after ${MAX_RETRIES} attempts`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    return connectWithRetry(retries - 1);
  }
};

// Initialize connection
connectWithRetry().catch((error) => {
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await db.destroy();
  process.exit(0);
});

export default db;
