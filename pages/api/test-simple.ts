import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({ 
    message: 'API route working',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.url 
  });
}