import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { createClearCookie, getDomainInfo } from '@/lib/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear the auth token with dynamic domain detection
    const domainInfo = getDomainInfo(req);
    console.log('Logout - Domain info:', domainInfo);
    
    const cookie = createClearCookie(req, 'auth-token');

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}