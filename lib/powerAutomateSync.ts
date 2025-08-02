import { db } from './drizzle';
import { calendarEvents } from '../db/schema';
import { eq, and, or, isNull, isNotNull, gte } from 'drizzle-orm';
import { parseISO, addDays, subDays } from 'date-fns';
import { prepareContentForStorage, retrieveContentFromStorage } from './contentSecurity';

export interface PowerAutomateEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  location?: string;
  isRecurring?: boolean;
  seriesMasterId?: string;
  instanceIndex?: number;
  recurrence?: any;
}

export interface SyncResult {
  success: boolean;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}

export class PowerAutomateSyncService {
  private static instance: PowerAutomateSyncService;
  
  private constructor() {}
  
  public static getInstance(): PowerAutomateSyncService {
    if (!PowerAutomateSyncService.instance) {
      PowerAutomateSyncService.instance = new PowerAutomateSyncService();
    }
    return PowerAutomateSyncService.instance;
  }

  /**
   * Fetch events from Power Automate URL with timeout protection
   */
  private async fetchPowerAutomateEvents(url: string, timeout: number = 10000): Promise<PowerAutomateEvent[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Power Automate request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Normalize the response data
      const events = Array.isArray(data) 
        ? data 
        : Array.isArray(data.events) 
        ? data.events 
        : data.value || [];

      return events.map((event: any) => ({
        id: event.id || event.eventId,
        title: event.title || event.subject || 'Untitled',
        startTime: event.startTime || event.start?.dateTime || event.start?.date,
        endTime: event.endTime || event.end?.dateTime || event.end?.date,
        description: event.description || event.body,
        location: event.location,
        isRecurring: event.isRecurring || false,
        seriesMasterId: event.seriesMasterId,
        instanceIndex: event.instanceIndex,
        recurrence: event.recurrence
      }));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Expand recurring events into individual instances
   */
  private expandRecurringEvents(events: PowerAutomateEvent[]): PowerAutomateEvent[] {
    const expandedEvents: PowerAutomateEvent[] = [];
    
    // Group events by title to identify recurring series
    const eventsByTitle = new Map<string, PowerAutomateEvent[]>();
    
    events.forEach(event => {
      const title = event.title;
      if (!eventsByTitle.has(title)) {
        eventsByTitle.set(title, []);
      }
      eventsByTitle.get(title)!.push(event);
    });

    // Process each group
    eventsByTitle.forEach((groupEvents, title) => {
      const isRecurringSeries = groupEvents.length > 1;
      
      groupEvents.forEach((event, index) => {
        expandedEvents.push({
          ...event,
          isRecurring: isRecurringSeries,
          seriesMasterId: isRecurringSeries ? `series_${title.replace(/\s+/g, '_')}` : undefined,
          instanceIndex: isRecurringSeries ? index : undefined
        });
      });
    });

    return expandedEvents;
  }

  /**
   * Generate stable ID for Power Automate events
   */
  private generateEventId(event: PowerAutomateEvent, userEmail: string, sourceId: string): string {
    const startTime = event.startTime;
    const summary = event.title;
    return `powerautomate_${encodeURIComponent(summary)}_${startTime}_${sourceId}_${userEmail}`;
  }

  /**
   * Sync Power Automate events for a specific user
   */
  public async syncUserEvents(
    userEmail: string, 
    powerAutomateUrl: string, 
    sourceId: string = 'default',
    forceRefresh: boolean = false
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: []
    };

    try {
      console.log(`🔄 Starting Power Automate sync for user: ${userEmail}, source: ${sourceId}`);
      console.log(`📡 Power Automate URL: ${powerAutomateUrl}`);

      // Fetch events from Power Automate
      const rawEvents = await this.fetchPowerAutomateEvents(powerAutomateUrl);
      console.log(`📥 Fetched ${rawEvents.length} raw events from Power Automate`);

      // Expand recurring events
      const expandedEvents = this.expandRecurringEvents(rawEvents);
      console.log(`🔄 Expanded to ${expandedEvents.length} events`);

      // Get existing events for this user and source
      console.log(`🔍 Checking for existing events in database...`);
      const existingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.user_email, userEmail),
            eq(calendarEvents.source, 'powerautomate')
            // Note: We check all powerautomate events for this user, not filtered by sourceId
            // because externalId contains the actual event ID, not the sourceId
          )
        );

      console.log(`📊 Found ${existingEvents.length} existing Power Automate events in database`);

      const existingEventMap = new Map(
        existingEvents.map(event => [event.externalId, event])
      );

      // Process each event
      console.log(`⚙️ Processing ${expandedEvents.length} events for database storage...`);
      for (const event of expandedEvents) {
        try {
          const eventId = this.generateEventId(event, userEmail, sourceId);
          const existingEvent = existingEventMap.get(event.id);

          const eventData = {
            id: eventId,
            user_email: userEmail,
            user_id: userEmail, // Use email as user_id for consistency
            summary: prepareContentForStorage(event.title || 'Untitled Event'),
            description: prepareContentForStorage(event.description || ''),
            location: prepareContentForStorage(event.location || ''),
            start: {
              dateTime: event.startTime,
              date: event.startTime.includes('T') ? undefined : event.startTime
            },
            end: event.endTime ? {
              dateTime: event.endTime,
              date: event.endTime.includes('T') ? undefined : event.endTime
            } : undefined,
            calendarId: `powerautomate_${sourceId}`,
            source: 'powerautomate',
            tags: ['work', 'powerautomate'],
            isRecurring: event.isRecurring || false,
            seriesMasterId: event.seriesMasterId,
            instanceIndex: event.instanceIndex,
            eventId: event.id,
            externalId: event.id,
            externalSource: 'powerautomate',
            recurrence: event.recurrence,
            syncStatus: 'synced',
            lastUpdated: new Date(),
            updatedAt: new Date()
          };

          if (existingEvent) {
            // Update existing event
            console.log(`🔄 Updating existing event: ${event.title}`);
            await db
              .update(calendarEvents)
              .set(eventData)
              .where(eq(calendarEvents.id, existingEvent.id));
            
            result.eventsUpdated++;
          } else {
            // Create new event
            console.log(`➕ Creating new event: ${event.title}`);
            console.log(`🔍 Event data:`, {
              id: eventData.id,
              user_email: eventData.user_email,
              summary: event.title,
              start: eventData.start,
              source: eventData.source
            });
            
            const insertResult = await db.insert(calendarEvents).values({
              ...eventData,
              createdAt: new Date()
            });
            
            console.log(`✅ Successfully inserted event into database`);
            result.eventsCreated++;
          }

          result.eventsProcessed++;
        } catch (error) {
          console.error(`Error processing event ${event.id}:`, error);
          result.errors.push(`Event ${event.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Mark events that are no longer in the source as deleted
      const currentEventIds = new Set(expandedEvents.map(e => e.id));
      const eventsToDelete = existingEvents.filter(event => 
        event.externalId && !currentEventIds.has(event.externalId)
      );

      for (const event of eventsToDelete) {
        await db
          .update(calendarEvents)
          .set({ 
            syncStatus: 'deleted',
            updatedAt: new Date()
          })
          .where(eq(calendarEvents.id, event.id));
        
        result.eventsDeleted++;
      }

      result.success = true;
      console.log(`✅ Power Automate sync completed for user: ${userEmail}`);
      console.log(`📊 Sync Results:`, {
        eventsProcessed: result.eventsProcessed,
        eventsCreated: result.eventsCreated,
        eventsUpdated: result.eventsUpdated,
        eventsDeleted: result.eventsDeleted,
        errors: result.errors.length
      });

    } catch (error) {
      console.error(`Power Automate sync failed for user: ${userEmail}:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync all users with Power Automate URLs
   */
  public async syncAllUsers(): Promise<SyncResult[]> {
    // This would need to be implemented based on how you store Power Automate URLs
    // For now, this is a placeholder that would need to be customized
    console.log('Sync all users - implement based on your user settings storage');
    return [];
  }

  /**
   * Get sync status for a user
   */
  public async getSyncStatus(userEmail: string, sourceId: string): Promise<{
    lastSync: Date | null;
    totalEvents: number;
    syncedEvents: number;
    pendingEvents: number;
    errorEvents: number;
  }> {
    const events = await db
      .select({
        lastUpdated: calendarEvents.lastUpdated,
        syncStatus: calendarEvents.syncStatus
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.user_email, userEmail),
          eq(calendarEvents.externalSource, 'powerautomate'),
          eq(calendarEvents.externalId, sourceId)
        )
      );

    const lastSync = events.length > 0 
      ? events.reduce((latest, event) => 
          event.lastUpdated && (!latest || event.lastUpdated > latest) 
            ? event.lastUpdated 
            : latest, null as Date | null)
      : null;

    const statusCounts = events.reduce((acc, event) => {
      const status = event.syncStatus || 'synced';
      switch (status) {
        case 'synced':
          acc.synced++;
          break;
        case 'pending':
          acc.pending++;
          break;
        case 'error':
          acc.error++;
          break;
        case 'deleted':
          acc.deleted++;
          break;
        default:
          acc.synced++; // Default unknown statuses to synced
      }
      return acc;
    }, { synced: 0, pending: 0, error: 0, deleted: 0 });

    return {
      lastSync,
      totalEvents: events.length,
      syncedEvents: statusCounts.synced,
      pendingEvents: statusCounts.pending,
      errorEvents: statusCounts.error
    };
  }

  /**
   * Triggers background sync for users who haven't synced recently (6+ hours ago)
   * This provides automatic periodic syncing without requiring Vercel Pro cron jobs
   */
  public async triggerBackgroundSyncIfNeeded(): Promise<void> {
    try {
      console.log('🔄 Starting background sync check...');
      // Import here to avoid circular dependencies
      const { userSettings } = await import('../db/schema');
      
      // Find users with Power Automate configured who haven't synced in 6+ hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
      
      // Get users with Power Automate URLs who haven't synced recently
      const usersToSync = await db
        .select({
          user_email: userSettings.user_email,
          calendarSources: userSettings.calendarSources
        })
        .from(userSettings)
        .where(isNotNull(userSettings.user_email))
        .limit(5); // Limit to 5 users per trigger to avoid timeouts

      console.log(`📊 Found ${usersToSync.length} users to check for sync`);

      for (const user of usersToSync) {
        try {
          console.log(`👤 Checking sync status for user: ${user.user_email}`);
          
          // Check if user has synced recently
          const recentSync = await db
            .select({ lastUpdated: calendarEvents.lastUpdated })
            .from(calendarEvents)
            .where(
              and(
                eq(calendarEvents.user_email, user.user_email),
                eq(calendarEvents.source, 'powerautomate'),
                gte(calendarEvents.lastUpdated, sixHoursAgo)
              )
            )
            .limit(1);

          console.log(`📅 Recent sync check: found ${recentSync.length} recent events for ${user.user_email}`);

          if (recentSync.length > 0) {
            console.log(`⏭️ User ${user.user_email} synced recently, skipping`);
            continue; // User synced recently, skip
          }

          // Find Power Automate sources for this user
          const powerAutomateSources: Array<{ id: string; connectionData: string }> = [];

          console.log(`🔍 Raw calendar sources for ${user.user_email}:`, {
            calendarSources: user.calendarSources,
            type: typeof user.calendarSources,
            isArray: Array.isArray(user.calendarSources),
            length: user.calendarSources?.length
          });

          // Check calendar sources
          if (user.calendarSources && Array.isArray(user.calendarSources)) {
            console.log(`📋 Processing ${user.calendarSources.length} calendar sources...`);
            user.calendarSources.forEach((source: any, index: number) => {
              console.log(`📎 Source ${index}:`, {
                id: source.id,
                type: source.type,
                name: source.name,
                hasConnectionData: !!source.connectionData
              });
              
              if (source.type === 'powerautomate' && source.connectionData) {
                console.log(`✅ Found Power Automate source: ${source.id}`);
                powerAutomateSources.push({
                  id: source.id || 'default',
                  connectionData: source.connectionData
                });
              }
            });
          } else {
            console.log(`❌ Calendar sources not found or not an array for ${user.user_email}`);
          }

          console.log(`🔗 Found ${powerAutomateSources.length} Power Automate sources for ${user.user_email}`);

          if (powerAutomateSources.length === 0) {
            console.log(`⚠️ No Power Automate sources found for user: ${user.user_email}`);
            continue;
          }

          // Sync each source (background, don't throw errors)
          for (const source of powerAutomateSources) {
            try {
              console.log(`🔄 Background sync for user: ${user.user_email}, source: ${source.id}`);
              const syncResult = await this.syncUserEvents(
                user.user_email,
                source.connectionData,
                source.id,
                false // Don't force refresh for background sync
              );
              console.log(`✅ Background sync completed for ${user.user_email}, source: ${source.id}`, syncResult);
            } catch (error) {
              console.warn(`Background sync failed for user ${user.user_email}, source ${source.id}:`, error);
              // Continue with other sources/users
            }
          }

        } catch (error) {
          console.warn(`Error processing background sync for user ${user.user_email}:`, error);
          // Continue with other users
        }
      }

    } catch (error) {
      console.warn('Background sync trigger failed:', error);
      // Don't throw - this is a background operation
    }
  }
}