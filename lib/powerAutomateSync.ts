import { db } from './drizzle';
import { calendarEvents } from '../db/schema';
import { eq, and, or, isNull, isNotNull } from 'drizzle-orm';
import { parseISO, addDays, subDays } from 'date-fns';

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
      console.log(`Starting Power Automate sync for user: ${userEmail}, source: ${sourceId}`);

      // Fetch events from Power Automate
      const rawEvents = await this.fetchPowerAutomateEvents(powerAutomateUrl);
      console.log(`Fetched ${rawEvents.length} raw events from Power Automate`);

      // Expand recurring events
      const expandedEvents = this.expandRecurringEvents(rawEvents);
      console.log(`Expanded to ${expandedEvents.length} events`);

      // Get existing events for this user and source
      const existingEvents = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.user_email, userEmail),
            eq(calendarEvents.externalSource, 'powerautomate'),
            eq(calendarEvents.externalId, sourceId)
          )
        );

      const existingEventMap = new Map(
        existingEvents.map(event => [event.externalId, event])
      );

      // Process each event
      for (const event of expandedEvents) {
        try {
          const eventId = this.generateEventId(event, userEmail, sourceId);
          const existingEvent = existingEventMap.get(event.id);

          const eventData = {
            id: eventId,
            user_email: userEmail,
            user_id: userEmail, // Use email as user_id for consistency
            summary: event.title,
            description: event.description || '',
            location: event.location || '',
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
            await db
              .update(calendarEvents)
              .set(eventData)
              .where(eq(calendarEvents.id, existingEvent.id));
            
            result.eventsUpdated++;
          } else {
            // Create new event
            await db.insert(calendarEvents).values({
              ...eventData,
              createdAt: new Date()
            });
            
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
      console.log(`Power Automate sync completed for user: ${userEmail}`, result);

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
      acc[event.syncStatus || 'synced']++;
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
}