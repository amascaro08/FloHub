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
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased for better performance)

// Background refresh interval - DISABLED to prevent loops
const BACKGROUND_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour (much longer)

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

// Helper to fetch events from API with timeout and retries
const fetchEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    const response = await fetch(`/api/calendar?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&useCalendarSources=true`, {
      credentials: 'include',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Calendar request timeout - please try again');
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
  const retryCountRef = useRef(0);
  const maxRetries = 2;
  const lastCalendarSourcesHashRef = useRef<string>(''); // Track last known hash
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
      }
    };
  }, [enabled]);

  // Check cache first (both in-memory and IndexedDB)
  const getCachedEvents = useCallback(async () => {
    try {
      // Check in-memory cache first
      const cached = eventCache.get(cacheKey);
      if (cached && isCacheValid(cached)) {
        return cached.events;
      }

      // Check IndexedDB cache
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
      console.warn('Error reading from cache:', error);
    }

    return null;
  }, [cacheKey, startDate, endDate]);

  // Load events with enhanced error handling and retries - stable version to prevent loops
  const loadEventsStable = useCallback(async (currentStartDate: Date, currentEndDate: Date, isBackgroundRefresh = false, forceReload = false) => {
    if (!enabled || isInitializing || (isLoadingRef.current && !forceReload)) return;

    // Prevent duplicate loading
    isLoadingRef.current = true;

    if (isBackgroundRefresh) {
      setIsBackgroundRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Check cache first (skip for background refresh or force reload)
      if (!isBackgroundRefresh && !forceReload) {
        const cached = await getCachedEvents();
        if (cached && mountedRef.current) {
          setLocalEvents(cached);
          setIsLoading(false);
          isLoadingRef.current = false;
          retryCountRef.current = 0; // Reset retry count on success
          return;
        }
      }

      // Fetch from API with retry logic
      let events: CalendarEvent[] = [];
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          events = await fetchEvents(currentStartDate, currentEndDate);
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          console.warn(`Calendar fetch attempt ${attempt + 1} failed:`, lastError.message);
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      if (!mountedRef.current) return; // Component unmounted
      
      if (events.length === 0 && lastError) {
        throw lastError; // If all retries failed and no events, throw the last error
      }
      
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

      // Cache in IndexedDB by source type (batched and error-safe)
      try {
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
        for (const [key, sourceEvents] of Array.from(eventsBySource.entries())) {
          const [source, calendarId] = key.split('_', 2);
          await calendarCache.cacheEvents(
            sourceEvents,
            currentStartDate,
            currentEndDate,
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
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar events';
        setError(new Error(errorMessage));
        retryCountRef.current += 1;
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsBackgroundRefreshing(false);
      }
      isLoadingRef.current = false;
    }
  }, [enabled, isInitializing, cacheKey, getCachedEvents]);

  // Wrapper function for compatibility
  const loadEvents = useCallback((isBackgroundRefresh = false, forceReload = false) => {
    return loadEventsStable(startDate, endDate, isBackgroundRefresh, forceReload);
  }, [loadEventsStable, startDate, endDate]);

  // DISABLED - Background refresh function to prevent loops
  const startBackgroundRefresh = useCallback(() => {
    // Completely disable background refresh for now
    return;
    
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current as NodeJS.Timeout);
    }

    backgroundRefreshRef.current = setInterval(async () => {
      if (!mountedRef.current) return;
      
      try {
        // Only do background refresh if we have cached data to avoid interrupting user
        const cached = await getCachedEvents();
        if (cached && cached.length > 0) {
          await loadEvents(true);
        }
      } catch (error) {
        console.warn('Background refresh error:', error);
      }
    }, BACKGROUND_REFRESH_INTERVAL);
  }, [loadEvents, getCachedEvents]);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current as NodeJS.Timeout);
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

  // Invalidate cache for a specific date range - stable version
  const invalidateCache = useCallback(async (start?: Date, end?: Date) => {
    const key = start && end ? getCacheKey(start, end) : cacheKey;
    eventCache.delete(key);
    
    // Clear IndexedDB cache for the range
    try {
      await calendarCache.clearExpiredCache();
    } catch (error) {
      console.error('Error clearing IndexedDB cache:', error);
    }
  }, [cacheKey]);

  // HEAVILY DEBOUNCED - Clear cache and reload when calendar sources change
  useEffect(() => {
    if (!isInitializing && calendarSourcesHash && calendarSourcesHash !== 'empty') {
      // Only react to real changes, not initialization
      if (lastCalendarSourcesHashRef.current && lastCalendarSourcesHashRef.current !== calendarSourcesHash) {
        console.log('Calendar sources actually changed:', {
          from: lastCalendarSourcesHashRef.current,
          to: calendarSourcesHash
        });
        
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
        }
        
        loadingTimeoutRef.current = setTimeout(() => {
          console.log('Executing calendar sources change reload');
          invalidateCache().then(() => {
            loadEventsStable(startDate, endDate, false, true); // Force reload
          });
        }, 8000); // 8 second debounce to prevent loops
      }
      
      // Update the ref after processing
      lastCalendarSourcesHashRef.current = calendarSourcesHash;
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
      }
    };
  }, [calendarSourcesHash, isInitializing]); // Only these dependencies

  // Load events on mount and when date range changes - minimal dependencies
  useEffect(() => {
    if (!isInitializing) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
      }
      
      loadingTimeoutRef.current = setTimeout(() => {
        loadEventsStable(startDate, endDate);
      }, 2000); // 2 second debounce to prevent rapid calls
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
      }
    };
  }, [startDate.getTime(), endDate.getTime(), isInitializing]); // Only date and init state

  // DISABLED - Start background refresh when component mounts
  useEffect(() => {
    // Disable background refresh completely
    return;
    
    if (enabled && !isInitializing) {
      startBackgroundRefresh();
    }

    return () => {
      stopBackgroundRefresh();
    };
  }, [enabled, startBackgroundRefresh, stopBackgroundRefresh, isInitializing]);

  // Manual refetch with force reload
  const refetch = useCallback(() => {
    retryCountRef.current = 0; // Reset retry count
    return loadEvents(false, true);
  }, [loadEvents]);

  return {
    events: localEvents,
    isLoading: isLoading || isInitializing,
    error,
    isBackgroundRefreshing,
    addEvent,
    updateEvent,
    removeEvent,
    invalidateCache,
    refetch,
  };
};