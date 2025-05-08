import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getUserHabits } from '@/lib/habitService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token?.email) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  
  const userId = token.email as string;

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