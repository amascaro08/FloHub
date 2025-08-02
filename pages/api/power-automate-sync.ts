import type { NextApiRequest, NextApiResponse } from 'next';
import { PowerAutomateSyncService } from '../../lib/powerAutomateSync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail, powerAutomateUrl, sourceId, forceRefresh } = req.body;

    if (!userEmail || !powerAutomateUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail and powerAutomateUrl' 
      });
    }

    const syncService = PowerAutomateSyncService.getInstance();
    
    // Perform the sync
    const result = await syncService.syncUserEvents(
      userEmail,
      powerAutomateUrl,
      sourceId || 'default',
      forceRefresh || false
    );

    // If this is a successful sync, trigger background sync for other users who haven't synced recently
    if (result.success) {
      // Fire and forget - trigger background sync for other users (don't await)
      syncService.triggerBackgroundSyncIfNeeded().catch(error => {
        console.warn('Background sync failed:', error);
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('Power Automate sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}