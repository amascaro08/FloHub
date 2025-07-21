import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Test database connection
    const testEmail = 'test@example.com';
    
    // Test the exact query structure used in login
    const user = await db.query.users.findFirst({
      where: eq(users.email, testEmail),
    });

    // Test the exact query structure used in reset-password
    const userReset = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);

    return res.status(200).json({
      message: 'Database connection successful',
      hasEnvVar: !!process.env.NEON_DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      queryResults: {
        findFirst: user || 'No user found',
        selectFrom: userReset.length > 0 ? userReset[0] : 'No user found'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      hasEnvVar: !!process.env.NEON_DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      timestamp: new Date().toISOString()
    });
  }
}