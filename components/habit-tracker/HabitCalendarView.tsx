import React, { useState } from 'react';
import { Habit, HabitCompletion } from '@/types/habit-tracker';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PencilIcon
} from '@heroicons/react/24/solid';

interface HabitCalendarViewProps {
  habits: Habit[];
  completions: HabitCompletion[];
  onToggleCompletion: (habit: Habit, date: Date) => Promise<void>;
  onEditHabit: (habit: Habit) => void;
  onViewStats: (habit: Habit) => void;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const shouldCompleteOnDate = (habit: Habit, date: Date): boolean => {
  const dayOfWeek = date.getDay();
  
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') return dayOfWeek === 1; // Monday
  if (habit.frequency === 'custom' && habit.customDays) {
    return habit.customDays.includes(dayOfWeek);
  }
  return false;
};

const HabitCalendarView: React.FC<HabitCalendarViewProps> = ({
  habits,
  completions,
  onToggleCompletion,
  onEditHabit,
  onViewStats
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  // Calculate calendar data
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create calendar days
  const calendarDays = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day));
  }

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Check if habit is completed on a specific date
  const isHabitCompleted = (habitId: string, date: Date): boolean => {
    const dateStr = formatDate(date);
    return completions.some(
      c => c.habitId === habitId && c.date === dateStr && c.completed
    );
  };

  // Get week view dates
  const getWeekDates = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const renderCalendarDay = (date: Date | null, isWeekView = false) => {
    if (!date) {
      return (
        <div key="empty" className="p-2 h-24">
          {/* Empty cell */}
        </div>
      );
    }

    const dateStr = formatDate(date);
    const isToday = dateStr === formatDate(today);
    const isPast = date < new Date(today.setHours(0, 0, 0, 0));
    const dayNumber = date.getDate();
    const isCurrentMonth = date.getMonth() === month;

    // Get habits scheduled for this date
    const scheduledHabits = habits.filter(habit => shouldCompleteOnDate(habit, date));
    const completedHabits = scheduledHabits.filter(habit => isHabitCompleted(habit.id, date));
    
    const completionRate = scheduledHabits.length > 0 
      ? (completedHabits.length / scheduledHabits.length) * 100 
      : 0;

    return (
      <div 
        key={dateStr}
        className={`relative p-2 rounded-lg border transition-colors ${
          isToday 
            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700' 
            : isCurrentMonth || isWeekView
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
            : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50'
        } ${isWeekView ? 'h-32' : 'h-24'}`}
      >
        {/* Date header */}
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${
            isToday 
              ? 'text-primary-700 dark:text-primary-300' 
              : isCurrentMonth || isWeekView
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-500'
          }`}>
            {dayNumber}
          </span>
          
          {scheduledHabits.length > 0 && (
            <div className={`text-xs px-1.5 py-0.5 rounded-full ${
              completionRate === 100
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : completionRate > 0
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                : isPast
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {completedHabits.length}/{scheduledHabits.length}
            </div>
          )}
        </div>

        {/* Habit indicators */}
        <div className="space-y-1 overflow-hidden">
          {scheduledHabits.slice(0, isWeekView ? 4 : 2).map(habit => {
            const isCompleted = isHabitCompleted(habit.id, date);
            
            return (
              <button
                key={habit.id}
                onClick={() => onToggleCompletion(habit, date)}
                className={`w-full flex items-center p-1 rounded text-xs transition-colors ${
                  isCompleted
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : isPast && shouldCompleteOnDate(habit, date)
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className={`w-3 h-3 rounded-full mr-1.5 flex-shrink-0 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isPast && shouldCompleteOnDate(habit, date)
                    ? 'bg-red-500'
                    : 'bg-gray-400 dark:bg-gray-500'
                }`}>
                  {isCompleted && (
                    <CheckCircleIcon className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="truncate">{habit.name}</span>
              </button>
            );
          })}
          
          {scheduledHabits.length > (isWeekView ? 4 : 2) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
              +{scheduledHabits.length - (isWeekView ? 4 : 2)} more
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h2>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode(viewMode === 'month' ? 'week' : 'month')}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <CalendarDaysIcon className="w-4 h-4 mr-1" />
                {viewMode === 'month' ? 'Week View' : 'Month View'}
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {viewMode === 'month' ? (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {daysOfWeek.map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0, 1)}</span>
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((date, index) => (
                <div key={index}>
                  {renderCalendarDay(date)}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Week view headers */}
              {daysOfWeek.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                  {day}
                </div>
              ))}
              
              {/* Week view days */}
              {getWeekDates().map((date) => (
                <div key={formatDate(date)}>
                  {renderCalendarDay(date, true)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend and Habits List */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Legend
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Completed</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Missed (past due)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Pending</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-primary-200 dark:bg-primary-700 rounded border-2 border-primary-500"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Today</span>
            </div>
          </div>
        </div>

        {/* Quick Habit Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          
          <div className="space-y-2">
            {habits.slice(0, 5).map(habit => (
              <div key={habit.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <span className="text-sm text-gray-900 dark:text-white font-medium">
                  {habit.name}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onViewStats(habit)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="View Stats"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditHabit(habit)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Edit Habit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            
            {habits.length > 5 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                +{habits.length - 5} more habits
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitCalendarView;