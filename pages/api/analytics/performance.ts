import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { analyticsPerformanceMetrics } from '@/db/schema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user to identify user
    const user = await auth(req);
    const userId = user?.email || null;

    // Get performance metrics from request body
    const metrics = req.body;

    // Add timestamp and user ID
    const dataToStore = {
      ...metrics,
      userId,
      timestamp: new Date()
    };

    // Store in Neon
    await db.insert(analyticsPerformanceMetrics).values(dataToStore);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing performance metrics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}