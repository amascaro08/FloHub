// pages/api/notifications/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { query } from '@/lib/neon';

type Data = {
  success: boolean;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get user token
    const user = await auth(req);
    
    if (!user?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get subscription data from request body
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data' });
    }
    
    // Save subscription to Firestore
    const userEmail = user.email as string;
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64');
    
    const now = Date.now();
    await query(
      `INSERT INTO "pushSubscriptions" (id, "userEmail", subscription, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         "userEmail" = EXCLUDED."userEmail",
         subscription = EXCLUDED.subscription,
         "updatedAt" = EXCLUDED."updatedAt"`,
      [subscriptionId, userEmail, subscription, now, now]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}