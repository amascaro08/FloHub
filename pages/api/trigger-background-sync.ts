import type { NextApiRequest, NextApiResponse } from 'next';
import { PowerAutomateSyncService } from '../../lib/powerAutomateSync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Simple auth check - can be called with a secret or from same origin
  const authHeader = req.headers.authorization;
  const secret = req.headers['x-sync-secret'] || req.query.secret;
  const cronSecret = process.env.CRON_SECRET;
  
  const isAuthorized = 
    (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (secret && cronSecret && secret === cronSecret) ||
    req.headers.referer?.includes(req.headers.host || ''); // Same origin

  if (!isAuthorized) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Please provide valid authorization'
    });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Triggering background Power Automate sync...');
    
    const syncService = PowerAutomateSyncService.getInstance();
    await syncService.triggerBackgroundSyncIfNeeded();
    
    console.log('Background sync trigger completed');

    return res.status(200).json({
      success: true,
      message: 'Background sync triggered successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Background sync trigger failed:', error);
    return res.status(500).json({
      error: 'Background sync trigger failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}