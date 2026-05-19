import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env['NODE_ENV'] ?? 'local'}` });

export const pool = new Pool({
  host:     process.env['DB_HOST']     ?? 'localhost',
  port:     Number(process.env['DB_PORT'] ?? 5432),
  database: process.env['DB_NAME']     ?? 'nail_app',
  user:     process.env['DB_USER'],
  password: process.env['DB_PASSWORD'] ?? '',
});

export async function connectDB(): Promise<void> {
  const client = await pool.connect();
  console.log('PostgreSQL connected');
  client.release();
}
