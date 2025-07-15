import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@stackframe/stack';
import { getUserHabits, getHabitCompletionsForMonth, toggleHabitCompletion, getTodayFormatted, shouldCompleteToday, calculateHabitStats } from '@/lib/habitService';
import { Habit, HabitCompletion, HabitStats } from '@/types/habit-tracker';
import { CheckIcon, XMarkIcon, ArrowRightIcon, FireIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/solid';

const HabitTrackerWidget = () => {
  const user = useUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overallStats, setOverallStats] = useState({
    totalHabits: 0,
    weeklyCompletionRate: 0,
    monthlyCompletionRate: 0,
    longestStreak: 0
  });

  // Load habits and today's completions
  useEffect(() => {
    const loadData = async () => {
      if (!user?.primaryEmail) return;
      
      setLoading(true);
      try {
        // Get user habits
        const userHabits = await getUserHabits(user.primaryEmail);
        setHabits(userHabits);
        
        // Get current month's completions
        const today = new Date();
        const monthCompletions = await getHabitCompletionsForMonth(
          user.primaryEmail,
          today.getFullYear(),
          today.getMonth()
        );
        setCompletions(monthCompletions);
        
        // Calculate overall stats
        if (userHabits.length > 0) {
          // Calculate longest streak across all habits
          let maxStreak = 0;
          
          for (const habit of userHabits) {
            try {
              const stats = await calculateHabitStats(user.primaryEmail, habit.id);
              if (stats.longestStreak > maxStreak) {
                maxStreak = stats.longestStreak;
              }
            } catch (error) {
              console.error(`Error calculating stats for habit ${habit.id}:`, error);
            }
          }
          
          // Calculate weekly completion rate
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const weeklyCompletions = monthCompletions.filter(c =>
            new Date(c.date) >= oneWeekAgo && c.completed
          );
          
          const weeklyTotal = userHabits.reduce((total, habit) => {
            // Count how many days in the past week this habit should have been completed
            let daysCount = 0;
            for (let i = 0; i < 7; i++) {
              const checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - i);
              if (shouldCompleteOnDate(habit, checkDate)) {
                daysCount++;
              }
            }
            return total + daysCount;
          }, 0);
          
          const weeklyRate = weeklyTotal > 0 ? (weeklyCompletions.length / weeklyTotal) * 100 : 0;
          
          // Calculate monthly completion rate
          const monthlyTotal = userHabits.reduce((total, habit) => {
            // Simplified: assume 30 days per month
            let daysCount = 0;
            for (let i = 0; i < 30; i++) {
              const checkDate = new Date();
              checkDate.setDate(checkDate.getDate() - i);
              if (shouldCompleteOnDate(habit, checkDate)) {
                daysCount++;
              }
            }
            return total + daysCount;
          }, 0);
          
          const monthlyRate = monthlyTotal > 0 ? (monthCompletions.filter(c => c.completed).length / monthlyTotal) * 100 : 0;
          
          setOverallStats({
            totalHabits: userHabits.length,
            weeklyCompletionRate: Math.round(weeklyRate),
            monthlyCompletionRate: Math.round(monthlyRate),
            longestStreak: maxStreak
          });
        }
      } catch (error) {
        console.error('Error loading habit data:', error);
        setError('Failed to load habits');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  // Handle habit completion toggle
  const handleToggleCompletion = async (habit: Habit) => {
    if (!user?.primaryEmail) return;
    
    try {
      const today = getTodayFormatted();
      const updatedCompletion = await toggleHabitCompletion(
        user.primaryEmail,
        habit.id,
        today
      );
      
      // Update local state
      setCompletions(prev => {
        const existingIndex = prev.findIndex(
          c => c.habitId === habit.id && c.date === today
        );
        
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedCompletion;
          return updated;
        } else {
          return [...prev, updatedCompletion];
        }
      });
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    }
  };

  // Check if a habit is completed today
  const isHabitCompletedToday = (habitId: string): boolean => {
    const today = getTodayFormatted();
    return completions.some(
      c => c.habitId === habitId && c.date === today && c.completed
    );
  };

  // Helper function to check if a habit should be completed on a specific date
  const shouldCompleteOnDate = (habit: Habit, date: Date): boolean => {
    const dayOfWeek = date.getDay(); // 0-6, Sunday-Saturday
    
    switch (habit.frequency) {
      case 'daily':
        return true;
      case 'weekly':
        return dayOfWeek === 0; // Sunday
      case 'custom':
        return habit.customDays?.includes(dayOfWeek) || false;
      default:
        return false;
    }
  };

  // Filter habits that should be completed today
  const todaysHabits = habits.filter(habit => shouldCompleteToday(habit));

  // Calculate completion progress
  const completedCount = todaysHabits.filter(habit => isHabitCompletedToday(habit.id)).length;
  const totalCount = todaysHabits.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 transition-colors">Habit Tracker</h2>
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 transition-colors">Habit Tracker</h2>
        <p className="text-red-600 dark:text-red-400 text-sm mb-3 transition-colors">{error}</p>
        <Link href="/habit-tracker" className="text-teal-600 dark:text-teal-500 hover:text-teal-500 dark:hover:text-teal-400 flex items-center transition-colors">
          <span>Open Full Tracker</span>
          <ArrowRightIcon className="w-4 h-4 ml-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-colors">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 transition-colors">Habit Tracker</h2>
      
      {habits.length === 0 ? (
        <div className="mb-3">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 transition-colors">You don't have any habits yet.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 transition-colors">
              <span>Today's Progress</span>
              <span>{completedCount}/{totalCount} completed</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 transition-colors">
              <div
                className="bg-teal-600 dark:bg-teal-600 h-2.5 rounded-full transition-colors"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Overall Stats */}
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Overall Stats</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors">
                <div className="flex items-center mb-1">
                  <ChartBarIcon className="w-3 h-3 text-blue-400 mr-1" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors">Total Habits</span>
                </div>
                <span className="text-lg font-bold text-gray-800 dark:text-white transition-colors">{overallStats.totalHabits}</span>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors">
                <div className="flex items-center mb-1">
                  <FireIcon className="w-3 h-3 text-orange-400 mr-1" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors">Longest Streak</span>
                </div>
                <span className="text-lg font-bold text-gray-800 dark:text-white transition-colors">{overallStats.longestStreak}</span>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors">
                <div className="flex items-center mb-1">
                  <TrophyIcon className="w-3 h-3 text-yellow-400 mr-1" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors">Weekly Rate</span>
                </div>
                <span className="text-lg font-bold text-gray-800 dark:text-white transition-colors">{overallStats.weeklyCompletionRate}%</span>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2 flex flex-col items-center transition-colors">
                <div className="flex items-center mb-1">
                  <CheckIcon className="w-3 h-3 text-green-400 mr-1" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 transition-colors">Monthly Rate</span>
                </div>
                <span className="text-lg font-bold text-gray-800 dark:text-white transition-colors">{overallStats.monthlyCompletionRate}%</span>
              </div>
            </div>
          </div>
          
          {/* Today's habits */}
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors">Today's Habits</h3>
            
            {todaysHabits.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-xs transition-colors">No habits scheduled for today</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {todaysHabits.map(habit => {
                  const isCompleted = isHabitCompletedToday(habit.id);
                  
                  return (
                    <div 
                      key={habit.id}
                      className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                        isCompleted ? 'bg-green-100 dark:bg-green-900 bg-opacity-100 dark:bg-opacity-30' : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                      onClick={() => handleToggleCompletion(habit)}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center transition-colors ${
                          isCompleted ? 'bg-green-500 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-800 dark:text-white truncate flex-grow transition-colors">{habit.name}</span>
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: habit.color || '#4fd1c5' }}
                      ></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
      
      <Link href="/habit-tracker" className="text-teal-600 dark:text-teal-500 hover:text-teal-500 dark:hover:text-teal-400 flex items-center text-sm transition-colors">
        <span>Open Full Tracker</span>
        <ArrowRightIcon className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
};

export default HabitTrackerWidget;