import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use getToken instead of getuser for better compatibility with API routes
  const user = await auth(req);
  
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = user.email as string;
  
  // Handle GET request - retrieve sleep data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const { rows } = await query(
        'SELECT quality, hours FROM journal_sleep WHERE user_email = $1 AND date = $2',
        [userEmail, date]
      );
      
      if (rows.length === 0) {
        return res.status(200).json({ quality: '', hours: 7 });
      }
      
      return res.status(200).json(rows[0]);
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
      // Check if sleep data already exists for this date
      await query(
        `INSERT INTO journal_sleep (user_email, date, quality, hours, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_email, date) DO UPDATE SET
           quality = EXCLUDED.quality,
           hours = EXCLUDED.hours,
           updated_at = NOW()`,
        [userEmail, date, quality, hours]
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving sleep data:', error);
      return res.status(500).json({ error: 'Failed to save sleep data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}