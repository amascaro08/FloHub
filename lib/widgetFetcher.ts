/**
 * Enhanced fetcher specifically for widgets
 * With proper type definitions for better type safety
 */

import { enhancedFetch } from './enhancedFetcher';
import { monitorAPICall, monitorCacheOperation } from './performanceMonitor';

import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { Action } from '@/types/app';

// Interface for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Cache implementation for better performance
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class WidgetCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const widgetCache = new WidgetCache();

// Helper function for timeout protection
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// Typed fetcher for UserSettings
export const fetchUserSettings = async (url: string): Promise<CalendarSettings> => {
  const cacheKey = `userSettings_${url}`;
  const cached = widgetCache.get<CalendarSettings>(cacheKey);
  if (cached) {
    monitorCacheOperation(cacheKey, true, 10 * 60 * 1000);
    return cached;
  }

  monitorCacheOperation(cacheKey, false, 10 * 60 * 1000);
  
  const data = await monitorAPICall(url, { credentials: 'include' }, () => 
    fetchWithTimeout(url, { credentials: 'include' })
  ) as CalendarSettings;
  
  widgetCache.set(cacheKey, data, 10 * 60 * 1000); // Cache for 10 minutes
  return data;
};

// Typed fetcher for calendar events with enhanced caching
export const fetchCalendarEvents = async (url: string, cacheKey?: string): Promise<CalendarEvent[]> => {
  const key = cacheKey || `calendar_${url}`;
  const cached = widgetCache.get<CalendarEvent[]>(key);
  if (cached) {
    monitorCacheOperation(key, true, 2 * 60 * 1000);
    return cached;
  }

  monitorCacheOperation(key, false, 2 * 60 * 1000);

  const data = await monitorAPICall(url, { 
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  }, () => fetchWithTimeout(url, { 
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  }, 8000)) as any; // Longer timeout for calendar API
  
  const events = Array.isArray(data) ? data : (data.events || []);
  
  // Cache calendar events for 2 minutes
  widgetCache.set(key, events, 2 * 60 * 1000);
  return events;
};

// Typed fetcher for tasks with caching
export const fetchTasks = async () => {
  const cacheKey = 'tasks';
  const cached = widgetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout('/api/tasks', { 
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  
  if (!res.ok) {
    console.error('Tasks fetch failed:', res.status, res.statusText);
    throw new Error('Not authorized');
  }
  
  const data = await res.json();
  widgetCache.set(cacheKey, data, 60 * 1000); // Cache for 1 minute
  return data;
};

// Typed fetcher for notes with caching
export const fetchNotes = async () => {
  const cacheKey = 'notes';
  const cached = widgetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout('/api/notes', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  
  const data = await res.json();
  widgetCache.set(cacheKey, data, 2 * 60 * 1000); // Cache for 2 minutes
  return data;
};

// Typed fetcher for meetings with caching
export const fetchMeetings = async () => {
  const cacheKey = 'meetings';
  const cached = widgetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout('/api/meetings', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  
  const data = await res.json();
  widgetCache.set(cacheKey, data, 2 * 60 * 1000); // Cache for 2 minutes
  return data;
};

// Typed fetcher for habits with caching
export const fetchHabits = async () => {
  const cacheKey = 'habits';
  const cached = widgetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetchWithTimeout('/api/habits', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  
  const data = await res.json();
  widgetCache.set(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes
  return data;
};

// Typed fetcher for habit completions with caching
export const fetchHabitCompletions = async (year: number, month: number) => {
  const cacheKey = `habitCompletions_${year}_${month}`;
  const cached = widgetCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const completionsUrl = `/api/habits/completions?year=${year}&month=${month}`;
  const res = await fetchWithTimeout(completionsUrl, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  
  const data = await res.json();
  widgetCache.set(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes
  return data;
};

// Export cache for external invalidation
export const invalidateCache = (pattern: string) => {
  widgetCache.invalidate(pattern);
};

export const clearCache = () => {
  widgetCache.clear();
};
