import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use getToken instead of getuser for better compatibility with API routes 
  const user = await auth(req);
  
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = user.id;
  
  // Handle GET request - retrieve mood data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const { rows } = await query(
        'SELECT emoji, label, tags FROM journal_moods WHERE user_email = $1 AND date = $2',
        [userEmail, date]
      );
      
      if (rows.length === 0) {
        return res.status(200).json({ emoji: '', label: '', tags: [] });
      }
      
      return res.status(200).json(rows[0]);
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
      // Check if mood data already exists for this date
      await query(
        `INSERT INTO journal_moods (user_email, date, emoji, label, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (user_email, date) DO UPDATE SET
           emoji = EXCLUDED.emoji,
           label = EXCLUDED.label,
           tags = EXCLUDED.tags,
           updated_at = NOW()`,
        [userEmail, date, emoji, label, tags || []]
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving mood data:', error);
      return res.status(500).json({ error: 'Failed to save mood data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}