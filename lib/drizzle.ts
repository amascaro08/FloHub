import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

const sql = neon(process.env.NEON_DATABASE_URL!);

export const db = drizzle(sql, { schema });