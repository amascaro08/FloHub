import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from 'pg';
import * as schema from '../db/schema';

const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error('NEON_DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });