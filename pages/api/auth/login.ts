import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/lib/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { createSecureCookie, getDomainInfo } from '@/lib/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: rememberMe ? '30d' : '24h', // 30 days if remember me, 24 hours if not
    });

    // Create secure cookie with dynamic domain detection
    const domainInfo = getDomainInfo(req);
    console.log('Login - Domain info:', domainInfo);
    
    const cookie = createSecureCookie(req, 'auth-token', token, {
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30 days or 24 hours
    });

    // Check if this is a PWA request (moved from cookie utility for header logic)
    const userAgent = req.headers['user-agent'] || '';
    const isPWA = userAgent.includes('standalone') || req.headers['sec-fetch-site'] === 'none';

    // Add PWA-specific headers
    res.setHeader('Set-Cookie', cookie);
    
    // Add headers to help with PWA caching and authentication
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (isPWA) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.status(200).json({ 
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      isPWA
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? {
        jwtSecret: !!process.env.JWT_SECRET,
        dbUrl: !!process.env.NEON_DATABASE_URL
      } : undefined
    });
  }
}