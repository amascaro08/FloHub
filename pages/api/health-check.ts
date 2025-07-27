import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers for cross-domain support
  const origin = req.headers.origin;
  if (origin && (
    origin.includes('flohub.xyz') || 
    origin.includes('flohub.vercel.app') || 
    origin.includes('localhost:3000')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const healthData = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    host: req.headers.host,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    protocol: req.headers['x-forwarded-proto'] || 'http',
    url: req.url,
    method: req.method,
    cookies: {
      hasAuthToken: !!req.cookies['auth-token'],
      cookieKeys: Object.keys(req.cookies)
    }
  };

  res.status(200).json(healthData);
}