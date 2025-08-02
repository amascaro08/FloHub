import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/auth';
import { createSecureCookie } from '@/lib/cookieUtils';
import { validateEmail, validatePassword } from '@/lib/validation';
import { withAuthSecurity } from '@/lib/securityMiddleware';
import { logger } from '@/lib/logger';

async function registerHandler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers for cross-domain support
  const origin = req.headers.origin;
  if (origin && (
    origin.includes('flohub.xyz') || 
    origin.includes('flohub.vercel.app') || 
    origin.includes('localhost:3000')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password, name } = req.body;

  // SECURITY FIX: Validate inputs
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return res.status(400).json({ message: emailValidation.error });
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ message: passwordValidation.error });
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Name is required and must be at least 2 characters long' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, emailValidation.sanitized),
    });

    if (existingUser) {
      return res.status(409).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db.insert(users).values({
      email: emailValidation.sanitized,
      password: hashedPassword,
      name: name.trim(),
      createdAt: new Date()
    }).returning();

    if (!newUser || newUser.length === 0) {
      return res.status(500).json({ message: 'Failed to create user' });
    }

    const user = newUser[0];

    // Create JWT token
    const token = signToken({ userId: user.id, email: user.email });

    // Set secure cookie
    const authCookie = createSecureCookie(req, 'auth-token', token, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      rememberMe: true,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.setHeader('Set-Cookie', authCookie);

    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(201).json({ 
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    logger.error('Registration error', { 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      endpoint: '/api/auth/register',
      method: req.method
    });
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
}

// Apply comprehensive security to the register endpoint
export default withAuthSecurity(registerHandler);