import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use getToken instead of getSession for better compatibility with API routes 
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = token.email as string;
  
  // Handle GET request - retrieve journal entry
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const { rows } = await query(
        'SELECT content, created_at AS "timestamp" FROM journal_entries WHERE user_email = $1 AND date = $2',
        [userEmail, date]
      );
      
      if (rows.length === 0) {
        return res.status(200).json({ content: '', timestamp: new Date().toISOString() });
      }
      
      return res.status(200).json({ content: rows[0].content, timestamp: rows[0].timestamp ? new Date(rows[0].timestamp).toISOString() : new Date().toISOString() });
    } catch (error) {
      console.error('Error retrieving journal entry:', error);
      return res.status(500).json({ error: 'Failed to retrieve journal entry' });
    }
  }
  
  // Handle POST request - save journal entry
  if (req.method === 'POST') {
    const { date, content, timestamp } = req.body;
    
    if (!date || !content) {
      return res.status(400).json({ error: 'Date and content are required' });
    }
    
    try {
      // Check if entry already exists
      await query(
        `INSERT INTO journal_entries (user_email, date, content, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_email, date) DO UPDATE SET
           content = EXCLUDED.content,
           updated_at = NOW()`,
        [userEmail, date, content]
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return res.status(500).json({ error: 'Failed to save journal entry' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}