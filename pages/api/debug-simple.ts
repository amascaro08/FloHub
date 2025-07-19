import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test basic endpoint functionality
    const timestamp = new Date().toISOString();
    
    // Test environment variables
    const envStatus = {
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      hasNeonUrl: !!process.env.NEON_DATABASE_URL,
      neonUrlPrefix: process.env.NEON_DATABASE_URL?.substring(0, 30) || 'not set',
    };

    // Test database connection
    let dbStatus = 'unknown';
    let dbError = null;
    try {
      // Try a simple query to test DB connection
      const result = await db.execute('SELECT 1 as test');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'failed';
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }

    // Test cookie access
    const cookies = req.cookies;
    const hasAuthToken = !!cookies['auth-token'];

    const response = {
      status: 'ok',
      timestamp,
      environment: envStatus,
      database: {
        status: dbStatus,
        error: dbError,
      },
      authentication: {
        hasAuthToken,
        cookieNames: Object.keys(cookies),
      },
      headers: {
        userAgent: req.headers['user-agent']?.substring(0, 50) || 'unknown',
        host: req.headers.host,
        origin: req.headers.origin,
      }
    };

    console.log('Debug simple endpoint called:', response);
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Debug simple endpoint error:', error);
    return res.status(500).json({ 
      error: 'Debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}