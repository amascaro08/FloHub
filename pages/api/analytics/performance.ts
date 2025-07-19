import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { analyticsPerformanceMetrics, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user to identify user
    const decoded = auth(req);
    let userId = null;
    if (decoded) {
      const user = await getUserById(decoded.userId);
      userId = user?.email || null;
    }

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