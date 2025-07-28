import { NextApiRequest, NextApiResponse } from 'next';
import { createClearCookie } from '@/lib/cookieUtils';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user information before clearing cookies
    let userEmail: string | null = null;
    try {
      const decoded = auth(req);
      if (decoded) {
        const user = await getUserById(decoded.userId);
        userEmail = user?.email || null;
      }
    } catch (error) {
      console.warn('Could not get user info during logout:', error);
    }

    // Clear the auth token with proper domain handling
    const clearAuthCookie = createClearCookie(req, 'auth-token');
    res.setHeader('Set-Cookie', clearAuthCookie);
    
    console.log(`🚪 User logged out: ${userEmail || 'unknown'}`);
    
    // Return user email so client can perform cleanup
    res.status(200).json({ 
      message: 'Logged out successfully',
      userEmail: userEmail,
      clearCache: true // Signal client to clear user-specific cache
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}