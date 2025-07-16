import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserHabits } from '@/lib/habitService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const user = await auth(req);
  
  if (!user?.email) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  
  const userId = user.email as string;

  // Handle GET request to fetch habits
  if (req.method === 'GET') {
    try {
      const habits = await getUserHabits(userId);
      return res.status(200).json(habits);
    } catch (error) {
      console.error('Error fetching habits:', error);
      return res.status(500).json({ error: 'Failed to fetch habits' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}