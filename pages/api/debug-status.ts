import { NextApiRequest, NextApiResponse } from 'next';
import { emailService } from '@/lib/emailService';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // SECURITY FIX: Only allow in development AND require authentication
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoint not available in production' });
  }

  // Require authentication even in development
  const user = auth(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const emailStatus = emailService.getConfigurationStatus();
    
    // SECURITY FIX: Only expose boolean status, not actual values
    const status = {
      email: {
        configured: emailStatus.configured,
        error: emailStatus.error,
        providerSet: !!process.env.EMAIL_PROVIDER,
        credentialsSet: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      },
      auth: {
        jwtSecretSet: !!process.env.JWT_SECRET,
        nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrlSet: !!process.env.NEXTAUTH_URL,
      },
      google: {
        clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
        clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        tokenSet: !!process.env.GITHUB_TOKEN,
        repoSet: !!process.env.GITHUB_REPO,
      },
      database: {
        neonUrlSet: !!process.env.NEON_DATABASE_URL,
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get debug status', 
      // Don't expose error details in any environment for security
      timestamp: new Date().toISOString()
    });
  }
}