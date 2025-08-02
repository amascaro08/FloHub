import type { NextApiRequest, NextApiResponse } from 'next';
import { syncAllPowerAutomateUsers } from '../../../scripts/power-automate-cron';

/**
 * Legacy cron endpoint - kept for backward compatibility
 * Recommended to use /api/trigger-background-sync for intelligent syncing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify authorization - support multiple auth methods
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  const webhookSecret = req.headers['x-webhook-secret'] || req.query.secret;
  
  // Check authorization via Bearer token (Vercel style) or webhook secret
  const isAuthorized = 
    (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (webhookSecret && cronSecret && webhookSecret === cronSecret);

  if (!isAuthorized) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please provide valid authorization via Bearer token or webhook secret'
    });
  }

  // Support both GET and POST methods for flexibility with different cron services
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting Power Automate sync job (legacy endpoint)...');
    
    const results = await syncAllPowerAutomateUsers();
    
    const successfulUsers = results.filter(r => r.success).length;
    const totalUsers = results.length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Sync job completed: ${successfulUsers}/${totalUsers} users synced successfully`);

    return res.status(200).json({
      success: true,
      message: 'Power Automate sync job completed',
      summary: {
        totalUsers,
        successfulUsers,
        failedUsers: totalUsers - successfulUsers,
        totalErrors
      },
      results
    });

  } catch (error) {
    console.error('Power Automate sync job failed:', error);
    return res.status(500).json({
      error: 'Sync job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}