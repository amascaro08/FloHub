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
  
  // Handle GET request - retrieve activities data
  if (req.method === 'GET') {
    const { date } = req.query;
    
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    
    try {
      const { rows } = await query(
        'SELECT activities FROM journal_activities WHERE user_email = $1 AND date = $2',
        [userEmail, date]
      );
      
      if (rows.length === 0) {
        return res.status(200).json({ activities: [] });
      }
      
      return res.status(200).json({ activities: rows[0].activities });
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
      // Check if activities data already exists for this date
      await query(
        `INSERT INTO journal_activities (user_email, date, activities, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (user_email, date) DO UPDATE SET
           activities = EXCLUDED.activities,
           updated_at = NOW()`,
        [userEmail, date, uniqueActivities]
      );
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving activities data:', error);
      return res.status(500).json({ error: 'Failed to save activities data' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}