import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { query } from '@/lib/neon';

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
      timestamp: Date.now()
    };

    // Store in Neon
    // Dynamically build the INSERT query based on the metrics object
    const columns = Object.keys(dataToStore).map(key => `"${key}"`).join(', ');
    const values = Object.values(dataToStore);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    await query(
      `INSERT INTO "analytics_performance_metrics" (${columns}) VALUES (${placeholders})`,
      values
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing performance metrics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}