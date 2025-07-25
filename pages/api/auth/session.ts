import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const decoded = auth(req);

    if (!decoded) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Add cache headers to prevent excessive revalidation
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    res.status(200).json(transformedUser);
  } catch (error) {
    console.error('Session API error:', error);
    // Return 401 for authentication errors, 500 for server errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('jwt') || errorMessage.includes('token')) {
      res.status(401).json({ error: 'Invalid authentication token' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}