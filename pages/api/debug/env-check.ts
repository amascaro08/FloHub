import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow this in development or for specific admin users
  const isAllowed = process.env.NODE_ENV === 'development' || 
                   req.query.admin === 'true';

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const neonDatabaseUrl = process.env.NEON_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const actualUrl = neonDatabaseUrl || databaseUrl;
  
  // Mask the password for security
  let maskedUrl = 'Not set';
  if (actualUrl) {
    maskedUrl = actualUrl.replace(/(\/\/)([^:]+):([^@]+)@/, '//$2:****@');
  }

  const envInfo = {
    NODE_ENV: process.env.NODE_ENV,
    NEON_DATABASE_URL_SET: !!neonDatabaseUrl,
    DATABASE_URL_SET: !!databaseUrl,
    USING_NEON_URL: !!neonDatabaseUrl,
    DATABASE_URL_MASKED: maskedUrl,
    DATABASE_URL_IS_LOCAL: actualUrl?.includes('127.0.0.1') || actualUrl?.includes('localhost'),
    DATABASE_URL_IS_NEON: actualUrl?.includes('neon.tech'),
    VERCEL_ENV: process.env.VERCEL_ENV,
    TIMESTAMP: new Date().toISOString()
  };

  res.status(200).json(envInfo);
}