import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalSleep } from '@/db/schema';
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
  const user_email = user.email;
  
  // Handle GET request - retrieve sleep data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const sleep = await db.query.journalSleep.findFirst({
        where: and(eq(journalSleep.user_email, user_email), eq(journalSleep.date, date)),
      });
      
      if (!sleep) {
        return res.status(200).json({ quality: '', hours: 7 });
      }
      
      return res.status(200).json(sleep);
    } catch (error) {
      console.error('Error retrieving sleep data:', error);
      return res.status(500).json({ error: 'Failed to retrieve sleep data' });
    }
  }
  
  // Handle POST request - save sleep data
  if (req.method === 'POST') {
    const { date, quality, hours } = req.body;
    
    if (!date || !quality || hours === undefined) {
      return res.status(400).json({ error: 'Date, quality, and hours are required' });
    }
    
    try {
      await db.insert(journalSleep).values({
        user_email,
        date,
        quality,
        hours,
      }).onConflictDoUpdate({
        target: [journalSleep.user_email, journalSleep.date],
        set: {
          quality,
          hours,
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving sleep data:', error);
      return res.status(500).json({ error: 'Failed to save sleep data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}