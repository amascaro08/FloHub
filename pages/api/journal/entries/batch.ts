import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { query } from '@/lib/neon';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use getToken instead of getuser for better compatibility with API routes
  const user = await auth(req);
  
  if (!user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userEmail = user.email as string;
  
  // Get dates from request body
  const { dates } = req.body;
  
  if (!Array.isArray(dates)) {
    return res.status(400).json({ error: 'Dates array is required' });
  }
  
  try {
    // Create a map of date to hasContent
    const entries: Record<string, boolean> = {};
    
    // Initialize all dates to false
    dates.forEach(date => {
      entries[date] = false;
    });
    
    // Firestore 'in' operator can only handle up to 10 values
    // Process dates in chunks of 10
    const chunkSize = 10;
    for (let i = 0; i < dates.length; i += chunkSize) {
      const chunk = dates.slice(i, i + chunkSize);
      
      const { rows } = await query(
        'SELECT date, content FROM journal_entries WHERE user_email = $1 AND date = ANY($2::date[])',
        [userEmail, chunk]
      );
      
      // Update entries that have content
      rows.forEach(row => {
        if (row.date && row.content && row.content.trim() !== '') {
          entries[row.date] = true;
        }
      });
    }
    
    return res.status(200).json({ entries });
  } catch (error) {
    console.error('Error retrieving batch entries:', error);
    return res.status(500).json({ error: 'Failed to retrieve batch entries' });
  }
}