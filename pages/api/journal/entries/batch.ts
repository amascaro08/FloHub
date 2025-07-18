import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalEntries } from '@/db/schema';
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
    // Create a map of date to hasContent
    const entries: Record<string, boolean> = {};
    
    // Initialize all dates to false
    dates.forEach(date => {
      entries[date] = false;
    });
    
    const rows = await db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.user_email, user_email), inArray(journalEntries.date, dates)));
      
    // Update entries that have content
    rows.forEach(row => {
      if (row.date && row.content && row.content.trim() !== '') {
        entries[row.date] = true;
      }
    });
    
    return res.status(200).json({ entries });
  } catch (error) {
    console.error('Error retrieving batch entries:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch entries' });
  }
}