import { NextApiRequest, NextApiResponse } from 'next';
import { handleAuth } from '@/lib/neonAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const user = await handleAuth(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Store the token in a secure HTTP-only cookie
    res.setHeader('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict`);

    // Redirect to the main application
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
