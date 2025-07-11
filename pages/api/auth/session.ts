import { NextApiRequest, NextApiResponse } from 'next';

export default async function session(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ error: 'No session found' });
    }

    const response = await fetch('https://api.stack-auth.com/api/v1/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ token })
    });

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
