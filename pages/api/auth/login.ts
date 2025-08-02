import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/auth';
import { createSecureCookie } from '@/lib/cookieUtils';
import { withRateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { withAuthSecurity } from '@/lib/securityMiddleware';
import { logger } from '@/lib/logger';

async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, rememberMe = true } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = signToken({ userId: user.id, email: user.email });

    // Set cookie with enhanced persistence settings
    const authCookie = createSecureCookie(req, 'auth-token', token, {
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 24 hours
      rememberMe,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.setHeader('Set-Cookie', authCookie);

    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).json({ 
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Login error', { 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      endpoint: '/api/auth/login',
      method: req.method
    });
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}

// Apply comprehensive security to the login endpoint
export default withAuthSecurity(loginHandler);