import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
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
    const habitsRef = collection(db, HABITS_COLLECTION);
    // Remove orderBy to avoid requiring a composite index
    const q = query(
      habitsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    // Sort the results in memory instead
    const habits = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Habit));
    
    // Sort by createdAt in descending order
    return habits.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error getting habits:', error);
    // Return empty array instead of throwing to prevent app from crashing
    return [];
  }
};

// Create a new habit
export const createHabit = async (userId: string, habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> => {
  try {
    const now = Date.now();
    const newHabit = {
      ...habitData,
      userId,
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await addDoc(collection(db, HABITS_COLLECTION), newHabit);
    return {
      id: docRef.id,
      ...newHabit
    } as Habit;
  } catch (error) {
    console.error('Error creating habit:', error);
    throw error;
  }
};

// Update an existing habit
export const updateHabit = async (habitId: string, habitData: Partial<Habit>): Promise<void> => {
  try {
    const habitRef = doc(db, HABITS_COLLECTION, habitId);
    await updateDoc(habitRef, {
      ...habitData,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
};

// Delete a habit
export const deleteHabit = async (habitId: string): Promise<void> => {
  try {
    // First delete the habit document
    const habitRef = doc(db, HABITS_COLLECTION, habitId);
    await deleteDoc(habitRef);
    
    // Then delete all completions for this habit
    try {
      const completionsRef = collection(db, COMPLETIONS_COLLECTION);
      const q = query(completionsRef, where('habitId', '==', habitId));
      const querySnapshot = await getDocs(q);
      
      // If there are completions to delete, delete them in batches
      if (!querySnapshot.empty) {
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
    } catch (completionsError) {
      // Log the error but don't throw, as the main habit is already deleted
      console.error('Error deleting habit completions:', completionsError);
    }
  } catch (error) {
    console.error('Error deleting habit:', error);
    // Re-throw the error so the UI can handle it
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
    const completionsRef = collection(db, COMPLETIONS_COLLECTION);
    // Simplify query to avoid potential index issues
    const q = query(
      completionsRef,
      where('habitId', '==', habitId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    // Filter for the specific date in memory
    const matchingDocs = querySnapshot.docs.filter(doc =>
      doc.data().date === date
    );
    const empty = matchingDocs.length === 0;
    
    if (empty) {
      // No completion record exists, create one (mark as completed)
      const newCompletion = {
        habitId,
        userId,
        date,
        completed: true,
        notes: notes || '',
        timestamp: Date.now()
      };
      
      const docRef = await addDoc(collection(db, COMPLETIONS_COLLECTION), newCompletion);
      return {
        id: docRef.id,
        ...newCompletion
      } as HabitCompletion;
    } else {
      // Completion record exists, toggle its state
      const completionDoc = matchingDocs[0];
      const currentCompletion = completionDoc.data() as HabitCompletion;
      
      await updateDoc(completionDoc.ref, {
        completed: !currentCompletion.completed,
        notes: notes || currentCompletion.notes || '',
        timestamp: Date.now()
      });
      
      return {
        ...currentCompletion,
        id: completionDoc.id,
        completed: !currentCompletion.completed,
        notes: notes || currentCompletion.notes || '',
        timestamp: Date.now()
      };
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
    
    const completionsRef = collection(db, COMPLETIONS_COLLECTION);
    // Simplify query to avoid requiring a composite index
    const q = query(
      completionsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Filter results in memory for the date range
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HabitCompletion))
      .filter(completion =>
        completion.date >= startDate &&
        completion.date <= endDate
      );
  } catch (error) {
    console.error('Error getting habit completions:', error);
    // Return empty array instead of throwing to prevent app from crashing
    return [];
  }
};

// Calculate habit statistics
export const calculateHabitStats = async (userId: string, habitId: string): Promise<HabitStats> => {
  try {
    const completionsRef = collection(db, COMPLETIONS_COLLECTION);
    // Simplify query to avoid requiring a composite index
    const q = query(
      completionsRef,
      where('userId', '==', userId),
      where('habitId', '==', habitId)
    );
    
    const querySnapshot = await getDocs(q);
    // Filter for completed=true in memory
    const completions = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as HabitCompletion))
      .filter(completion => completion.completed === true);
    
    // Get the habit to check frequency
    const habitRef = doc(db, HABITS_COLLECTION, habitId);
    const habitDoc = await getDoc(habitRef);
    
    if (!habitDoc.exists()) {
      // Return default stats instead of throwing
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        completionRate: 0
      };
    }
    
    const habit = { id: habitDoc.id, ...habitDoc.data() } as Habit;
    
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