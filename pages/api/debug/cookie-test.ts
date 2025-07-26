import { NextApiRequest, NextApiResponse } from 'next';
import { createSecureCookie, createClearCookie, getDomainInfo } from '@/lib/cookieUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development or with admin access
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Debug endpoint not available in production' });
  }

  const { action = 'info' } = req.query;
  const domainInfo = getDomainInfo(req);

  try {
    switch (action) {
      case 'info':
        res.status(200).json({
          message: 'Cookie domain test endpoint',
          domainInfo,
          requestHeaders: {
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer,
            userAgent: req.headers['user-agent'],
          },
          availableActions: ['info', 'set', 'clear']
        });
        break;

      case 'set':
        const testCookie = createSecureCookie(req, 'test-cookie', 'test-value-' + Date.now(), {
          maxAge: 60 * 5, // 5 minutes
        });
        
        res.setHeader('Set-Cookie', testCookie);
        res.status(200).json({
          message: 'Test cookie set',
          domainInfo,
          cookieString: testCookie,
        });
        break;

      case 'clear':
        const clearCookie = createClearCookie(req, 'test-cookie');
        
        res.setHeader('Set-Cookie', clearCookie);
        res.status(200).json({
          message: 'Test cookie cleared',
          domainInfo,
          cookieString: clearCookie,
        });
        break;

      default:
        res.status(400).json({ error: 'Invalid action. Use: info, set, or clear' });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to test cookies', 
      details: error instanceof Error ? error.message : String(error),
      domainInfo
    });
  }
}