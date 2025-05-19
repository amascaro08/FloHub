import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { firestore } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session to identify user
    const session = await getSession({ req });
    const userId = session?.user?.email || null;

    // Get performance metrics from request body
    const metrics = req.body;

    // Add timestamp and user ID
    const dataToStore = {
      ...metrics,
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    // Store in Firestore
    await firestore.collection('analytics')
      .doc('performance')
      .collection('metrics')
      .add(dataToStore);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing performance metrics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}