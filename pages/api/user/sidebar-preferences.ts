import { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Create pool with better error handling and logging
const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Creating database pool with URL:', databaseUrl.replace(/(\/\/)([^:]+):([^@]+)@/, '//$2:****@'));

  return new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
};

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
  let pool: Pool | null = null;
  let client = null;

  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create pool and test connection
    try {
      pool = createPool();
      client = await pool.connect();
      console.log('Database connection successful');
    } catch (connectionError: any) {
      console.error('Database connection failed:', connectionError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: connectionError?.message || 'Unknown connection error',
        databaseUrlSet: !!process.env.DATABASE_URL,
        isProduction: process.env.NODE_ENV === 'production'
      });
    }
    
    try {
      // First check if the column exists, if not return defaults
      let userResult;
      try {
        userResult = await client.query(
          'SELECT sidebar_preferences FROM user_settings WHERE user_email = $1',
          [userId]
        );
        console.log('Query executed successfully, rows found:', userResult.rows.length);
      } catch (error: any) {
        // If column doesn't exist, return defaults
        if (error?.message?.includes('column "sidebar_preferences" does not exist')) {
          console.log('sidebar_preferences column does not exist yet, returning defaults');
          return res.status(200).json(DEFAULT_PREFERENCES);
        }
        throw error;
      }

      let preferences = DEFAULT_PREFERENCES;
      
      if (userResult.rows.length > 0 && userResult.rows[0].sidebar_preferences) {
        preferences = {
          ...DEFAULT_PREFERENCES,
          ...userResult.rows[0].sidebar_preferences
        };
      }

      res.status(200).json(preferences);
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error: any) {
    console.error('Error fetching sidebar preferences:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  let pool: Pool | null = null;
  let client = null;

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

    // Create pool and test connection
    try {
      pool = createPool();
      client = await pool.connect();
      console.log('Database connection successful for POST');
    } catch (connectionError: any) {
      console.error('Database connection failed:', connectionError);
      return res.status(500).json({ 
        error: 'Database connection failed',
        details: connectionError?.message || 'Unknown connection error'
      });
    }
    
    try {
      // Check if column exists first
      try {
        // Try to update existing record first
        const updateResult = await client.query(
          'UPDATE user_settings SET sidebar_preferences = $1 WHERE user_email = $2',
          [JSON.stringify(preferences), userId]
        );

        if (updateResult.rowCount === 0) {
          // If no existing record, insert new one
          await client.query(
            'INSERT INTO user_settings (user_email, sidebar_preferences) VALUES ($1, $2)',
            [userId, JSON.stringify(preferences)]
          );
        }

        res.status(200).json({ success: true, preferences });
      } catch (error: any) {
        if (error?.message?.includes('column "sidebar_preferences" does not exist')) {
          return res.status(400).json({ 
            error: 'Sidebar preferences column does not exist. Please run the database migration first.',
            migration: 'ALTER TABLE user_settings ADD COLUMN sidebar_preferences JSONB DEFAULT \'{}\';'
          });
        }
        throw error;
      }
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (error: any) {
    console.error('Error saving sidebar preferences:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}