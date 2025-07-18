import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalActivities } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  
  // Handle GET request - retrieve activities data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const activities = await db.query.journalActivities.findFirst({
        where: and(eq(journalActivities.userEmail, userEmail), eq(journalActivities.date, date)),
      });
      
      if (!activities) {
        return res.status(200).json({ activities: [] });
      }
      
      return res.status(200).json({ activities: activities.activities });
    } catch (error) {
      console.error('Error retrieving activities data:', error);
      return res.status(500).json({ error: 'Failed to retrieve activities data' });
    }
  }
  
  // Handle POST request - save activities data
  if (req.method === 'POST') {
    const { date, activities } = req.body;
    
    if (!date || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Date and activities array are required' });
    }
    
    // Remove duplicates from activities array
    const uniqueActivities = Array.from(new Set(activities));
    console.log(`Received ${activities.length} activities, ${uniqueActivities.length} unique`);
    
    try {
      await db.insert(journalActivities).values({
        userEmail,
        date,
        activities: uniqueActivities,
      }).onConflictDoUpdate({
        target: [journalActivities.userEmail, journalActivities.date],
        set: {
          activities: uniqueActivities,
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving activities data:', error);
      return res.status(500).json({ error: 'Failed to save activities data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}