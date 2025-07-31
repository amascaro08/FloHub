import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  
  // Mask sensitive values for security
  const maskUrl = (url: string | undefined) => {
    if (!url) return 'NOT_SET';
    if (url.length < 10) return 'TOO_SHORT';
    return url.substring(0, 10) + '...' + url.substring(url.length - 10);
  };
  
  const maskedUrl = maskUrl(neonDatabaseUrl || databaseUrl);
  const actualUrl = neonDatabaseUrl || databaseUrl;
  
  const envCheck = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    required_variables: {
      NEON_DATABASE_URL_SET: !!neonDatabaseUrl,
      DATABASE_URL_SET: !!databaseUrl,
      JWT_SECRET_SET: !!jwtSecret,
      JWT_SECRET_LENGTH: jwtSecret ? jwtSecret.length : 0,
    },
    database_info: {
      DATABASE_URL_MASKED: maskedUrl,
      DATABASE_URL_IS_LOCAL: actualUrl?.includes('127.0.0.1') || actualUrl?.includes('localhost'),
      DATABASE_URL_IS_NEON: actualUrl?.includes('neon.tech'),
    },
    security: {
      JWT_SECRET_VALID: jwtSecret ? jwtSecret.length >= 32 : false,
    }
  };

  res.status(200).json(envCheck);
}