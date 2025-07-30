import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalEntries, journalMoods, journalActivities, journalSleep } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow DELETE method
  if (req.method !== 'DELETE') {
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
  
  const { date } = req.query;
  
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date parameter is required' });
  }
  
  try {
    // Delete all journal data for the specific date
    await Promise.all([
      db.delete(journalEntries).where(and(eq(journalEntries.user_email, user_email), eq(journalEntries.date, date))),
      db.delete(journalMoods).where(and(eq(journalMoods.user_email, user_email), eq(journalMoods.date, date))),
      db.delete(journalActivities).where(and(eq(journalActivities.user_email, user_email), eq(journalActivities.date, date))),
      db.delete(journalSleep).where(and(eq(journalSleep.user_email, user_email), eq(journalSleep.date, date)))
    ]);
    
    return res.status(200).json({ 
      success: true, 
      message: `All journal data for ${date} cleared successfully` 
    });
  } catch (error) {
    console.error('Error clearing journal entry for date:', error);
    return res.status(500).json({ error: 'Failed to clear journal entry' });
  }
}