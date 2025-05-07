// pages/api/notifications/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { firestore } from '@/lib/firebaseAdmin';

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
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!token?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get subscription data from request body
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription data' });
    }
    
    // Save subscription to Firestore
    const userEmail = token.email as string;
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64');
    
    await firestore.collection('pushSubscriptions').doc(subscriptionId).set({
      userEmail,
      subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}