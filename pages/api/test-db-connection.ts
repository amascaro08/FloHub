import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const databaseUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    return res.status(500).json({
      error: 'NEON_DATABASE_URL or DATABASE_URL not configured',
      neonDatabaseUrlSet: !!process.env.NEON_DATABASE_URL,
      databaseUrlSet: !!process.env.DATABASE_URL,
      env: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
  }

  // Mask sensitive info
  const maskedUrl = databaseUrl.replace(/(\/\/)([^:]+):([^@]+)@/, '//$2:****@');
  
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    client.release();
    await pool.end();
    
    res.status(200).json({
      success: true,
      databaseUrl: maskedUrl,
      usingNeonUrl: !!process.env.NEON_DATABASE_URL,
      currentTime: result.rows[0].current_time,
      postgresVersion: result.rows[0].pg_version,
      env: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
    
  } catch (error: any) {
    await pool.end();
    
    res.status(500).json({
      error: 'Database connection failed',
      details: error.message,
      code: error.code,
      databaseUrl: maskedUrl,
      usingNeonUrl: !!process.env.NEON_DATABASE_URL,
      neonDatabaseUrlSet: !!process.env.NEON_DATABASE_URL,
      databaseUrlSet: !!process.env.DATABASE_URL,
      env: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });
  }
}