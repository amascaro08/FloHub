/**
 * Enhanced fetcher specifically for widgets
 * With proper type definitions for better type safety
 */

import { enhancedFetcher } from './enhancedFetcher';
import { performanceOptimizer } from './performanceOptimizer';

import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { Action } from '@/types/app';

// Interface for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Typed fetcher for UserSettings with performance optimization
export const fetchUserSettings = async (url: string): Promise<CalendarSettings> => {
  return performanceOptimizer.getCached(
    `userSettings_${url}`,
    async () => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Not authorized');
      }
      return res.json();
    },
    300000 // 5 minutes cache
  );
};

// Typed fetcher for calendar events with performance optimization
export const fetchCalendarEvents = async (url: string, cacheKey?: string): Promise<CalendarEvent[]> => {
  const cacheKeyFinal = cacheKey || `calendar_${url}`;
  
  return performanceOptimizer.getCached(
    cacheKeyFinal,
    async () => {
      const res = await fetch(url, { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        console.error('Calendar fetch failed:', res.status, res.statusText);
        throw new Error('Not signed in');
      }
      const data = await res.json();
      // Fix: Handle both array and object responses
      return Array.isArray(data) ? data : (data.events || []);
    },
    120000 // 2 minutes cache for calendar events
  );
};

// Typed fetcher for tasks with performance optimization
export const fetchTasks = async () => {
  return performanceOptimizer.getCached(
    'tasks_data',
    async () => {
      const res = await fetch('/api/tasks', { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!res.ok) {
        console.error('Tasks fetch failed:', res.status, res.statusText);
        throw new Error('Not authorized');
      }
      return res.json();
    },
    60000 // 1 minute cache for tasks
  );
};

// Typed fetcher for notes with performance optimization
export const fetchNotes = async () => {
  return performanceOptimizer.getCached(
    'notes_data',
    async () => {
      const res = await fetch('/api/notes', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Not authorized');
      }
      return res.json();
    },
    300000 // 5 minutes cache for notes
  );
};

// Typed fetcher for meetings with performance optimization
export const fetchMeetings = async () => {
  return performanceOptimizer.getCached(
    'meetings_data',
    async () => {
      const res = await fetch('/api/meetings', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Not authorized');
      }
      return res.json();
    },
    300000 // 5 minutes cache for meetings
  );
};

// Typed fetcher for habits with performance optimization
export const fetchHabits = async () => {
  return performanceOptimizer.getCached(
    'habits_data',
    async () => {
      const res = await fetch('/api/habits', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Not authorized');
      }
      return res.json();
    },
    300000 // 5 minutes cache for habits
  );
};

// Typed fetcher for habit completions with performance optimization
export const fetchHabitCompletions = async (year: number, month: number) => {
  const cacheKey = `habit_completions_${year}_${month}`;
  
  return performanceOptimizer.getCached(
    cacheKey,
    async () => {
      const completionsUrl = `/api/habits/completions?year=${year}&month=${month}`;
      const res = await fetch(completionsUrl, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Not authorized');
      }
      return res.json();
    },
    300000 // 5 minutes cache for habit completions
  );
};

// Batch fetch all widget data for better performance
export const fetchAllWidgetData = async (userId: string) => {
  const now = new Date();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneWeekFromNow = new Date(startOfToday);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
  oneWeekFromNow.setHours(23, 59, 59, 999);

  const timeMin = startOfToday.toISOString();
  const timeMax = oneWeekFromNow.toISOString();
  const apiUrlParams = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true&userTimezone=${encodeURIComponent(userTimezone)}`;

  const requests = [
    {
      key: `calendar_events_${userId}`,
      fetcher: () => fetchCalendarEvents(`/api/calendar?${apiUrlParams}`),
      ttl: 120000
    },
    {
      key: `tasks_${userId}`,
      fetcher: () => fetchTasks(),
      ttl: 60000
    },
    {
      key: `notes_${userId}`,
      fetcher: () => fetchNotes(),
      ttl: 300000
    },
    {
      key: `meetings_${userId}`,
      fetcher: () => fetchMeetings(),
      ttl: 300000
    },
    {
      key: `habits_${userId}`,
      fetcher: () => fetchHabits(),
      ttl: 300000
    },
    {
      key: `habit_completions_${userId}`,
      fetcher: () => fetchHabitCompletions(now.getFullYear(), now.getMonth()),
      ttl: 300000
    }
  ];

  try {
    const [calendarEvents, tasks, notes, meetings, habits, habitCompletions] = 
      await performanceOptimizer.batchRequests(requests);

    return {
      calendarEvents,
      tasks,
      notes,
      meetings,
      habits,
      habitCompletions
    };
  } catch (error) {
    console.error('Error fetching widget data:', error);
    throw error;
  }
};

// Prefetch widget data for better perceived performance
export const prefetchWidgetData = async (userId: string) => {
  try {
    await fetchAllWidgetData(userId);
  } catch (error) {
    // Silently fail for prefetch requests
    console.warn('Prefetch failed:', error);
  }
};

// Get performance metrics
export const getPerformanceMetrics = () => {
  return performanceOptimizer.getMetrics();
};
