import { Pool } from 'pg';

const connectionString = process.env.NEON_DATABASE_URL;

const pool = new Pool({
  connectionString,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
