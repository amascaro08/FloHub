// pages/api/debug-client-vapid.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serverPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const serverPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const serverMailto = process.env.VAPID_MAILTO;

  return res.status(200).json({
    server: {
      publicKey: serverPublicKey || 'NOT_SET',
      publicKeyPreview: serverPublicKey ? serverPublicKey.substring(0, 20) + '...' + serverPublicKey.substring(-10) : 'NOT_SET',
      hasPrivateKey: !!serverPrivateKey,
      privateKeyPreview: serverPrivateKey ? serverPrivateKey.substring(0, 20) + '...' + serverPrivateKey.substring(-10) : 'NOT_SET',
      mailto: serverMailto || 'NOT_SET'
    },
    // This will be the same as server since it's server-side rendered
    client: {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'NOT_SET',
      note: 'This is what the client should receive'
    },
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  });
}