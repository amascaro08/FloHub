import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { CalendarEvent } from '@/types/calendar';
import { calendarCache } from '@/lib/calendarCache';

interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  calendarSourcesHash?: string; // Hash of calendar sources to detect changes
}

// Enhanced cache for calendar events with IndexedDB integration
const eventCache = new Map<string, CachedEvent>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (increased for stability)

// Background refresh interval - increased to reduce flickering
const BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

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
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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

export const useCalendarEvents = ({ startDate, endDate, enabled = true, calendarSourcesHash }: UseCalendarEventsOptions) => {
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const isLoadingRef = useRef(false); // Prevent duplicate loading
  const mountedRef = useRef(true);

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

    return () => {
      mountedRef.current = false;
    };
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
    if (!enabled || isInitializing || isLoadingRef.current) return;

    // Prevent duplicate loading
    isLoadingRef.current = true;

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
        if (cached && mountedRef.current) {
          setLocalEvents(cached);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Fetch from API
      const events = await fetchEvents(startDate, endDate);
      
      if (!mountedRef.current) return; // Component unmounted
      
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

      // Cache in IndexedDB by source type (only if significant changes)
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

      // Cache each source separately in IndexedDB (batched)
      try {
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
      } catch (cacheError) {
        console.warn('Cache update failed:', cacheError);
        // Don't fail the entire operation for cache errors
      }

      if (mountedRef.current) {
        setLocalEvents(deduplicatedEvents);
        lastSyncTimeRef.current = Date.now();
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load events'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsBackgroundRefreshing(false);
      }
      isLoadingRef.current = false;
    }
  }, [startDate, endDate, enabled, cacheKey, getCachedEvents, isInitializing]);

  // Background refresh function with delta loading - simplified
  const startBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      
      try {
        // Simple background refresh without delta loading to reduce complexity
        await loadEvents(true);
      } catch (error) {
        console.error('Background refresh error:', error);
      }
    }, BACKGROUND_REFRESH_INTERVAL);
  }, [loadEvents]);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
      backgroundRefreshRef.current = null;
    }
  }, []);

  // Add event to cache and local state
  const addEvent = useCallback(async (newEvent: CalendarEvent) => {
    if (!mountedRef.current) return;
    
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
    if (!mountedRef.current) return;
    
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
    if (!mountedRef.current) return;
    
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

  // Clear cache and reload when calendar sources change - debounced
  useEffect(() => {
    if (!isInitializing && calendarSourcesHash) {
      const timeoutId = setTimeout(() => {
        console.log('Calendar sources changed, clearing cache and reloading events');
        invalidateCache().then(() => {
          loadEvents(false); // Don't force background reload
        });
      }, 500); // Debounce by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [calendarSourcesHash, isInitializing, invalidateCache, loadEvents]);

  // Load events on mount and when dependencies change - debounced
  useEffect(() => {
    if (!isInitializing) {
      const timeoutId = setTimeout(() => {
        loadEvents();
      }, 100); // Small debounce to prevent rapid calls

      return () => clearTimeout(timeoutId);
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