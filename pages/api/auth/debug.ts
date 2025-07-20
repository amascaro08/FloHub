import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authToken = req.cookies['auth-token'];
  
  const debugInfo = {
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasAuthToken: !!authToken,
    authTokenLength: authToken ? authToken.length : 0,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(debugInfo);
}