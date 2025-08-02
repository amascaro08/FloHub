import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { PowerAutomateSyncService } from '@/lib/powerAutomateSync';
import { db } from '@/lib/drizzle';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate user
  const session = await auth(req, res);
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = session.user.email;

  if (req.method === 'POST') {
    // Handle sync request
    try {
      const { forceRefresh = false, sourceId = 'default' } = req.body;

      // Get user's Power Automate URL from settings
      const userSettingsData = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.user_email, userEmail))
        .limit(1);

      if (!userSettingsData.length) {
        return res.status(404).json({ error: 'User settings not found' });
      }

      const settings = userSettingsData[0];
      
      // Check for Power Automate URL in calendar sources
      let powerAutomateUrl: string | undefined;
      
      if (settings.calendarSources && Array.isArray(settings.calendarSources)) {
        const powerAutomateSource = settings.calendarSources.find(
          (source: any) => source.type === 'powerautomate' && source.id === sourceId
        );
        powerAutomateUrl = powerAutomateSource?.connectionData;
      }

      // Fallback to legacy powerAutomateUrl field
      if (!powerAutomateUrl && settings.powerAutomateUrl) {
        powerAutomateUrl = settings.powerAutomateUrl;
      }

      if (!powerAutomateUrl) {
        return res.status(400).json({ 
          error: 'No Power Automate URL configured for this user',
          details: 'Please configure a Power Automate URL in your calendar settings'
        });
      }

      // Perform sync
      const syncService = PowerAutomateSyncService.getInstance();
      const result = await syncService.syncUserEvents(
        userEmail,
        powerAutomateUrl,
        sourceId,
        forceRefresh
      );

      return res.status(200).json({
        success: true,
        message: 'Power Automate sync completed',
        result
      });

    } catch (error) {
      console.error('Power Automate sync error:', error);
      return res.status(500).json({
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'GET') {
    // Handle status request
    try {
      const { sourceId = 'default' } = req.query;

      const syncService = PowerAutomateSyncService.getInstance();
      const status = await syncService.getSyncStatus(userEmail, sourceId as string);

      return res.status(200).json({
        success: true,
        status
      });

    } catch (error) {
      console.error('Power Automate status error:', error);
      return res.status(500).json({
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}