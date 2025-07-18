import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalMoods } from '@/db/schema';
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
  
  // Handle GET request - retrieve mood data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const mood = await db.query.journalMoods.findFirst({
        where: and(eq(journalMoods.userEmail, userEmail), eq(journalMoods.date, date)),
      });
      
      if (!mood) {
        return res.status(200).json({ emoji: '', label: '', tags: [] });
      }
      
      return res.status(200).json(mood);
    } catch (error) {
      console.error('Error retrieving mood data:', error);
      return res.status(500).json({ error: 'Failed to retrieve mood data' });
    }
  }
  
  // Handle POST request - save mood data
  if (req.method === 'POST') {
    const { date, emoji, label, tags } = req.body;
    
    if (!date || !emoji || !label) {
      return res.status(400).json({ error: 'Date, emoji, and label are required' });
    }
    
    try {
      await db.insert(journalMoods).values({
        userEmail,
        date,
        emoji,
        label,
        tags: tags || [],
      }).onConflictDoUpdate({
        target: [journalMoods.userEmail, journalMoods.date],
        set: {
          emoji,
          label,
          tags: tags || [],
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving mood data:', error);
      return res.status(500).json({ error: 'Failed to save mood data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}