import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { CalendarEvent } from '@/types/calendar';
import { calendarCache } from '@/lib/calendarCache';
import { useUser } from '@/lib/hooks/useUser';

interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  calendarSourcesHash?: string; // Hash of calendar sources to detect changes
}

// Enhanced cache for calendar events with IndexedDB integration - USER SCOPED
const eventCache = new Map<string, CachedEvent>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (increased for better performance)

// Background refresh interval - DISABLED to prevent loops
const BACKGROUND_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour (much longer)

interface CachedEvent {
  id: string;
  events: CalendarEvent[];
  lastUpdated: number;
  userEmail: string; // ADD USER SCOPING
}

// Helper to generate cache key - USER SCOPED
const getCacheKey = (startDate: Date, endDate: Date, userEmail: string) => {
  return `${userEmail}_${startDate.toISOString()}_${endDate.toISOString()}`;
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
  const { user } = useUser(); // GET CURRENT USER
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

  // USER EMAIL REQUIRED FOR CACHE OPERATIONS
  const userEmail = user?.primaryEmail || user?.email;
  const cacheKey = userEmail ? getCacheKey(startDate, endDate, userEmail) : null;

  // Don't proceed without user email to prevent data leakage
  const canProceed = enabled && userEmail && !isInitializing;

  // Initialize IndexedDB cache with user email
  useEffect(() => {
    const initCache = async () => {
      try {
        if (userEmail) {
          await calendarCache.init(userEmail);
          console.log(`Calendar cache initialized for user: ${userEmail}`);
        }
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize calendar cache:', error);
        setIsInitializing(false);
      }
    };

    if (enabled && userEmail) {
      initCache();
    } else if (enabled && !userEmail) {
      // Wait for user to be loaded
      setIsInitializing(true);
    }

    return () => {
      mountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
      }
    };
  }, [enabled, userEmail]);

  // Check cache first (both in-memory and IndexedDB) - USER SCOPED
  const getCachedEvents = useCallback(async () => {
    if (!userEmail || !cacheKey) return null;
    
    try {
      // Check in-memory cache first
      const cached = eventCache.get(cacheKey);
      if (cached && cached.userEmail === userEmail && isCacheValid(cached)) {
        return cached.events;
      }

      // Check IndexedDB cache
      const cachedEvents = await calendarCache.getCachedEvents(startDate, endDate, userEmail);
      if (cachedEvents.length > 0) {
        // Update in-memory cache
        eventCache.set(cacheKey, {
          id: cacheKey,
          events: cachedEvents,
          lastUpdated: Date.now(),
          userEmail,
        });
        return cachedEvents;
      }
    } catch (error) {
      console.warn('Error reading from cache:', error);
    }

    return null;
  }, [cacheKey, startDate, endDate, userEmail]);

  // Load events with enhanced error handling and retries - stable version to prevent loops
  const loadEventsStable = useCallback(async (currentStartDate: Date, currentEndDate: Date, isBackgroundRefresh = false, forceReload = false) => {
    if (!canProceed || !userEmail || !cacheKey || (isLoadingRef.current && !forceReload)) return;

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
      
      // Cache the result in both in-memory and IndexedDB - USER SCOPED
      eventCache.set(cacheKey, {
        id: cacheKey,
        events: deduplicatedEvents,
        lastUpdated: Date.now(),
        userEmail,
      });

      // Cache in IndexedDB by source type (batched and error-safe) - USER SCOPED
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

        // Cache each source separately in IndexedDB (batched) - USER SCOPED
        for (const [key, sourceEvents] of Array.from(eventsBySource.entries())) {
          const [source, calendarId] = key.split('_', 2);
          await calendarCache.cacheEvents(
            sourceEvents,
            currentStartDate,
            currentEndDate,
            source as 'google' | 'o365' | 'ical',
            userEmail, // PASS USER EMAIL
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
  }, [canProceed, userEmail, cacheKey, getCachedEvents]);

  // Wrapper function for compatibility
  const loadEvents = useCallback((isBackgroundRefresh = false, forceReload = false) => {
    return loadEventsStable(startDate, endDate, isBackgroundRefresh, forceReload);
  }, [loadEventsStable, startDate, endDate]);

  // DISABLED - Background refresh function to prevent loops
  const startBackgroundRefresh = useCallback(() => {
    // Completely disable background refresh for now
    return;
  }, []);

  // Stop background refresh
  const stopBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearInterval(backgroundRefreshRef.current as NodeJS.Timeout);
      backgroundRefreshRef.current = null;
    }
  }, []);

  // Add event to cache and local state - USER SCOPED
  const addEvent = useCallback(async (newEvent: CalendarEvent) => {
    if (!mountedRef.current || !userEmail || !cacheKey) return;
    
    setLocalEvents(prev => {
      const updated = [...prev, newEvent];
      
      // Update in-memory cache - USER SCOPED
      const cached = eventCache.get(cacheKey);
      if (cached && cached.userEmail === userEmail) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
          userEmail,
        });
      }
      
      return updated;
    });

    // Update IndexedDB cache - USER SCOPED
    try {
      const source = newEvent.calendarId?.startsWith('o365_') ? 'o365' : 
                   newEvent.calendarId?.startsWith('ical_') ? 'ical' : 'google';
      const calendarId = newEvent.calendarId || 'default';
      
      await calendarCache.cacheEvents(
        [newEvent],
        startDate,
        endDate,
        source as 'google' | 'o365' | 'ical',
        userEmail, // PASS USER EMAIL
        calendarId
      );
    } catch (error) {
      console.error('Error caching new event:', error);
    }
  }, [cacheKey, startDate, endDate, userEmail]);

  // Update event in cache and local state - USER SCOPED
  const updateEvent = useCallback(async (eventId: string, updatedEvent: CalendarEvent) => {
    if (!mountedRef.current || !userEmail || !cacheKey) return;
    
    setLocalEvents(prev => {
      const updated = prev.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      // Update in-memory cache - USER SCOPED
      const cached = eventCache.get(cacheKey);
      if (cached && cached.userEmail === userEmail) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
          userEmail,
        });
      }
      
      return updated;
    });

    // Update IndexedDB cache - USER SCOPED
    try {
      const source = updatedEvent.calendarId?.startsWith('o365_') ? 'o365' : 
                   updatedEvent.calendarId?.startsWith('ical_') ? 'ical' : 'google';
      const calendarId = updatedEvent.calendarId || 'default';
      
      await calendarCache.cacheEvents(
        [updatedEvent],
        startDate,
        endDate,
        source as 'google' | 'o365' | 'ical',
        userEmail, // PASS USER EMAIL
        calendarId
      );
    } catch (error) {
      console.error('Error caching updated event:', error);
    }
  }, [cacheKey, startDate, endDate, userEmail]);

  // Remove event from cache and local state - USER SCOPED
  const removeEvent = useCallback(async (eventId: string) => {
    if (!mountedRef.current || !userEmail || !cacheKey) return;
    
    setLocalEvents(prev => {
      const updated = prev.filter(event => event.id !== eventId);
      
      // Update in-memory cache - USER SCOPED
      const cached = eventCache.get(cacheKey);
      if (cached && cached.userEmail === userEmail) {
        eventCache.set(cacheKey, {
          ...cached,
          events: updated,
          lastUpdated: Date.now(),
          userEmail,
        });
      }
      
      return updated;
    });

    // Note: IndexedDB cache will be updated on next background refresh
  }, [cacheKey, userEmail]);

  // Invalidate cache for a specific date range - stable version - USER SCOPED
  const invalidateCache = useCallback(async (start?: Date, end?: Date) => {
    if (!userEmail) return;
    
    const key = start && end ? getCacheKey(start, end, userEmail) : cacheKey;
    if (key) {
      eventCache.delete(key);
    }
    
    // Clear IndexedDB cache for the range - USER SCOPED
    try {
      await calendarCache.clearExpiredCache(userEmail);
    } catch (error) {
      console.error('Error clearing IndexedDB cache:', error);
    }
  }, [cacheKey, userEmail]);

  // HEAVILY DEBOUNCED - Clear cache and reload when calendar sources change
  useEffect(() => {
    if (!isInitializing && canProceed && calendarSourcesHash && calendarSourcesHash !== 'empty') {
      // Only react to real changes, not initialization
      if (lastCalendarSourcesHashRef.current && lastCalendarSourcesHashRef.current !== calendarSourcesHash) {
        console.log('Calendar sources actually changed:', {
          from: lastCalendarSourcesHashRef.current,
          to: calendarSourcesHash,
          user: userEmail
        });
        
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current as NodeJS.Timeout);
        }
        
        loadingTimeoutRef.current = setTimeout(() => {
          console.log('Executing calendar sources change reload for user:', userEmail);
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
  }, [calendarSourcesHash, isInitializing, canProceed, userEmail]); // Add userEmail dependency

  // Load events on mount and when date range changes - minimal dependencies
  useEffect(() => {
    if (canProceed) {
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
  }, [startDate.getTime(), endDate.getTime(), canProceed]); // Use canProceed instead of isInitializing

  // Manual refetch with force reload
  const refetch = useCallback(() => {
    if (!canProceed) return Promise.resolve();
    retryCountRef.current = 0; // Reset retry count
    return loadEvents(false, true);
  }, [loadEvents, canProceed]);

  return {
    events: localEvents,
    isLoading: isLoading || isInitializing || !userEmail,
    error,
    isBackgroundRefreshing,
    addEvent,
    updateEvent,
    removeEvent,
    invalidateCache,
    refetch,
  };
};