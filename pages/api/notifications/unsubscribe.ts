// pages/api/notifications/unsubscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Get subscription data from request body
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data' });
    }
    
    // Delete subscription from Firestore
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64');
    
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId));

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}