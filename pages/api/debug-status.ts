import { NextApiRequest, NextApiResponse } from 'next';
import { emailService } from '@/lib/emailService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with admin access
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoint not available in production' });
  }

  try {
    const emailStatus = emailService.getConfigurationStatus();
    
    const status = {
      email: {
        configured: emailStatus.configured,
        error: emailStatus.error,
        provider: process.env.EMAIL_PROVIDER,
        hasUser: !!process.env.EMAIL_USER,
        hasPass: !!process.env.EMAIL_PASS,
      },
      auth: {
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL,
      },
      google: {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        hasToken: !!process.env.GITHUB_TOKEN,
        hasRepo: !!process.env.GITHUB_REPO,
      }
    };

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get debug status', details: error.message });
  }
}