// Core React imports
import React, { useState, useEffect } from 'react';

// UI components and context
import { useUser } from '@/lib/hooks/useUser';
import { PlusIcon, CheckIcon, XMarkIcon, ChartBarIcon } from '@heroicons/react/24/solid';

// Habit tracker components
import HabitForm from '@/components/habit-tracker/HabitForm';
import HabitStats from '@/components/habit-tracker/HabitStats';

// Habit service functions
import {
  getUserHabits,
  getHabitCompletionsForMonth,
  toggleHabitCompletion,
  formatDate,
  getTodayFormatted,
  shouldCompleteToday
} from '@/lib/habitService';

// Types
import { Habit, HabitCompletion } from '@/types/habit-tracker';

const HabitCalendar = () => {
  const { user, isLoading } = useUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  // Separate state for viewing stats
  const [viewStatsForHabit, setViewStatsForHabit] = useState<Habit | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Get current month and year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  // Calculate days in month and first day of month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0-6 (Sunday-Saturday)

  // Create array of days for the month view
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Create array of blank spaces for days before the first day of the month
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Get days of the week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Load habits and completions
  useEffect(() => {
    const loadData = async () => {
      if (!user?.primaryEmail) return;
      
      setLoading(true);
      try {
        const userHabits = await getUserHabits(user.primaryEmail);
        setHabits(userHabits);
        
        const monthCompletions = await getHabitCompletionsForMonth(
          user.primaryEmail,
          year,
          month
        );
        setCompletions(monthCompletions);
      } catch (error) {
        console.error('Error loading habit data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user, year, month]);

  // Handle month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Toggle between month and week view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'month' ? 'week' : 'month');
  };

  // Handle habit completion toggle
  const handleToggleCompletion = async (habit: Habit, date: Date) => {
    if (!user?.primaryEmail) return;
    
    try {
      const dateStr = formatDate(date);
      const updatedCompletion = await toggleHabitCompletion(
        user.primaryEmail,
        habit.id,
        dateStr
      );
      
      // Update local state
      setCompletions(prev => {
        const existingIndex = prev.findIndex(
          c => c.habitId === habit.id && c.date === dateStr
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

  // Check if a habit is completed on a specific date
  const isHabitCompleted = (habitId: string, date: Date): boolean => {
    const dateStr = formatDate(date);
    return completions.some(
      c => c.habitId === habitId && c.date === dateStr && c.completed
    );
  };

  // Handle adding a new habit
  const handleAddHabit = (newHabit: Habit) => {
    setHabits(prev => [newHabit, ...prev]);
    setShowAddHabit(false);
  };

  // Handle updating a habit
  const handleUpdateHabit = (updatedHabit: Habit) => {
    setHabits(prev => 
      prev.map(h => h.id === updatedHabit.id ? updatedHabit : h)
    );
    setSelectedHabit(null);
  };

  // Handle deleting a habit
  const handleDeleteHabit = (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setSelectedHabit(null);
  };

  // Render day cell with habit completions
  const renderDayCell = (day: number) => {
    const date = new Date(year, month, day);
    const dateStr = formatDate(date);
    const isToday = dateStr === formatDate(today);
    const isPast = date < new Date(today.setHours(0, 0, 0, 0));
    
    return (
      <div 
        key={day} 
        className={`p-2 rounded-lg ${
          isToday 
            ? 'bg-teal-700 text-white' 
            : 'bg-gray-800 text-white'
        } flex flex-col h-full min-h-[100px]`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-300'}`}>
            {day}
          </span>
          <span className="text-xs text-gray-400">
            {daysOfWeek[(firstDayOfMonth + day - 1) % 7]}
          </span>
        </div>
        
        <div className="flex-grow">
          {habits.map(habit => {
            const completed = isHabitCompleted(habit.id, date);
            const shouldComplete = shouldCompleteToday(habit);
            
            // Only show habits that should be completed on this day
            if (habit.frequency === 'custom' && !habit.customDays?.includes((firstDayOfMonth + day - 1) % 7)) {
              return null;
            }
            
            if (habit.frequency === 'weekly' && (firstDayOfMonth + day - 1) % 7 !== 0) {
              return null;
            }
            
            return (
              <div 
                key={habit.id}
                className={`flex items-center p-1 mb-1 rounded cursor-pointer ${
                  completed 
                    ? 'bg-green-800 bg-opacity-30' 
                    : isPast && shouldComplete 
                      ? 'bg-red-800 bg-opacity-30' 
                      : 'bg-gray-700 bg-opacity-30'
                }`}
                onClick={() => handleToggleCompletion(habit, date)}
              >
                <div 
                  className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                    completed 
                      ? 'bg-green-500' 
                      : isPast && shouldComplete 
                        ? 'bg-red-500' 
                        : 'bg-gray-600'
                  }`}
                >
                  {completed && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <span className="text-xs truncate">{habit.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    // Get current week's start and end dates
    const currentDay = currentDate.getDay(); // 0-6 (Sunday-Saturday)
    const startDate = new Date(currentDate);
    startDate.setDate(currentDate.getDate() - currentDay);
    
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
    
    return (
      <div className="grid grid-cols-7 gap-2">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-gray-400 text-sm py-2">
            {day}
          </div>
        ))}
        
        {weekDays.map((date, index) => {
          const day = date.getDate();
          const month = date.getMonth();
          const year = date.getFullYear();
          const isCurrentMonth = month === currentDate.getMonth();
          const isToday = formatDate(date) === formatDate(today);
          
          return (
            <div 
              key={index}
              className={`p-2 rounded-lg ${
                isToday 
                  ? 'bg-teal-700 text-white' 
                  : 'bg-gray-800 text-white'
              } ${
                !isCurrentMonth ? 'opacity-50' : ''
              } flex flex-col h-full min-h-[100px]`}
            >
              <div className="text-center mb-2">
                <span className={`text-sm font-semibold ${isToday ? 'text-white' : 'text-gray-300'}`}>
                  {day}
                </span>
              </div>
              
              <div className="flex-grow">
                {habits.map(habit => {
                  const completed = isHabitCompleted(habit.id, date);
                  const isPast = date < new Date(today.setHours(0, 0, 0, 0));
                  const dayOfWeek = date.getDay();
                  
                  // Only show habits that should be completed on this day
                  if (habit.frequency === 'custom' && !habit.customDays?.includes(dayOfWeek)) {
                    return null;
                  }
                  
                  if (habit.frequency === 'weekly' && dayOfWeek !== 0) {
                    return null;
                  }
                  
                  return (
                    <div 
                      key={habit.id}
                      className={`flex items-center p-1 mb-1 rounded cursor-pointer ${
                        completed 
                          ? 'bg-green-800 bg-opacity-30' 
                          : isPast 
                            ? 'bg-red-800 bg-opacity-30' 
                            : 'bg-gray-700 bg-opacity-30'
                      }`}
                      onClick={() => handleToggleCompletion(habit, date)}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                          completed 
                            ? 'bg-green-500' 
                            : isPast 
                              ? 'bg-red-500' 
                              : 'bg-gray-600'
                        }`}
                      >
                        {completed && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs truncate">{habit.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 transition-colors">
      {/* Header with navigation and controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <div className="flex items-center mb-4 sm:mb-0">
          <button 
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            &lt;
          </button>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mx-4">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button 
            onClick={goToNextMonth}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            &gt;
          </button>
          <button 
            onClick={goToToday}
            className="ml-2 p-2 rounded-lg bg-teal-600 dark:bg-teal-700 text-white hover:bg-teal-500 dark:hover:bg-teal-600 text-sm transition-colors"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center">
          <button 
            onClick={toggleViewMode}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 mr-2 transition-colors"
          >
            {viewMode === 'month' ? 'Week View' : 'Month View'}
          </button>
          
          <button 
            onClick={() => setShowAddHabit(true)}
            className="p-2 rounded-lg bg-teal-600 dark:bg-teal-600 text-white hover:bg-teal-500 dark:hover:bg-teal-500 flex items-center transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-1" />
            Add Habit
          </button>
        </div>
      </div>
      
      {/* Habit list */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">My Habits</h3>
        
        {habits.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center transition-colors">
            <p className="text-gray-600 dark:text-gray-400">You don't have any habits yet. Click "Add Habit" to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {habits.map(habit => (
              <div
                key={habit.id}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 relative transition-colors"
                onClick={() => setSelectedHabit(habit)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the parent onClick
                    setViewStatsForHabit(habit);
                  }}
                  className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-teal-500 transition-colors"
                  title="View Stats"
                >
                  <ChartBarIcon className="w-4 h-4" />
                </button>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-gray-800 dark:text-white">{habit.name}</h4>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: habit.color || '#4fd1c5' }}
                  ></div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {habit.frequency === 'daily' && 'Every day'}
                  {habit.frequency === 'weekly' && 'Every week (Sunday)'}
                  {habit.frequency === 'custom' && 'Custom days'}
                </p>
                
                {habit.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 truncate">{habit.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Calendar view */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          {viewMode === 'month' ? 'Monthly View' : 'Weekly View'}
        </h3>
        
        {viewMode === 'month' ? (
          <div className="grid grid-cols-7 gap-2">
            {/* Days of the week headers */}
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-gray-600 dark:text-gray-400 text-sm py-2">
                {day}
              </div>
            ))}
            
            {/* Blank spaces for days before the first day of the month */}
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="p-2 rounded-lg bg-white dark:bg-gray-900"></div>
            ))}
            
            {/* Days of the month */}
            {days.map(day => renderDayCell(day))}
          </div>
        ) : (
          renderWeekView()
        )}
      </div>
      
      {/* Add/Edit Habit Modal */}
      {(showAddHabit || selectedHabit) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                {selectedHabit ? 'Edit Habit' : 'Add New Habit'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddHabit(false);
                  setSelectedHabit(null);
                }}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <HabitForm 
              habit={selectedHabit}
              onSave={selectedHabit ? handleUpdateHabit : handleAddHabit}
              onDelete={selectedHabit ? handleDeleteHabit : undefined}
              onCancel={() => {
                setShowAddHabit(false);
                setSelectedHabit(null);
              }}
            />
          </div>
        </div>
      )}
      
      {/* Stats for selected habit - now using separate state */}
      {viewStatsForHabit && (
        <HabitStats
          habit={viewStatsForHabit}
          onClose={() => setViewStatsForHabit(null)}
        />
      )}
    </div>
  );
};

export default HabitCalendar;