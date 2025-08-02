import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '../../lib/auth';
import { getUserById } from '../../lib/user';
import { db } from '../../lib/drizzle';
import { userSettings, calendarEvents } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { PowerAutomateSyncService } from '../../lib/powerAutomateSync';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    console.log(`🔍 Debugging Power Automate for user: ${user.email}`);

    // 1. Check user settings for Power Automate sources
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user.email),
    });

    const debug = {
      userEmail: user.email,
      hasSettings: !!settings,
      calendarSources: settings?.calendarSources || [],
      powerAutomateSources: [] as any[],
      existingPowerAutomateEvents: 0,
      syncResults: null as any
    };

    if (settings?.calendarSources && Array.isArray(settings.calendarSources)) {
      debug.powerAutomateSources = settings.calendarSources.filter((source: any) => 
        source.type === 'powerautomate'
      );
    }

    console.log(`📊 Found ${debug.powerAutomateSources.length} Power Automate sources`);

    // 2. Check existing Power Automate events in database
    const existingEvents = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.user_email, user.email),
          eq(calendarEvents.source, 'powerautomate')
        )
      );

    debug.existingPowerAutomateEvents = existingEvents.length;
    console.log(`📅 Found ${existingEvents.length} existing Power Automate events in database`);

    // 3. If user has Power Automate sources, try to sync one
    if (debug.powerAutomateSources.length > 0) {
      const firstSource = debug.powerAutomateSources[0];
      console.log(`🔄 Testing sync for source: ${firstSource.id}`);

      if (firstSource.connectionData) {
        const syncService = PowerAutomateSyncService.getInstance();
        
        try {
          const syncResult = await syncService.syncUserEvents(
            user.email,
            firstSource.connectionData,
            firstSource.id,
            true // Force refresh for debugging
          );
          
          debug.syncResults = syncResult;
          console.log(`✅ Sync completed:`, syncResult);
        } catch (syncError) {
          console.error(`❌ Sync failed:`, syncError);
          debug.syncResults = {
            success: false,
            error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
          };
        }
      } else {
        debug.syncResults = {
          success: false,
          error: 'No connection data found for Power Automate source'
        };
      }
    }

    // 4. Check events again after sync
    const eventsAfterSync = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.user_email, user.email),
          eq(calendarEvents.source, 'powerautomate')
        )
      );

    debug.existingPowerAutomateEvents = eventsAfterSync.length;

    return res.status(200).json({
      success: true,
      debug,
      message: 'Power Automate debug completed',
      eventsInDatabase: eventsAfterSync.map(event => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        syncStatus: event.syncStatus,
        externalSource: event.externalSource,
        externalId: event.externalId
      }))
    });

  } catch (error) {
    console.error('Debug Power Automate error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}