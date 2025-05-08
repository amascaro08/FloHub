export interface Habit {
  id: string;
  name: string;
  description?: string;
  category?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[]; // 0-6 for Sunday-Saturday
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // ISO date string YYYY-MM-DD
  completed: boolean;
  notes?: string;
  timestamp: number;
}

export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number; // percentage
}

export interface HabitCategory {
  id: string;
  name: string;
  color: string;
}