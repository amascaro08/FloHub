import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Pull from your existing env variables:
  const clientId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '';
  const redirectUri = process.env.NEXT_PUBLIC_STACK_REDIRECT_URI || '';
  // Use the correct base URL for Stack Auth!
  const stackAuthBase = process.env.NEXT_PUBLIC_STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
  const oauthUrl = `${stackAuthBase}/oauth/google?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;

  if (!clientId || !redirectUri) {
    res.status(500).send('Missing required environment variables for Google OAuth');
    return;
  }

  res.redirect(302, oauthUrl);
}
