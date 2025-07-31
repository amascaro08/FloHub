// pages/api/check-env.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check what environment variables the server actually sees
  const hasPublic = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const hasPrivate = !!process.env.VAPID_PRIVATE_KEY;
  const hasMail = !!process.env.VAPID_MAILTO;
  
  // Show partial values for security
  const publicPartial = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY 
    ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.substring(0, 20) + '...' 
    : 'NOT_SET';
  
  const privatePartial = process.env.VAPID_PRIVATE_KEY 
    ? process.env.VAPID_PRIVATE_KEY.substring(0, 20) + '...' 
    : 'NOT_SET';

  return res.status(200).json({
    hasVapidPublic: hasPublic,
    hasVapidPrivate: hasPrivate,
    hasVapidMail: hasMail,
    publicKeyPreview: publicPartial,
    privateKeyPreview: privatePartial,
    mailTo: process.env.VAPID_MAILTO || 'NOT_SET',
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || 'unknown'
  });
}