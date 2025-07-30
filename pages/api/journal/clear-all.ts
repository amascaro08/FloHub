import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalEntries, journalMoods, journalActivities, journalSleep } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
  
  try {
    // Delete all journal data for the user
    await Promise.all([
      db.delete(journalEntries).where(eq(journalEntries.user_email, user_email)),
      db.delete(journalMoods).where(eq(journalMoods.user_email, user_email)),
      db.delete(journalActivities).where(eq(journalActivities.user_email, user_email)),
      db.delete(journalSleep).where(eq(journalSleep.user_email, user_email))
    ]);
    
    return res.status(200).json({ 
      success: true, 
      message: 'All journal data cleared successfully' 
    });
  } catch (error) {
    console.error('Error clearing all journal data:', error);
    return res.status(500).json({ error: 'Failed to clear journal data' });
  }
}