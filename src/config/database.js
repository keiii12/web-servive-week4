// ===================================================================
// [LAB 04] Konfigurasi Koneksi PostgreSQL Neon menggunakan pg Pool
// Dipakai bersama oleh GraphQL (Lab 04/05) dan gRPC Server (Lab 06)
// ===================================================================

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum diatur di file .env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export async function testDatabaseConnection() {
  const result = await pool.query('SELECT NOW() AS current_time');
  return result.rows[0];
}