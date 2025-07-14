import { NextApiRequest, NextApiResponse } from 'next';

export default async function session(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Session API: Checking for auth-token cookie...');
    const token = req.cookies['auth-token'];
    console.log('Session API: auth-token:', token ? '[PRESENT]' : '[MISSING]');

    if (!token) {
      return res.status(401).json({ error: 'No session found' });
    }

    console.log('Session API: Verifying token with Stack Auth...');
    console.log('Session API: STACK_SECRET_SERVER_KEY:', process.env.STACK_SECRET_SERVER_KEY ? '[PRESENT]' : '[MISSING]');
    const stackAuthBaseUrl = process.env.NEXT_PUBLIC_STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
    const response = await fetch(`${stackAuthBaseUrl}/api/v1/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ token })
    });
    console.log('Session API: Stack Auth verify response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid session');
    }

    return res.status(200).json({ user: data.user });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
