import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';
import 'dotenv/config';

const connectionString = process.env.NEON_DATABASE_URL;

const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });