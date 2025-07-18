import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { habitCompletions } from '@/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check authentication
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: 'User not found' });
  }
  const userId = user.email;

  // Handle GET request to fetch habit completions
  if (req.method === 'GET') {
    try {
      // Get year and month from query parameters
      const { year, month } = req.query;
      
      // Validate parameters
      if (!year || !month) {
        return res.status(400).json({ error: 'Year and month parameters are required' });
      }
      
      const yearNum = parseInt(year as string, 10);
      const monthNum = parseInt(month as string, 10);
      
      if (isNaN(yearNum) || isNaN(monthNum)) {
        return res.status(400).json({ error: 'Year and month must be valid numbers' });
      }
      
      // Fetch completions for the specified month
      const startDate = new Date(yearNum, monthNum, 1);
      const endDate = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);
      
      const rows = await db
        .select()
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.userId, userId),
            gte(habitCompletions.date, startDate.toISOString().split('T')[0]),
            lte(habitCompletions.date, endDate.toISOString().split('T')[0])
          )
        );
        
      const completions = rows.map(row => ({
        ...row,
        habitId: String(row.habitId),
        timestamp: row.timestamp ? Number(row.timestamp) : Date.now()
      }));
      
      return res.status(200).json(completions);
    } catch (error) {
      console.error('Error fetching habit completions:', error);
      return res.status(500).json({ error: 'Failed to fetch habit completions' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}