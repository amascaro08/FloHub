import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { journalEntries, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

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
  
  // Handle GET request - retrieve journal entry
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const entry = await db.query.journalEntries.findFirst({
        where: and(eq(journalEntries.user_email, user_email), eq(journalEntries.date, date)),
      });
      
      if (!entry) {
        return res.status(200).json({ content: '', timestamp: new Date().toISOString() });
      }
      
      return res.status(200).json({ content: entry.content, timestamp: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString() });
    } catch (error) {
      console.error('Error retrieving journal entry:', error);
      return res.status(500).json({ error: 'Failed to retrieve journal entry' });
    }
  }
  
  // Handle POST request - save journal entry
  if (req.method === 'POST') {
    const { date, content } = req.body;
    
    if (!date || !content) {
      return res.status(400).json({ error: 'Date and content are required' });
    }
    
    try {
      await db.insert(journalEntries).values({
        user_email,
        date,
        content,
      }).onConflictDoUpdate({
        target: [journalEntries.user_email, journalEntries.date],
        set: {
          content,
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return res.status(500).json({ error: 'Failed to save journal entry' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}