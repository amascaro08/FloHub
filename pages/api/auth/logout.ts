import { NextApiRequest, NextApiResponse } from 'next';
import { createClearCookie } from '@/lib/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear the auth token with proper domain handling
    const clearAuthCookie = createClearCookie(req, 'auth-token');
    res.setHeader('Set-Cookie', clearAuthCookie);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}