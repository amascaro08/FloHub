import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const token = req.cookies['auth-token'];
  
  const debugInfo = {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    hasJwtSecret: !!process.env.JWT_SECRET,
    nodeEnv: process.env.NODE_ENV,
    cookieNames: Object.keys(req.cookies),
    headers: {
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer,
      host: req.headers.host,
    }
  };

  res.status(200).json(debugInfo);
}