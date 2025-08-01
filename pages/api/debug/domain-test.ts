import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // SECURITY FIX: Disable debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Add comprehensive CORS headers
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
    const authResult = auth(req);
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      success: true,
      request: {
        method: req.method,
        url: req.url,
        host: req.headers.host,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent'],
        protocol: req.headers['x-forwarded-proto'] || req.headers['x-forwarded-protocol'] || 'http',
        forwardedFor: req.headers['x-forwarded-for'],
        realIp: req.headers['x-real-ip']
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        vercelUrl: process.env.VERCEL_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasDatabaseUrl: !!process.env.NEON_DATABASE_URL
      },
      cookies: {
        hasAuthToken: !!req.cookies['auth-token'],
        authTokenLength: req.cookies['auth-token']?.length || 0,
        allCookies: Object.keys(req.cookies),
        cookieCount: Object.keys(req.cookies).length
      },
      authentication: {
        isAuthenticated: !!authResult,
        userId: authResult?.userId || null,
        email: authResult?.email || null,
        hasTokenExpiry: !!(authResult?.exp)
      },
      security: {
        isSecureProtocol: req.headers['x-forwarded-proto'] === 'https',
        shouldUseSecureCookies: req.headers['x-forwarded-proto'] === 'https' || 
                               (req.headers.host?.includes('flohub.xyz') ?? false) || 
                               (req.headers.host?.includes('vercel.app') ?? false),
        domainInfo: {
          isFlohubXyz: req.headers.host?.includes('flohub.xyz') ?? false,
          isVercelApp: req.headers.host?.includes('vercel.app') ?? false,
          isLocalhost: req.headers.host?.includes('localhost') ?? false
        }
      }
    };

    res.status(200).json(diagnostics);
  } catch (error) {
    console.error('Domain test error:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}