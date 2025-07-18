import { db } from './drizzle';
import { habits, habitCompletions } from '@/db/schema';
import { and, eq, desc, gte, lte } from 'drizzle-orm';
import { Habit, HabitCompletion, HabitStats } from '@/types/habit-tracker';

// Helper to format date as YYYY-MM-DD
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Get today's date formatted as YYYY-MM-DD
export const getTodayFormatted = (): string => {
  return formatDate(new Date());
};

// Get all habits for a user
export const getUserHabits = async (userId: string): Promise<Habit[]> => {
  try {
    const rows = await db
      .select()
      .from(habits)
      .where(eq(habits.userId, userId))
      .orderBy(desc(habits.createdAt));
      
    return rows.map(row => ({
      ...row,
      id: String(row.id),
      description: row.description || undefined,
      customDays: (row.customDays as number[]) || [],
      frequency: row.frequency as 'daily' | 'weekly' | 'custom',
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : 0,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : 0,
    }));
  } catch (error) {
    console.error('Error getting habits:', error);
    return [];
  }
};

// Create a new habit
export const createHabit = async (userId: string, habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> => {
  try {
    const now = new Date();
    const { name, description, frequency, customDays } = habitData;
    
    const [newHabit] = await db
      .insert(habits)
      .values({
        name,
        description,
        frequency,
        customDays,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    
    return {
      ...newHabit,
      id: String(newHabit.id),
      description: newHabit.description || undefined,
      customDays: (newHabit.customDays as number[]) || [],
      frequency: newHabit.frequency as 'daily' | 'weekly' | 'custom',
      createdAt: newHabit.createdAt ? new Date(newHabit.createdAt).getTime() : 0,
      updatedAt: newHabit.updatedAt ? new Date(newHabit.updatedAt).getTime() : 0,
    };
  } catch (error) {
    console.error('Error creating habit:', error);
    throw error;
  }
};

// Update an existing habit
export const updateHabit = async (habitId: string, habitData: Partial<Habit>): Promise<void> => {
  try {
    const { id, createdAt, updatedAt, ...dataToUpdate } = habitData;
    await db
      .update(habits)
      .set({ ...dataToUpdate, updatedAt: new Date() })
      .where(eq(habits.id, Number(habitId)));
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

// Delete a habit
export const deleteHabit = async (habitId: string): Promise<void> => {
  try {
    await db.delete(habits).where(eq(habits.id, Number(habitId)));
    await db.delete(habitCompletions).where(eq(habitCompletions.habitId, Number(habitId)));
  } catch (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
};

// Toggle habit completion for a specific date
export const toggleHabitCompletion = async (
  userId: string,
  habitId: string,
  date: string,
  notes?: string
): Promise<HabitCompletion> => {
  try {
    const existingCompletion = await db.query.habitCompletions.findFirst({
      where: and(
        eq(habitCompletions.habitId, Number(habitId)),
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.date, date)
      ),
    });

    if (!existingCompletion) {
      const [newCompletion] = await db
        .insert(habitCompletions)
        .values({
          habitId: Number(habitId),
          userId,
          date,
          completed: true,
          notes: notes || '',
          timestamp: new Date(),
        })
        .returning();
      return { ...newCompletion, id: String(newCompletion.id), habitId: String(newCompletion.habitId), completed: newCompletion.completed ?? false, notes: newCompletion.notes || undefined, timestamp: new Date(newCompletion.timestamp!).getTime() };
    } else {
      const [updatedCompletion] = await db
        .update(habitCompletions)
        .set({
          completed: !existingCompletion.completed,
          notes: notes || existingCompletion.notes || '',
          timestamp: new Date(),
        })
        .where(eq(habitCompletions.id, existingCompletion.id))
        .returning();
      return { ...updatedCompletion, id: String(updatedCompletion.id), habitId: String(updatedCompletion.habitId), completed: updatedCompletion.completed ?? false, notes: updatedCompletion.notes || undefined, timestamp: new Date(updatedCompletion.timestamp!).getTime() };
    }
  } catch (error) {
    console.error('Error toggling habit completion:', error);
    throw error;
  }
};

// Get habit completions for a specific month
export const getHabitCompletionsForMonth = async (
  userId: string,
  year: number,
  month: number // 0-11 (JavaScript months)
): Promise<HabitCompletion[]> => {
  try {
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));
    
    const rows = await db
      .select()
      .from(habitCompletions)
      .where(
        and(
          eq(habitCompletions.userId, userId),
          gte(habitCompletions.date, startDate),
          lte(habitCompletions.date, endDate)
        )
      );
    
    return rows.map(row => ({ ...row, id: String(row.id), habitId: String(row.habitId), completed: row.completed ?? false, notes: row.notes || undefined, timestamp: new Date(row.timestamp!).getTime() }));
  } catch (error) {
    console.error('Error getting habit completions:', error);
    return [];
  }
};

// Calculate habit statistics
export const calculateHabitStats = async (userId: string, habitId: string): Promise<HabitStats> => {
  try {
    const completions = await db.query.habitCompletions.findMany({
      where: and(
        eq(habitCompletions.userId, userId),
        eq(habitCompletions.habitId, Number(habitId)),
        eq(habitCompletions.completed, true)
      ),
    });
    
    const habit = await db.query.habits.findFirst({
      where: eq(habits.id, Number(habitId)),
    });
    
    if (!habit) {
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0
      };
    }
    
    const totalCompletions = completions.length;
    
    let currentStreak = 0;
    const today = formatDate(new Date());
    
    const sortedCompletions = [...completions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const completedToday = sortedCompletions.some(c => c.date === today);
    
    if (completedToday) {
      currentStreak = 1;
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      
      while (true) {
        const dateToCheck = formatDate(checkDate);
        const completed = sortedCompletions.some(c => c.date === dateToCheck);
        
        if (completed) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = formatDate(yesterday);
      
      if (sortedCompletions.some(c => c.date === yesterdayFormatted)) {
        currentStreak = 1;
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 2);
        
        while (true) {
          const dateToCheck = formatDate(checkDate);
          const completed = sortedCompletions.some(c => c.date === dateToCheck);
          
          if (completed) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    let longestStreak = 0;
    let currentLongestStreak = 0;
    let lastDate: Date | null = null;
    
    const chronologicalCompletions = [...completions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    for (const completion of chronologicalCompletions) {
      const completionDate = new Date(completion.date);
      
      if (!lastDate) {
        currentLongestStreak = 1;
        lastDate = completionDate;
      } else {
        const dayDifference = Math.floor(
          (completionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDifference === 1) {
          currentLongestStreak++;
        } else if (dayDifference > 1) {
          if (currentLongestStreak > longestStreak) {
            longestStreak = currentLongestStreak;
          }
          currentLongestStreak = 1;
        }
        
        lastDate = completionDate;
      }
    }
    
    if (currentLongestStreak > longestStreak) {
      longestStreak = currentLongestStreak;
    }
    
    const habitCreationDate = new Date(habit.createdAt!);
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - habitCreationDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    
    const completionRate = Math.round((totalCompletions / daysSinceCreation) * 100);
    
    return {
      habitId,
      currentStreak,
      longestStreak,
      totalCompletions,
      completionRate
    };
  } catch (error) {
    console.error('Error calculating habit stats:', error);
    throw error;
  }
};

// Check if a habit should be completed today based on its frequency
export const shouldCompleteToday = (habit: Habit): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0-6, Sunday-Saturday
  
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      // For weekly habits, we'll use Sunday as the default day
      return dayOfWeek === 0;
    case 'custom':
      // For custom frequency, check if today is one of the selected days
      return habit.customDays?.includes(dayOfWeek) || false;
    default:
      return false;
  }
};