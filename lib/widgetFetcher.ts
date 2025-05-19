/**
 * Enhanced fetcher specifically for widgets
 * This is a simplified version of enhancedFetcher.ts without generics
 * to avoid TypeScript JSX parsing issues
 */

import { enhancedFetcher } from './enhancedFetcher';

// Typed fetcher for UserSettings
export const fetchUserSettings = async (url: string) => {
  return enhancedFetcher<any>(url, undefined, undefined, 60000); // 1 minute cache
};

// Typed fetcher for calendar events
export const fetchCalendarEvents = async (url: string, cacheKey?: string) => {
  return enhancedFetcher<any>(url, undefined, cacheKey);
};

// Typed fetcher for tasks
export const fetchTasks = async () => {
  return enhancedFetcher<any>('/api/tasks', undefined, 'flohub:tasks');
};

// Typed fetcher for notes
export const fetchNotes = async () => {
  return enhancedFetcher<any>('/api/notes', undefined, 'flohub:notes');
};

// Typed fetcher for meetings
export const fetchMeetings = async () => {
  return enhancedFetcher<any>('/api/meetings', undefined, 'flohub:meetings');
};

// Typed fetcher for habits
export const fetchHabits = async () => {
  return enhancedFetcher<any>('/api/habits', undefined, 'flohub:habits');
};

// Typed fetcher for habit completions
export const fetchHabitCompletions = async (year: number, month: number) => {
  const completionsUrl = `/api/habits/completions?year=${year}&month=${month}`;
  return enhancedFetcher<any>(
    completionsUrl, 
    undefined, 
    `flohub:habitCompletions:${year}-${month}`
  );
};