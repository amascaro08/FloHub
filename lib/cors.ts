import type { NextApiRequest, NextApiResponse } from 'next';

const allowedOrigins = [
  'http://localhost:3000',
  'https://flohub.xyz',
  'https://www.flohub.xyz',
  'https://flohub.vercel.app'
];

export function handleCORS(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // Request was handled
  }

  return false; // Continue with normal request handling
}
