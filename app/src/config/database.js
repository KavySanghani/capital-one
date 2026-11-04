import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const poolMax = Number(process.env.DB_POOL_MAX ?? 10);

if (!Number.isInteger(poolMax) || poolMax < 1) {
  throw new Error('DB_POOL_MAX must be a positive integer');
}

const sslEnabled = process.env.DATABASE_SSL === 'true';

export const pool = new Pool({
  connectionString: databaseUrl,
  max: poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: sslEnabled
    ? { rejectUnauthorized: true }
    : false,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
  return true;
}

export async function closeDatabaseConnection() {
  await pool.end();
}
