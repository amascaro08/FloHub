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
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};

// Typed fetcher for calendar events
export const fetchCalendarEvents = async (url: string, cacheKey?: string): Promise<CalendarEvent[]> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not signed in');
  }
  const data = await res.json();
  // Fix: Handle both array and object responses
  return Array.isArray(data) ? data : (data.events || []);
};

// Typed fetcher for tasks
export const fetchTasks = async () => {
  const res = await fetch('/api/tasks', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};

// Typed fetcher for notes
export const fetchNotes = async () => {
  const res = await fetch('/api/notes', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};

// Typed fetcher for meetings
export const fetchMeetings = async () => {
  const res = await fetch('/api/meetings', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};

// Typed fetcher for habits
export const fetchHabits = async () => {
  const res = await fetch('/api/habits', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};

// Typed fetcher for habit completions
export const fetchHabitCompletions = async (year: number, month: number) => {
  const completionsUrl = `/api/habits/completions?year=${year}&month=${month}`;
  const res = await fetch(completionsUrl, { credentials: 'include' });
  if (!res.ok) {
    throw new Error('Not authorized');
  }
  return res.json();
};
