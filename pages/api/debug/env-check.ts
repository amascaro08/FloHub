import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow this in development or for specific admin users
  const isAllowed = process.env.NODE_ENV === 'development' || 
                   req.query.admin === 'true';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  // Mask the password for security
  let maskedUrl = 'Not set';
  if (databaseUrl) {
    maskedUrl = databaseUrl.replace(/(\/\/)([^:]+):([^@]+)@/, '//$2:****@');
  }

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_SET: !!databaseUrl,
    DATABASE_URL_MASKED: maskedUrl,
    DATABASE_URL_IS_LOCAL: databaseUrl?.includes('127.0.0.1') || databaseUrl?.includes('localhost'),
    DATABASE_URL_IS_NEON: databaseUrl?.includes('neon.tech'),
    VERCEL_ENV: process.env.VERCEL_ENV,
    TIMESTAMP: new Date().toISOString()
  };

  res.status(200).json(envInfo);
}