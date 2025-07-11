import { NextApiRequest, NextApiResponse } from 'next';
import { handleAuth } from '@/lib/neonAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Callback API: Received request.');
  const { token } = req.query;
  console.log('Callback API: Token received:', token ? '[PRESENT]' : '[MISSING]');

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    console.log('Callback API: Calling handleAuth...');
    const user = await handleAuth(token);
    console.log('Callback API: handleAuth result - user:', user ? '[PRESENT]' : '[NULL]');
    if (!user) {
      console.log('Callback API: Invalid token, returning 401.');
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
