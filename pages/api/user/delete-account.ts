import { NextApiRequest, NextApiResponse } from 'next';
import { auth, clearCookie, clearUserData } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface DeleteAccountRequest {
  email: string;
  password: string;
  confirmation: string;
}

// Rate limiting storage (in production, use Redis or database)
const deleteAttempts = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const attempts = deleteAttempts.get(email);
  
  if (!attempts || now > attempts.resetTime) {
    deleteAttempts.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

async function deleteUserFromDatabase(email: string, userId: number): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`🗑️ Starting database cleanup for user: [SANITIZED] (ID: [SANITIZED])`);
    
    // Delete in order to respect foreign key constraints
    
    // 1. Delete user settings
    await client.query('DELETE FROM user_settings WHERE user_email = $1', [email]);
    console.log('✅ Deleted user_settings');
    
    // 2. Delete analytics data
    await client.query('DELETE FROM analytics WHERE user_email = $1', [email]);
    console.log('✅ Deleted analytics');
    
    // 3. Delete conversations
    await client.query('DELETE FROM conversations WHERE user_id = $1', [email]);
    console.log('✅ Deleted conversations');
    
    // 4. Delete habit completions
    await client.query('DELETE FROM "habitCompletions" WHERE "userId" = $1', [email]);
    console.log('✅ Deleted habitCompletions');
    
    // 5. Delete habits
    await client.query('DELETE FROM habits WHERE "userId" = $1', [email]);
    console.log('✅ Deleted habits');
    
    // 6. Delete journal entries
    await client.query('DELETE FROM journal_entries WHERE user_email = $1', [email]);
    console.log('✅ Deleted journal_entries');
    
    // 7. Delete journal activities
    await client.query('DELETE FROM journal_activities WHERE user_email = $1', [email]);
    console.log('✅ Deleted journal_activities');
    
    // 8. Delete journal moods
    await client.query('DELETE FROM journal_moods WHERE user_email = $1', [email]);
    console.log('✅ Deleted journal_moods');
    
    // 9. Delete journal sleep data
    await client.query('DELETE FROM journal_sleep WHERE user_email = $1', [email]);
    console.log('✅ Deleted journal_sleep');
    
    // 10. Delete notes
    await client.query('DELETE FROM notes WHERE user_email = $1', [email]);
    console.log('✅ Deleted notes');
    
    // 11. Delete tasks
    await client.query('DELETE FROM tasks WHERE user_email = $1', [email]);
    console.log('✅ Deleted tasks');
    
    // 12. Delete sessions (using userId)
    await client.query('DELETE FROM sessions WHERE "userId" = $1', [userId]);
    console.log('✅ Deleted sessions');
    
    // 13. Delete accounts (OAuth connections, using userId)
    await client.query('DELETE FROM accounts WHERE "userId" = $1', [userId]);
    console.log('✅ Deleted accounts');
    
    // 14. Finally delete the user record
    await client.query('DELETE FROM users WHERE id = $1 AND email = $2', [userId, email]);
    console.log('✅ Deleted user record');
    
    await client.query('COMMIT');
    console.log(`✅ Successfully deleted all data for user: [SANITIZED]`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Authenticate the user
    const authUser = auth(req);
    if (!authUser) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { email, password, confirmation }: DeleteAccountRequest = req.body;

    // Validate required fields
    if (!email || !password || !confirmation) {
      return res.status(400).json({ 
        message: 'Email, password, and confirmation are required' 
      });
    }

    // Verify the authenticated user matches the request
    if (authUser.email !== email) {
      return res.status(403).json({ 
        message: 'You can only delete your own account' 
      });
    }

    // Check rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ 
        message: 'Too many deletion attempts. Please try again later.' 
      });
    }

    // Verify confirmation text
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ 
        message: 'Invalid confirmation text' 
      });
    }

    // Get user from database to verify password
    const client = await pool.connect();
    let userRecord;
    
    try {
      const userResult = await client.query(
        'SELECT id, email, password FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      userRecord = userResult.rows[0];
    } finally {
      client.release();
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, userRecord.password);
    if (!passwordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Perform comprehensive database cleanup
    await deleteUserFromDatabase(email, userRecord.id);

    // Clear client-side data (this will run on the client)
    try {
      await clearUserData(email);
    } catch (error) {
      console.warn('Client-side cleanup error (expected on server):', error);
    }

    // Clear authentication cookie
    clearCookie(res, 'auth-token', req);

    // Clear rate limit record on successful deletion
    deleteAttempts.delete(email);

    console.log(`🎉 Account deletion completed successfully for: [SANITIZED]`);

    return res.status(200).json({ 
      message: 'Account deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during account deletion' 
    });
  }
}