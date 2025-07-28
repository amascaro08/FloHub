import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Default sidebar preferences
const DEFAULT_PREFERENCES = {
  visiblePages: ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  order: ["Hub", "Tasks", "Notes", "Habits", "Journal", "Calendar", "Meetings", "Feedback"],
  collapsed: false
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const client = await pool.connect();
    
    try {
      // Try to get from users table first
      const userResult = await client.query(
        'SELECT sidebar_preferences FROM users WHERE email = $1',
        [userId]
      );

      let preferences = DEFAULT_PREFERENCES;
      
      if (userResult.rows.length > 0 && userResult.rows[0].sidebar_preferences) {
        preferences = {
          ...DEFAULT_PREFERENCES,
          ...userResult.rows[0].sidebar_preferences
        };
      }

      res.status(200).json(preferences);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching sidebar preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, preferences } = req.body;

    if (!userId || !preferences) {
      return res.status(400).json({ error: 'User ID and preferences are required' });
    }

    // Validate preferences structure
    if (typeof preferences !== 'object' || 
        !Array.isArray(preferences.visiblePages) || 
        !Array.isArray(preferences.order)) {
      return res.status(400).json({ error: 'Invalid preferences format' });
    }

    const client = await pool.connect();
    
    try {
      // Update the users table
      await client.query(
        'UPDATE users SET sidebar_preferences = $1 WHERE email = $2',
        [JSON.stringify(preferences), userId]
      );

      res.status(200).json({ success: true, preferences });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving sidebar preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}