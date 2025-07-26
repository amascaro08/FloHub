import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { createSecureCookie, getDomainInfo } from '@/lib/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const decoded = auth(req);

    if (!decoded) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Generate a new token with extended expiration (always 30 days for refresh)
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET as string, {
      expiresIn: '30d',
    });

    // Create secure cookie with dynamic domain detection
    const domainInfo = getDomainInfo(req);
    console.log('Refresh - Domain info:', domainInfo);
    
    const cookie = createSecureCookie(req, 'auth-token', token, {
      maxAge: 60 * 60 * 24 * 30, // 30 days for refresh
    });

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}