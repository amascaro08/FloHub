import { NextApiRequest, NextApiResponse } from 'next';
import { setCSRFToken } from '@/lib/csrfProtection';
import { withReadOnlySecurity } from '@/lib/securityMiddleware';

async function csrfTokenHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Set CSRF token cookie
  const token = setCSRFToken(res);
  
  res.status(200).json({
    csrfToken: token,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  });
}

export default withReadOnlySecurity(csrfTokenHandler);