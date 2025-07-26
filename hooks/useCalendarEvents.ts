import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (increased from 2 minutes)

// Background refresh interval
const BACKGROUND_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes (increased from 5 minutes)

interface CachedEvent {
  id: string;
  events: CalendarEvent[];
  lastUpdated: number;
}

// Helper to generate stable cache key
const getCacheKey = (startDate: Date, endDate: Date) => {
  return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
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
    console.log('Fetching calendar events for range:', startDate.toISOString(), 'to', endDate.toISOString());
    
    const response = await fetch(`/api/calendar?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&useCalendarSources=true`, {
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched', data.events?.length || 0, 'events');
    return data.events || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    console.error('Error fetching calendar events:', error);
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
  const isLoadingRef = useRef(false);

  // Stable cache key that doesn't change on every render
  const cacheKey = useMemo(() => getCacheKey(startDate, endDate), [startDate, endDate]);

  // Initialize IndexedDB cache once
  useEffect(() => {
    let isMounted = true;
    
    const initCache = async () => {
      if (!enabled) {
        setIsInitializing(false);
        return;
      }
      
      try {
        await calendarCache.init();
        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('Failed to initialize calendar cache:', error);
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initCache();
    
    return () => {
      isMounted = false;
    };
  }, [enabled]);

  // Check cache first (both in-memory and IndexedDB)
  const getCachedEvents = useCallback(async () => {
    // Check in-memory cache first
    const cached = eventCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      console.log('Using in-memory cache for', cacheKey);
      return cached.events;
    }

    // Check IndexedDB cache
    try {
      const cachedEvents = await calendarCache.getCachedEvents(startDate, endDate);
      if (cachedEvents.length > 0) {
        console.log('Using IndexedDB cache for', cacheKey);
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
    if (!enabled || isInitializing) {
      console.log('Skipping load events - disabled or initializing');
      return;
    }

    // Prevent multiple simultaneous loads
    if (isLoadingRef.current && !isBackgroundRefresh) {
      console.log('Load already in progress, skipping');
      return;
    }

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
        if (cached) {
          setLocalEvents(cached);
          setIsLoading(false);
          isLoadingRef.current = false;
          return;
        }
      }

      // Fetch from API
      const events = await fetchEvents(startDate, endDate);
      
      // Cache the result in both in-memory and IndexedDB
      eventCache.set(cacheKey, {
        id: cacheKey,
        events: events,
        lastUpdated: Date.now(),
      });

      // Cache in IndexedDB by source type
      const eventsBySource = new Map<string, CalendarEvent[]>();
      events.forEach(event => {
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
        try {
          await calendarCache.cacheEvents(
            sourceEvents,
            startDate,
            endDate,
            source as 'google' | 'o365' | 'ical',
            calendarId
          );
        } catch (cacheError) {
          console.warn('Failed to cache events for', key, ':', cacheError);
        }
      }

      setLocalEvents(events);
      lastSyncTimeRef.current = Date.now();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
      console.error('Error loading events:', errorMessage);
      setError(new Error(errorMessage));
    } finally {
      setIsLoading(false);
      setIsBackgroundRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [startDate, endDate, enabled, cacheKey, getCachedEvents, isInitializing]);

  // Background refresh function with delta loading
  const startBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current);
    }

    backgroundRefreshRef.current = setInterval(async () => {
      if (!enabled || isLoadingRef.current) {
        return;
      }
      
      try {
        console.log('Starting background refresh for', cacheKey);
        // Check for delta updates
        const deltaResult = await calendarCache.getDeltaEvents(
          startDate,
          endDate,
          lastSyncTimeRef.current
        );

        if (deltaResult.hasNewEvents) {
          // Merge delta events with existing events
          setLocalEvents(prev => {
            const existingIds = new Set(prev.map(e => e.id));
            const newEvents = deltaResult.events.filter(e => !existingIds.has(e.id));
            if (newEvents.length > 0) {
              console.log('Added', newEvents.length, 'new events from delta');
            }
            return [...prev, ...newEvents];
          });
        } else {
          // Full refresh if no delta available
          loadEvents(true);
        }
      } catch (error) {
        console.error('Background refresh error:', error);
        // Don't fall back to full refresh on error to prevent infinite loops
      }
    }, BACKGROUND_REFRESH_INTERVAL);
  }, [loadEvents, startDate, endDate, enabled, cacheKey]);

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
    let timeoutId: NodeJS.Timeout;
    
    if (!isInitializing && enabled) {
      // Add a small delay to prevent rapid successive calls
      timeoutId = setTimeout(() => {
        loadEvents();
      }, 100);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loadEvents, isInitializing, enabled]);

  // Start background refresh when component mounts
  useEffect(() => {
    if (enabled && !isInitializing) {
      const timeoutId = setTimeout(() => {
        startBackgroundRefresh();
      }, 5000); // Start background refresh after 5 seconds
      
      return () => {
        clearTimeout(timeoutId);
        stopBackgroundRefresh();
      };
    }

    return () => {
      stopBackgroundRefresh();
    };
  }, [enabled, startBackgroundRefresh, stopBackgroundRefresh, isInitializing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBackgroundRefresh();
      isLoadingRef.current = false;
    };
  }, [stopBackgroundRefresh]);

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