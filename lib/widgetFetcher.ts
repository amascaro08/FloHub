/**
 * Enhanced fetcher specifically for widgets
 * With proper type definitions for better type safety
 */

import { enhancedFetcher } from './enhancedFetcher';

import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { Action } from '@/types/app';

// Interface for API responses
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Typed fetcher for UserSettings
export const fetchUserSettings = async (url: string): Promise<CalendarSettings> => {
  return enhancedFetcher<CalendarSettings>(url, { credentials: 'include' }, undefined, 60000); // 1 minute cache
};

// Typed fetcher for calendar events
export const fetchCalendarEvents = async (url: string, cacheKey?: string): Promise<CalendarEvent[]> => {
  const response = await enhancedFetcher<{ events?: CalendarEvent[] }>(url, { credentials: 'include' }, cacheKey);
  return response.events || [];
};

// Typed fetcher for tasks
export const fetchTasks = async () => {
  return enhancedFetcher<{ tasks: any[] }>('/api/tasks', { credentials: 'include' }, 'flohub:tasks');
};

// Typed fetcher for notes
export const fetchNotes = async () => {
  return enhancedFetcher<{ notes: any[] }>('/api/notes', { credentials: 'include' }, 'flohub:notes');
};

// Typed fetcher for meetings
export const fetchMeetings = async () => {
  return enhancedFetcher<{ meetings: any[] }>('/api/meetings', { credentials: 'include' }, 'flohub:meetings');
};

// Typed fetcher for habits
export const fetchHabits = async () => {
  return enhancedFetcher<{ habits: any[] }>('/api/habits', { credentials: 'include' }, 'flohub:habits');
};

// Typed fetcher for habit completions
export const fetchHabitCompletions = async (year: number, month: number) => {
  const completionsUrl = `/api/habits/completions?year=${year}&month=${month}`;
  return enhancedFetcher<{ completions: any[] }>(
    completionsUrl,
    { credentials: 'include' },
    `flohub:habitCompletions:${year}-${month}`
  );
};