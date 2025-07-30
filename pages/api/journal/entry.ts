import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { journalEntries } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { prepareContentForStorage, retrieveContentFromStorage } from '@/lib/contentSecurity';

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
      
      return res.status(200).json({ 
        content: retrieveContentFromStorage(entry.content || ""), 
        timestamp: entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString() 
      });
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
      const encryptedContent = prepareContentForStorage(content);
      
      await db.insert(journalEntries).values({
        user_email,
        date,
        content: encryptedContent,
      }).onConflictDoUpdate({
        target: [journalEntries.user_email, journalEntries.date],
        set: {
          content: encryptedContent,
          updatedAt: new Date(),
        },
      });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return res.status(500).json({ error: 'Failed to save journal entry' });
    }
  }
  
  // Handle DELETE request - clear journal entry for specific date
  if (req.method === 'DELETE') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      await db.delete(journalEntries)
        .where(and(eq(journalEntries.user_email, user_email), eq(journalEntries.date, date)));
      
      return res.status(200).json({ success: true, message: 'Journal entry cleared' });
    } catch (error) {
      console.error('Error clearing journal entry:', error);
      return res.status(500).json({ error: 'Failed to clear journal entry' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}