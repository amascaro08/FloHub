import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      hasNeonUrl: !!process.env.NEON_DATABASE_URL,
      neonUrlPrefix: process.env.NEON_DATABASE_URL?.substring(0, 20) || 'not set',
      userAgent: req.headers['user-agent'],
      cookies: Object.keys(req.cookies),
      headers: Object.keys(req.headers),
    };

    console.log('Debug info:', debugInfo);
    
    return res.status(200).json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return res.status(500).json({ 
      error: 'Debug failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}