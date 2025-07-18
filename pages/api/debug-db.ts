import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test basic environment
    if (!process.env.NEON_DATABASE_URL) {
      return res.status(500).json({ 
        error: 'Database URL not configured',
        hasNeonUrl: false 
      });
    }

    // Try to import database client
    let dbImportError = null;
    let dbClient = null;
    
    try {
      const { db } = await import('../../lib/drizzle');
      dbClient = 'imported successfully';
    } catch (error) {
      dbImportError = error instanceof Error ? error.message : 'Unknown import error';
    }

    // Try a simple database query if import succeeded
    let queryResult = null;
    let queryError = null;
    
    if (!dbImportError) {
      try {
        const { db } = await import('../../lib/drizzle');
        // Simple query to test connection
        const result = await db.execute({ sql: 'SELECT 1 as test' });
        queryResult = 'Query successful';
      } catch (error) {
        queryError = error instanceof Error ? error.message : 'Unknown query error';
      }
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      hasNeonUrl: !!process.env.NEON_DATABASE_URL,
      neonUrlPrefix: process.env.NEON_DATABASE_URL?.substring(0, 30) || 'not set',
      dbImportError,
      dbClient,
      queryResult,
      queryError,
    });
  } catch (error) {
    console.error('Database debug error:', error);
    return res.status(500).json({ 
      error: 'Database debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}