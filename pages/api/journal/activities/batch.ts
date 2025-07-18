import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalActivities } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use getToken instead of getuser for better compatibility with API routes
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: 'User not found' });
  }
  const user_email = user.email;
  
  // Get dates from request body
  const { dates } = req.body;
  
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Dates array is required' });
  }
  
  try {
    // Create a map of date to activities array
    const activities: Record<string, string[]> = {};
    
    const rows = await db
      .select()
      .from(journalActivities)
      .where(and(eq(journalActivities.user_email, user_email), inArray(journalActivities.date, dates)));
      
    // Add activities for each date
    rows.forEach(row => {
      if (row.date && Array.isArray(row.activities) && (row.activities as string[]).length > 0) {
        activities[row.date] = row.activities as string[];
      }
    });
    
    return res.status(200).json({ activities });
  } catch (error) {
    console.error('Error retrieving batch activities:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch activities' });
  }
}