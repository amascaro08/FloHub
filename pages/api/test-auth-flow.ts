import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, userSettings, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== AUTH FLOW TEST START ===');
    
    // Step 1: Check JWT token
    const token = req.cookies['auth-token'];
    console.log('1. JWT Token exists:', !!token);
    console.log('1. JWT Token length:', token?.length || 0);
    console.log('1. JWT_SECRET exists:', !!process.env.JWT_SECRET);
    
    if (!token) {
      return res.status(401).json({ 
        error: 'No JWT token found',
        step: 'token_missing',
        cookies: Object.keys(req.cookies)
      });
    }
    
    // Step 2: Verify JWT
    const decoded = auth(req);
    console.log('2. JWT decoded result:', decoded);
    
    if (!decoded) {
      return res.status(401).json({ 
        error: 'JWT verification failed',
        step: 'jwt_verification_failed'
      });
    }
    
    // Step 3: Database user lookup
    console.log('3. Looking up user with ID:', decoded.userId);
    const user = await getUserById(decoded.userId);
    console.log('3. User found:', !!user);
    console.log('3. User email:', user?.email);
    
    if (!user?.email) {
      return res.status(404).json({ 
        error: 'User not found in database',
        step: 'user_not_found',
        userId: decoded.userId
      });
    }
    
    // Step 4: Test userSettings query
    console.log('4. Testing userSettings query with email:', user.email);
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user.email),
    });
    console.log('4. UserSettings found:', !!settings);
    
    // Step 5: Test tasks query
    console.log('5. Testing tasks query with email:', user.email);
    const userTasks = await db.select().from(tasks).where(eq(tasks.user_email, user.email)).limit(3);
    console.log('5. Tasks found:', userTasks.length);
    
    // Success response
    return res.status(200).json({
      success: true,
      auth: {
        hasToken: true,
        jwtValid: true,
        userId: decoded.userId,
        userEmail: user.email
      },
      database: {
        userFound: true,
        settingsFound: !!settings,
        tasksCount: userTasks.length
      },
      environment: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasNeonUrl: !!process.env.NEON_DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('=== AUTH FLOW TEST ERROR ===', error);
    return res.status(500).json({ 
      error: 'Internal server error during auth test',
      message: error instanceof Error ? error.message : 'Unknown error',
      step: 'internal_error'
    });
  }
}