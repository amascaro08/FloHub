// pages/api/debug-vapid.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidMailto: string;
  hasEnvVars: {
    publicKey: boolean;
    privateKey: boolean;
    mailto: boolean;
  };
  keysMatch: boolean;
  environment: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      vapidPublicKey: '',
      vapidPrivateKey: '',
      vapidMailto: '',
      hasEnvVars: { publicKey: false, privateKey: false, mailto: false },
      keysMatch: false,
      environment: ''
    } as Data);
  }

  const vapidMailto = process.env.VAPID_MAILTO || 'example@example.com';
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ||
    'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTWKSKHw';

  const expectedPublicKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEj3lu5NzSf2KMw_GW-Pmlbc3apDxgZuSxXPX3CzsXEpai16KztgBfLvOhdmTk4VgH6BjqKi4fJyG-g_d13jGRYA';
  const expectedPrivateKey = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgCHdYtWcD5Ua5j2xI-dXPZOQA3ye6w-EXDldyBaO1wZmhRANCAASPeW7k3NJ_YozD8Zb4-aVtzdqkPGBm5LFc9fcLOxcSlqLXorO2AF8u86F2ZOThWAfoGOoqLh8nIb6D93XeMZFg';

  const keysMatch = vapidPublicKey === expectedPublicKey && vapidPrivateKey === expectedPrivateKey;

  return res.status(200).json({
    vapidPublicKey: vapidPublicKey.substring(0, 20) + '...' + vapidPublicKey.substring(vapidPublicKey.length - 10),
    vapidPrivateKey: vapidPrivateKey.substring(0, 20) + '...' + vapidPrivateKey.substring(vapidPrivateKey.length - 10),
    vapidMailto,
    hasEnvVars: {
      publicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      privateKey: !!process.env.VAPID_PRIVATE_KEY,
      mailto: !!process.env.VAPID_MAILTO
    },
    keysMatch,
    environment: process.env.NODE_ENV || 'unknown'
  });
}