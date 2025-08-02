import type { NextApiRequest, NextApiResponse } from 'next';
import { syncAllPowerAutomateUsers } from '../../../scripts/power-automate-cron';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is a Vercel cron request
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting Power Automate sync cron job...');
    
    const results = await syncAllPowerAutomateUsers();
    
    const successfulUsers = results.filter(r => r.success).length;
    const totalUsers = results.length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Cron job completed: ${successfulUsers}/${totalUsers} users synced successfully`);

    return res.status(200).json({
      success: true,
      message: 'Power Automate sync cron job completed',
      summary: {
        totalUsers,
        successfulUsers,
        failedUsers: totalUsers - successfulUsers,
        totalErrors
      },
      results
    });

  } catch (error) {
    console.error('Power Automate sync cron job failed:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}