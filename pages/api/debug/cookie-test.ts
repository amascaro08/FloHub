import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // SECURITY FIX: Disable debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Add CORS headers
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const cookieTest = {
      timestamp: new Date().toISOString(),
      success: true,
      request: {
        method: req.method,
        url: req.url,
        host: req.headers.host,
        origin: req.headers.origin,
        protocol: req.headers['x-forwarded-proto'] || 'http',
      },
      cookies: {
        allCookies: Object.keys(req.cookies),
        cookieCount: Object.keys(req.cookies).length,
        authTokenPresent: !!req.cookies['auth-token'],
        authTokenLength: req.cookies['auth-token']?.length || 0,
        authTokenPreview: req.cookies['auth-token']?.substring(0, 20) + '...' || 'N/A'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isSecure: req.headers['x-forwarded-proto'] === 'https',
        domain: req.headers.host
      }
    };

    res.status(200).json(cookieTest);
  } catch (error) {
    console.error('Cookie test error:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}