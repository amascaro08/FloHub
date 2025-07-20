import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const decoded = auth(req);

    if (!decoded) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        details: process.env.NODE_ENV === 'development' ? {
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasAuthToken: !!req.cookies['auth-token'],
        } : undefined
      });
    }

    const user = await getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Transform user object to include primaryEmail for compatibility
    const transformedUser = {
      ...user,
      primaryEmail: user.email
    };

    res.status(200).json(transformedUser);
  } catch (error) {
    console.error('Session API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        hasJwtSecret: !!process.env.JWT_SECRET,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      } : undefined
    });
  }
}