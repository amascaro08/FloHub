import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // SECURITY FIX: Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoint not available in production' });
  }

  // SECURITY FIX: Require authentication
  const user = auth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Test database connection with a simple query that doesn't expose user data
    const connectionTest = await db.select().from(users).limit(1);

    return res.status(200).json({
      message: 'Database connection successful',
      connectionStatus: 'healthy',
      configurationStatus: {
        databaseConfigured: !!process.env.NEON_DATABASE_URL,
        authConfigured: !!process.env.JWT_SECRET,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    // SECURITY FIX: Don't expose detailed error information
    console.error('Database connection error:', error);
    return res.status(500).json({
      message: 'Database connection failed',
      connectionStatus: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  }
}