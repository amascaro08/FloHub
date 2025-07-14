import { NextApiRequest, NextApiResponse } from 'next';
import { handleAuth } from '@/lib/neonAuth'; // Import handleAuth

export default async function session(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Session API: Received request.');
  console.log('Session API: Request Headers:', req.headers); // Log all headers
  const token = req.cookies['auth-token']; // Get token from cookie
  console.log('Session API: Token from cookie:', token ? '[PRESENT]' : '[MISSING]');
  console.log('Session API: STACK_SECRET_SERVER_KEY:', process.env.STACK_SECRET_SERVER_KEY ? '[PRESENT]' : '[MISSING]');

  if (!token || typeof token !== 'string') {
    console.log('Session API: No token found in cookie, returning 401.');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    console.log('Session API: Calling handleAuth...');
    const user = await handleAuth(token); // Use handleAuth from neonAuth
    console.log('Session API: handleAuth result - user:', user ? '[PRESENT]' : '[NULL]');
    if (!user) {
      console.log('Session API: Invalid token, returning 401.');
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Session API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
