import { Habit, HabitCompletion, HabitStats } from '@/types/habit-tracker';

async function fetchFromAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${endpoint}`, options);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return res.json();
}

export const fetchHabits = (): Promise<Habit[]> => fetchFromAPI<Habit[]>("habits");
export const createHabit = (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> => fetchFromAPI<Habit>("habits", { method: "POST", body: JSON.stringify(habitData) });
export const updateHabit = (habitId: string, habitData: Partial<Habit>): Promise<void> => fetchFromAPI<void>(`habits/${habitId}`, { method: "PUT", body: JSON.stringify(habitData) });
export const deleteHabit = (habitId: string): Promise<void> => fetchFromAPI<void>(`habits/${habitId}`, { method: "DELETE" });
export const toggleHabitCompletion = (habitId: string, date: string, notes?: string): Promise<HabitCompletion> => fetchFromAPI<HabitCompletion>(`habits/completions`, { method: "POST", body: JSON.stringify({ habitId, date, notes }) });
export const fetchHabitCompletions = (year: number, month: number): Promise<HabitCompletion[]> => fetchFromAPI<HabitCompletion[]>(`habits/completions?year=${year}&month=${month}`);
export const calculateHabitStats = (habitId: string): Promise<HabitStats> => fetchFromAPI<HabitStats>(`habits/stats/${habitId}`);