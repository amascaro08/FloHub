import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/ui/AuthContext';
import { getUserHabits, getHabitCompletionsForMonth, toggleHabitCompletion, getTodayFormatted, shouldCompleteToday } from '@/lib/habitService';
import { Habit, HabitCompletion } from '@/types/habit-tracker';
import { CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/solid';

const HabitTrackerWidget = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load habits and today's completions
  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) return;
      
      setLoading(true);
      try {
        // Get user habits
        const userHabits = await getUserHabits(user.email);
        setHabits(userHabits);
        
        // Get current month's completions
        const today = new Date();
        const monthCompletions = await getHabitCompletionsForMonth(
          user.email,
          today.getFullYear(),
          today.getMonth()
        );
        setCompletions(monthCompletions);
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
    if (!user?.email) return;
    
    try {
      const today = getTodayFormatted();
      const updatedCompletion = await toggleHabitCompletion(
        user.email,
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

  // Filter habits that should be completed today
  const todaysHabits = habits.filter(habit => shouldCompleteToday(habit));

  // Calculate completion progress
  const completedCount = todaysHabits.filter(habit => isHabitCompletedToday(habit.id)).length;
  const totalCount = todaysHabits.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Habit Tracker</h2>
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Habit Tracker</h2>
        <p className="text-red-400 text-sm mb-3">{error}</p>
        <Link href="/habit-tracker" className="text-teal-500 hover:text-teal-400 flex items-center">
          <span>Open Full Tracker</span>
          <ArrowRightIcon className="w-4 h-4 ml-1" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Habit Tracker</h2>
      
      {habits.length === 0 ? (
        <div className="mb-3">
          <p className="text-gray-400 text-sm mb-3">You don't have any habits yet.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Today's Progress</span>
              <span>{completedCount}/{totalCount} completed</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-teal-600 h-2.5 rounded-full" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Today's habits */}
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Today's Habits</h3>
            
            {todaysHabits.length === 0 ? (
              <p className="text-gray-400 text-xs">No habits scheduled for today</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {todaysHabits.map(habit => {
                  const isCompleted = isHabitCompletedToday(habit.id);
                  
                  return (
                    <div 
                      key={habit.id}
                      className={`flex items-center p-2 rounded-lg cursor-pointer ${
                        isCompleted ? 'bg-green-900 bg-opacity-30' : 'bg-gray-700'
                      }`}
                      onClick={() => handleToggleCompletion(habit)}
                    >
                      <div 
                        className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        {isCompleted && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-white truncate flex-grow">{habit.name}</span>
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
      
      <Link href="/habit-tracker" className="text-teal-500 hover:text-teal-400 flex items-center text-sm">
        <span>Open Full Tracker</span>
        <ArrowRightIcon className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
};

export default HabitTrackerWidget;