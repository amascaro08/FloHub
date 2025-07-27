import { NextApiRequest, NextApiResponse } from 'next';
import { auth, signToken } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { createSecureCookie } from '@/lib/cookieUtils';

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

    // Generate a new token
    const token = signToken({ userId: user.id, email: user.email });

    // Set cookie with proper domain handling using the new utility
    const authCookie = createSecureCookie(req, 'auth-token', token, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.setHeader('Set-Cookie', authCookie);

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}