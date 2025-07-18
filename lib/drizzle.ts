import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

// This is the recommended way to connect to Neon database.
// The connection string is passed directly from the environment variable.
// This ensures that the application will connect to the database when deployed on Vercel,
// provided that the NEON_DATABASE_URL environment variable is set correctly in the Vercel project settings.
const sql = neon(process.env.NEON_DATABASE_URL!);

export const db = drizzle(sql, { schema });