import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalMoods } from '@/db/schema';
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
  const userEmail = user.email;
  
  // Get dates from request body
  const { dates } = req.body;
  
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Dates array is required' });
  }
  
  try {
    // Create a map of date to mood data
    const moods: Record<string, any> = {};
    
    const rows = await db
      .select()
      .from(journalMoods)
      .where(and(eq(journalMoods.userEmail, userEmail), inArray(journalMoods.date, dates)));
      
    // Add mood data for each date
    rows.forEach(row => {
      if (row.date && row.emoji && row.label) {
        moods[row.date] = {
          emoji: row.emoji,
          label: row.label,
          tags: row.tags || []
        };
      }
    });
    
    return res.status(200).json({ moods });
  } catch (error) {
    console.error('Error retrieving batch moods:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch moods' });
  }
}