import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { CalendarEvent } from '@/types/calendar';
import { calendarCache } from '@/lib/calendarCache';

interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

// Enhanced cache for calendar events with IndexedDB integration
const eventCache = new Map<string, CachedEvent>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced from 5 minutes)

// Background refresh interval
const BACKGROUND_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface CachedEvent {
  id: string;
  events: CalendarEvent[];
  lastUpdated: number;
}

// Helper to generate cache key
const getCacheKey = (startDate: Date, endDate: Date) => {
  return `${startDate.toISOString()}_${endDate.toISOString()}`;
};

// Helper to check if cache is valid
const isCacheValid = (cachedEvent: CachedEvent) => {
  return Date.now() - cachedEvent.lastUpdated < CACHE_DURATION;
};

// Helper to fetch events from API with timeout
const fetchEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`/api/calendar?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&useCalendarSources=true`, {
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

export const useCalendarEvents = ({ startDate, endDate, enabled = true }: UseCalendarEventsOptions) => {
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(Date.now());

  const cacheKey = getCacheKey(startDate, endDate);

  // Initialize IndexedDB cache
  useEffect(() => {
    const initCache = async () => {
      try {
        await calendarCache.init();
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize calendar cache:', error);
        setIsInitializing(false);
      }
    };

    if (enabled) {
      initCache();
    }
  }, [enabled]);

  // Check cache first (both in-memory and IndexedDB)
  const getCachedEvents = useCallback(async () => {
    // Check in-memory cache first
    const cached = eventCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.events;
    }

    // Check IndexedDB cache
    try {
      const cachedEvents = await calendarCache.getCachedEvents(startDate, endDate);
      if (cachedEvents.length > 0) {
        // Update in-memory cache
        eventCache.set(cacheKey, {
          id: cacheKey,
          events: cachedEvents,
          lastUpdated: Date.now(),
        });
        return cachedEvents;
      }
    } catch (error) {
      console.error('Error reading from IndexedDB cache:', error);
    }

    return null;
  }, [cacheKey, startDate, endDate]);

  // Load events with enhanced caching and background refresh
  const loadEvents = useCallback(async (isBackgroundRefresh = false) => {
    if (!enabled || isInitializing) return;

    if (isBackgroundRefresh) {
      setIsBackgroundRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Check cache first (skip for background refresh)
      if (!isBackgroundRefresh) {
        const cached = await getCachedEvents();
        if (cached) {
          setLocalEvents(cached);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API
      const events = await fetchEvents(startDate, endDate);
      
      // Deduplicate events by ID to prevent duplicates from Power Automate or other sources
      const deduplicatedEvents = Array.from(
        new Map(events.map(event => [event.id, event])).values()
      );
      
      // Cache the result in both in-memory and IndexedDB
      eventCache.set(cacheKey, {
        id: cacheKey,
        events: deduplicatedEvents,
        lastUpdated: Date.now(),
      });

      // Cache in IndexedDB by source type
      const eventsBySource = new Map<string, CalendarEvent[]>();
      deduplicatedEvents.forEach(event => {
        const source = event.calendarId?.startsWith('o365_') ? 'o365' : 
                     event.calendarId?.startsWith('ical_') ? 'ical' : 'google';
        const calendarId = event.calendarId || 'default';
        const key = `${source}_${calendarId}`;
        
        if (!eventsBySource.has(key)) {
          eventsBySource.set(key, []);
        }
        eventsBySource.get(key)!.push(event);
      });

      // Cache each source separately in IndexedDB
      for (const [key, sourceEvents] of Array.from(eventsBySource.entries())) {
        const [source, calendarId] = key.split('_', 2);
        await calendarCache.cacheEvents(
          sourceEvents,
          startDate,
          endDate,
          source as 'google' | 'o365' | 'ical',
          calendarId
        );
      }

      setLocalEvents(deduplicatedEvents);
      lastSyncTimeRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load events'));
    } finally {
      setIsLoading(false);
      setIsBackgroundRefreshing(false);
    }
  }, [startDate, endDate, enabled, cacheKey, getCachedEvents, isInitializing]);

  // Background refresh function with delta loading
  const startBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(async () => {
      try {
        // Check for delta updates
        const deltaResult = await calendarCache.getDeltaEvents(
          startDate,
          endDate,
          lastSyncTimeRef.current
        );

        if (deltaResult.hasNewEvents) {
          // Merge delta events with existing events, ensuring no duplicates
          setLocalEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = deltaResult.events.filter(e => !existingIds.has(e.id));
            
            // If we have new events, create a combined list and deduplicate by ID
            if (newEvents.length > 0) {
              const combined = [...prev, ...newEvents];
              const deduped = Array.from(
                new Map(combined.map(event => [event.id, event])).values()
              );
              return deduped;
            }
            
            return prev;
          });
        } else {
          // Full refresh if no delta available
          loadEvents(true);
        }
      } catch (error) {
        console.error('Background refresh error:', error);
        // Fallback to full refresh
        loadEvents(true);
      }
    }, BACKGROUND_REFRESH_INTERVAL);
  }, [loadEvents, startDate, endDate]);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
      backgroundRefreshRef.current = null;
    }
  }, []);

  // Add event to cache and local state
  const addEvent = useCallback(async (newEvent: CalendarEvent) => {
    setLocalEvents(prev => {
      const updated = [...prev, newEvent];
      
      // Update in-memory cache
      const cached = eventCache.get(cacheKey);
      if (cached) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
        });
      }
      
      return updated;
    });

    // Update IndexedDB cache
    try {
      const source = newEvent.calendarId?.startsWith('o365_') ? 'o365' : 
                   newEvent.calendarId?.startsWith('ical_') ? 'ical' : 'google';
      const calendarId = newEvent.calendarId || 'default';
      
      await calendarCache.cacheEvents(
        [newEvent],
        startDate,
        endDate,
        source as 'google' | 'o365' | 'ical',
        calendarId
      );
    } catch (error) {
      console.error('Error caching new event:', error);
    }
  }, [cacheKey, startDate, endDate]);

  // Update event in cache and local state
  const updateEvent = useCallback(async (eventId: string, updatedEvent: CalendarEvent) => {
    setLocalEvents(prev => {
      const updated = prev.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      // Update in-memory cache
      const cached = eventCache.get(cacheKey);
      if (cached) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
        });
      }
      
      return updated;
    });

    // Update IndexedDB cache
    try {
      const source = updatedEvent.calendarId?.startsWith('o365_') ? 'o365' : 
                   updatedEvent.calendarId?.startsWith('ical_') ? 'ical' : 'google';
      const calendarId = updatedEvent.calendarId || 'default';
      
      await calendarCache.cacheEvents(
        [updatedEvent],
        startDate,
        endDate,
        source as 'google' | 'o365' | 'ical',
        calendarId
      );
    } catch (error) {
      console.error('Error caching updated event:', error);
    }
  }, [cacheKey, startDate, endDate]);

  // Remove event from cache and local state
  const removeEvent = useCallback(async (eventId: string) => {
    setLocalEvents(prev => {
      const updated = prev.filter(event => event.id !== eventId);
      
      // Update in-memory cache
      const cached = eventCache.get(cacheKey);
      if (cached) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
        });
      }
      
      return updated;
    });

    // Note: IndexedDB cache will be updated on next background refresh
  }, [cacheKey]);

  // Invalidate cache for a specific date range
  const invalidateCache = useCallback(async (start?: Date, end?: Date) => {
    const key = getCacheKey(start || startDate, end || endDate);
    eventCache.delete(key);
    
    // Clear IndexedDB cache for the range
    try {
      await calendarCache.clearExpiredCache();
    } catch (error) {
      console.error('Error clearing IndexedDB cache:', error);
    }
  }, [startDate, endDate]);

  // Load events on mount and when dependencies change
  useEffect(() => {
    if (!isInitializing) {
      loadEvents();
    }
  }, [loadEvents, isInitializing]);

  // Start background refresh when component mounts
  useEffect(() => {
    if (enabled && !isInitializing) {
      startBackgroundRefresh();
    }

    return () => {
      stopBackgroundRefresh();
    };
  }, [enabled, startBackgroundRefresh, stopBackgroundRefresh, isInitializing]);

  return {
    events: localEvents,
    isLoading: isLoading || isInitializing,
    error,
    isBackgroundRefreshing,
    addEvent,
    updateEvent,
    removeEvent,
    invalidateCache,
    refetch: () => loadEvents(false),
  };
};