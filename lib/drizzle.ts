import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../db/schema';

if (typeof window !== 'undefined') {
  throw new Error('Database client is being imported on the client side.');
}

// This is the recommended way to connect to Neon database.
// The connection string is passed directly from the environment variable.
// This ensures that the application will connect to the database when deployed on Vercel,
// provided that the NEON_DATABASE_URL environment variable is set correctly in the Vercel project settings.
const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

let db: any;

if (!databaseUrl || databaseUrl === 'postgresql://username:password@host:port/database') {
  console.warn('⚠️  No valid database URL provided. Using mock database for development.');
  // Create a mock database for development
  const mockDb = {
    query: {
      users: {
        findFirst: async () => null,
      },
    },
    insert: () => ({
      values: () => ({
        returning: async () => [],
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve(),
      }),
    }),
    delete: () => ({
      where: () => Promise.resolve(),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => Promise.resolve([]),
        }),
      }),
    }),
  };
  
  db = mockDb;
} else {
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema });
}

export { db };