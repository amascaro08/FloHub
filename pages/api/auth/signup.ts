import { NextApiRequest, NextApiResponse } from 'next';

export default async function signup(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    const response = await fetch('https://console.neon.tech/api/v2/projects/auth/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`, // Use NEON_API_KEY
      },
      body: JSON.stringify({
        project_id: process.env.NEXT_PUBLIC_STACK_PROJECT_ID, // Pass project_id
        auth_provider: 'stack', // Specify auth_provider
        email,
        name: req.body.name // Pass name from request body
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    // Set the auth token cookie
    // Neon Auth API does not return a token directly on user creation.
    // The client-side will handle login after successful signup.
    // Remove setting auth-token cookie here.

    return res.status(200).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    // Attempt to parse error from Neon API response if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
    return res.status(400).json({ error: errorMessage });
  }
}
