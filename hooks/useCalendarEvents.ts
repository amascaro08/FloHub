import { useState, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { CalendarEvent } from '@/types/calendar';

interface UseCalendarEventsOptions {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

interface CachedEvent {
  id: string;
  events: CalendarEvent[];
  lastUpdated: number;
}

// Cache for calendar events
const eventCache = new Map<string, CachedEvent>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to generate cache key
const getCacheKey = (startDate: Date, endDate: Date) => {
  return `${startDate.toISOString()}_${endDate.toISOString()}`;
};

// Helper to check if cache is valid
const isCacheValid = (cachedEvent: CachedEvent) => {
  return Date.now() - cachedEvent.lastUpdated < CACHE_DURATION;
};

// Helper to fetch events from API
const fetchEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
  const response = await fetch(`/api/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }
  
  return response.json();
};

export const useCalendarEvents = ({ startDate, endDate, enabled = true }: UseCalendarEventsOptions) => {
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = getCacheKey(startDate, endDate);

  // Check cache first
  const getCachedEvents = useCallback(() => {
    const cached = eventCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.events;
    }
    return null;
  }, [cacheKey]);

  // Load events with caching
  const loadEvents = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = getCachedEvents();
      if (cached) {
        setLocalEvents(cached);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const events = await fetchEvents(startDate, endDate);
      
      // Cache the result
      eventCache.set(cacheKey, {
        id: cacheKey,
        events: events,
        lastUpdated: Date.now(),
      });

      setLocalEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load events'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, enabled, cacheKey, getCachedEvents]);

  // Add event to cache and local state
  const addEvent = useCallback((newEvent: CalendarEvent) => {
    setLocalEvents(prev => {
      const updated = [...prev, newEvent];
      
      // Update cache
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
  }, [cacheKey]);

  // Update event in cache and local state
  const updateEvent = useCallback((eventId: string, updatedEvent: CalendarEvent) => {
    setLocalEvents(prev => {
      const updated = prev.map(event => 
        event.id === eventId ? updatedEvent : event
      );
      
      // Update cache
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
  }, [cacheKey]);

  // Remove event from cache and local state
  const removeEvent = useCallback((eventId: string) => {
    setLocalEvents(prev => {
      const updated = prev.filter(event => event.id !== eventId);
      
      // Update cache
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
  }, [cacheKey]);

  // Invalidate cache for a specific date range
  const invalidateCache = useCallback((start?: Date, end?: Date) => {
    const key = getCacheKey(start || startDate, end || endDate);
    eventCache.delete(key);
  }, [startDate, endDate]);

  // Load events on mount and when dependencies change
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events: localEvents,
    isLoading,
    error,
    addEvent,
    updateEvent,
    removeEvent,
    invalidateCache,
    refetch: loadEvents,
  };
};