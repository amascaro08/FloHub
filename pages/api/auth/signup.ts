import { NextApiRequest, NextApiResponse } from 'next';

export default async function signup(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const stackAuthBaseUrl = process.env.NEXT_PUBLIC_STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
    const response = await fetch(`${stackAuthBaseUrl}/api/v1/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Set the auth token cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${data.token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ]);

    return res.status(200).json({ user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(400).json({ error: 'Failed to create account' });
  }
}
