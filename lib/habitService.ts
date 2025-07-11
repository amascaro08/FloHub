import { query } from './neon';
import { Habit, HabitCompletion, HabitStats } from '@/types/habit-tracker';

// Collection names
const HABITS_COLLECTION = 'habits';
const COMPLETIONS_COLLECTION = 'habitCompletions';

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
    const { rows } = await query('SELECT id, name, description, frequency, "customDays", "userId", "createdAt", "updatedAt" FROM habits WHERE "userId" = $1 ORDER BY "createdAt" DESC', [userId]);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      frequency: row.frequency,
      customDays: row.customDays,
      userId: row.userId,
      createdAt: Number(row.createdAt), // Assuming createdAt is stored as BIGINT (Unix milliseconds)
      updatedAt: Number(row.updatedAt)  // Assuming updatedAt is stored as BIGINT (Unix milliseconds)
    })) as Habit[];
  } catch (error) {
    console.error('Error getting habits:', error);
    return [];
  }
};

// Create a new habit
export const createHabit = async (userId: string, habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> => {
  try {
    const now = Date.now();
    const { name, description, frequency, customDays } = habitData;
    
    const { rows } = await query(
      `INSERT INTO habits (name, description, frequency, "customDays", "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, frequency, "customDays", "userId", "createdAt", "updatedAt"`,
      [name, description, frequency, customDays, userId, now, now]
    );
    
    const newHabit = rows[0];
    return {
      id: newHabit.id,
      name: newHabit.name,
      description: newHabit.description,
      frequency: newHabit.frequency,
      customDays: newHabit.customDays,
      userId: newHabit.userId,
      createdAt: Number(newHabit.createdAt),
      updatedAt: Number(newHabit.updatedAt)
    } as Habit;
  } catch (error) {
    console.error('Error creating habit:', error);
    throw error;
  }
};

// Update an existing habit
export const updateHabit = async (habitId: string, habitData: Partial<Habit>): Promise<void> => {
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const key in habitData) {
      if (Object.prototype.hasOwnProperty.call(habitData, key)) {
        // Exclude 'id', 'createdAt', 'updatedAt' from direct updates
        if (key === 'id' || key === 'createdAt' || key === 'updatedAt') {
          continue;
        }
        updates.push(`"${key}" = $${paramIndex++}`);
        params.push((habitData as any)[key]);
      }
    }

    updates.push(`"updatedAt" = $${paramIndex++}`);
    params.push(Date.now());

    params.push(habitId); // Add habitId as the last parameter for the WHERE clause

    if (updates.length === 0) {
      console.warn('No valid fields to update for habit:', habitId);
      return;
    }

    const queryString = `UPDATE habits SET ${updates.join(', ')} WHERE id = $${paramIndex}`;
    await query(queryString, params);
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

// Delete a habit
export const deleteHabit = async (habitId: string): Promise<void> => {
  try {
    // First delete the habit
    await query('DELETE FROM habits WHERE id = $1', [habitId]);
    
    // Then delete all completions for this habit
    try {
      await query('DELETE FROM "habitCompletions" WHERE "habitId" = $1', [habitId]);
    } catch (completionsError) {
      console.error('Error deleting habit completions:', completionsError);
    }
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
    // Check if there's already a completion record for this habit and date
    const { rows: existingCompletions } = await query(
      `SELECT id, "habitId", "userId", date, completed, notes, timestamp FROM "habitCompletions" WHERE "habitId" = $1 AND "userId" = $2 AND date = $3`,
      [habitId, userId, date]
    );

    if (existingCompletions.length === 0) {
      // No completion record exists, create one (mark as completed)
      const newCompletion = {
        habitId,
        userId,
        date,
        completed: true,
        notes: notes || '',
        timestamp: Date.now()
      };
      
      const { rows } = await query(
        `INSERT INTO "habitCompletions" ("habitId", "userId", date, completed, notes, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, "habitId", "userId", date, completed, notes, timestamp`,
        [newCompletion.habitId, newCompletion.userId, newCompletion.date, newCompletion.completed, newCompletion.notes, newCompletion.timestamp]
      );
      
      const createdCompletion = rows[0];
      return {
        id: createdCompletion.id,
        habitId: createdCompletion.habitId,
        userId: createdCompletion.userId,
        date: createdCompletion.date,
        completed: createdCompletion.completed,
        notes: createdCompletion.notes,
        timestamp: Number(createdCompletion.timestamp)
      } as HabitCompletion;
    } else {
      // Completion record exists, toggle its state
      const currentCompletion = existingCompletions[0];
      const newCompletedStatus = !currentCompletion.completed;
      const updatedNotes = notes || currentCompletion.notes || '';
      const newTimestamp = Date.now();

      const { rows } = await query(
        `UPDATE "habitCompletions" SET completed = $1, notes = $2, timestamp = $3 WHERE id = $4
         RETURNING id, "habitId", "userId", date, completed, notes, timestamp`,
        [newCompletedStatus, updatedNotes, newTimestamp, currentCompletion.id]
      );

      const updatedCompletion = rows[0];
      return {
        id: updatedCompletion.id,
        habitId: updatedCompletion.habitId,
        userId: updatedCompletion.userId,
        date: updatedCompletion.date,
        completed: updatedCompletion.completed,
        notes: updatedCompletion.notes,
        timestamp: Number(updatedCompletion.timestamp)
      } as HabitCompletion;
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
    // Create date range for the month
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0)); // Last day of month
    
    const { rows } = await query(
      `SELECT id, "habitId", "userId", date, completed, notes, timestamp FROM "habitCompletions" WHERE "userId" = $1 AND date >= $2 AND date <= $3`,
      [userId, startDate, endDate]
    );
    
    return rows.map(row => ({
      id: row.id,
      habitId: row.habitId,
      userId: row.userId,
      date: row.date,
      completed: row.completed,
      notes: row.notes,
      timestamp: Number(row.timestamp)
    })) as HabitCompletion[];
  } catch (error) {
    console.error('Error getting habit completions:', error);
    return [];
  }
};

// Calculate habit statistics
export const calculateHabitStats = async (userId: string, habitId: string): Promise<HabitStats> => {
  try {
    // Get completed completions for the habit
    const { rows: completionsRows } = await query(
      `SELECT id, "habitId", "userId", date, completed, notes, timestamp FROM "habitCompletions" WHERE "userId" = $1 AND "habitId" = $2 AND completed = TRUE`,
      [userId, habitId]
    );
    
    const completions = completionsRows.map(row => ({
      id: row.id,
      habitId: row.habitId,
      userId: row.userId,
      date: row.date,
      completed: row.completed,
      notes: row.notes,
      timestamp: Number(row.timestamp)
    })) as HabitCompletion[];
    
    // Get the habit to check frequency
    const { rows: habitRows } = await query(
      `SELECT id, name, description, frequency, "customDays", "userId", "createdAt", "updatedAt" FROM habits WHERE id = $1`,
      [habitId]
    );
    
    if (habitRows.length === 0) {
      // Return default stats if habit not found
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0
      };
    }
    
    const habit = {
      id: habitRows[0].id,
      name: habitRows[0].name,
      description: habitRows[0].description,
      frequency: habitRows[0].frequency,
      customDays: habitRows[0].customDays,
      userId: habitRows[0].userId,
      createdAt: Number(habitRows[0].createdAt),
      updatedAt: Number(habitRows[0].updatedAt)
    } as Habit;
    
    // Calculate total completions
    const totalCompletions = completions.length;
    
    // Calculate current streak
    let currentStreak = 0;
    const today = formatDate(new Date());
    
    // Sort completions by date in descending order (most recent first)
    const sortedCompletions = [...completions].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Check if the habit was completed today
    const completedToday = sortedCompletions.some(c => c.date === today);
    
    if (completedToday) {
      currentStreak = 1;
      
      // Check previous days
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
      // Check if completed yesterday to maintain streak
      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = formatDate(yesterday);
      
      if (sortedCompletions.some(c => c.date === yesterdayFormatted)) {
        currentStreak = 1;
        
        // Check previous days
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
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentLongestStreak = 0;
    let lastDate: Date | null = null;
    
    // Sort completions by date in ascending order
    const chronologicalCompletions = [...completions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    for (const completion of chronologicalCompletions) {
      const completionDate = new Date(completion.date);
      
      if (!lastDate) {
        // First completion
        currentLongestStreak = 1;
        lastDate = completionDate;
      } else {
        // Check if this completion is consecutive to the last one
        const dayDifference = Math.floor(
          (completionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (dayDifference === 1) {
          // Consecutive day
          currentLongestStreak++;
        } else if (dayDifference > 1) {
          // Streak broken
          if (currentLongestStreak > longestStreak) {
            longestStreak = currentLongestStreak;
          }
          currentLongestStreak = 1;
        }
        
        lastDate = completionDate;
      }
    }
    
    // Check if the current streak is the longest
    if (currentLongestStreak > longestStreak) {
      longestStreak = currentLongestStreak;
    }
    
    // Calculate completion rate
    // For simplicity, we'll calculate based on days since habit creation
    const habitCreationDate = new Date(habit.createdAt);
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - habitCreationDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1; // +1 to include today
    
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