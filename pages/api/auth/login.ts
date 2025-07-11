import { NextApiRequest, NextApiResponse } from 'next';

export default async function login(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    console.log('Login API: Attempting login with Stack Auth...');
    console.log('Login API: STACK_SECRET_SERVER_KEY:', process.env.STACK_SECRET_SERVER_KEY ? '[PRESENT]' : '[MISSING]');
    const response = await fetch('https://api.stack-auth.com/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STACK_SECRET_SERVER_KEY}`
      },
      body: JSON.stringify({ email, password })
    });
    console.log('Login API: Stack Auth login response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Set the auth token cookie
    res.setHeader('Set-Cookie', [
      `auth-token=${data.token}; Path=/; HttpOnly; Secure; SameSite=Strict`,
    ]);

    return res.status(200).json({ user: data.user });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}
