import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get env vars with fallback
  const clientId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '';
  const redirectUri = process.env.NEXT_PUBLIC_STACK_REDIRECT_URI || '';
  const neonAuthBase = 'https://auth.neon.tech/oauth/google';

  // TypeScript runtime check
  if (!clientId || !redirectUri) {
    res.status(500).send('Missing required environment variables for Google OAuth');
    return;
  }

  const oauthUrl = `${neonAuthBase}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;

  res.redirect(302, oauthUrl);
}
