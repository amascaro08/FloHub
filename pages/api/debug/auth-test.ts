import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const debug = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent']?.substring(0, 100),
        'x-forwarded-proto': req.headers['x-forwarded-proto'],
        'x-forwarded-host': req.headers['x-forwarded-host'],
      },
      cookies: {
        'auth-token': req.cookies['auth-token'] ? 'Present' : 'Missing',
        'auth-token-length': req.cookies['auth-token']?.length || 0,
        'auth-token-preview': req.cookies['auth-token']?.substring(0, 20) + '...' || 'N/A',
        allCookies: Object.keys(req.cookies)
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing'
      }
    };

    // Test JWT decoding
    let authResult = null;
    try {
      const decoded = auth(req);
      if (decoded) {
        authResult = {
          success: true,
          userId: decoded.userId,
          email: decoded.email,
          exp: decoded.exp,
          iat: decoded.iat
        };
        
        // Test user lookup
        try {
          const user = await getUserById(decoded.userId);
          authResult.userFound = !!user;
          authResult.userName = user?.name;
        } catch (userError) {
          authResult.userError = userError instanceof Error ? userError.message : String(userError);
        }
      } else {
        authResult = { success: false, reason: 'No token or invalid token' };
      }
    } catch (authError) {
      authResult = { 
        success: false, 
        error: authError instanceof Error ? authError.message : String(authError) 
      };
    }

    res.status(200).json({
      debug,
      authResult
    });
  } catch (error) {
    res.status(500).json({
      error: 'Debug endpoint failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}