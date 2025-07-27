import React from 'react';
import { Habit, HabitCompletion } from '@/types/habit-tracker';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  FireIcon,
  BoltIcon 
} from '@heroicons/react/24/solid';

interface HabitQuickActionsProps {
  habits: Habit[];
  completions: HabitCompletion[];
  onToggleCompletion: (habit: Habit) => Promise<void>;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const shouldCompleteToday = (habit: Habit): boolean => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  if (habit.frequency === 'daily') return true;
  if (habit.frequency === 'weekly') return dayOfWeek === 1; // Monday
  if (habit.frequency === 'custom' && habit.customDays) {
    return habit.customDays.includes(dayOfWeek);
  }
  return false;
};

const HabitQuickActions: React.FC<HabitQuickActionsProps> = ({
  habits,
  completions,
  onToggleCompletion
}) => {
  const today = formatDate(new Date());
  const todaysHabits = habits.filter(shouldCompleteToday);
  
  if (todaysHabits.length === 0) {
    return (
      <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 dark:bg-gradient-to-br dark:from-primary-800 dark:to-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ClockIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h3 className="text-xl font-heading font-bold text-dark-base dark:text-soft-white mb-3">
            Take a breather! 
          </h3>
          <p className="text-grey-tint leading-relaxed">
            No habits scheduled for today. Enjoy your free time or create a new habit to start building consistency! 😊
          </p>
        </div>
      </div>
    );
  }

  const completedCount = todaysHabits.filter(habit => 
    completions.some(c => c.habitId === habit.id && c.date === today && c.completed)
  ).length;

  const progressPercentage = (completedCount / todaysHabits.length) * 100;

  return (
    <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-dark-base dark:text-soft-white">
              Today's Focus
            </h2>
            <p className="text-sm text-grey-tint">
              {completedCount} of {todaysHabits.length} habits completed
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {progressPercentage === 100 ? (
              <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                <FireIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Perfect Day!</span>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(progressPercentage)}%
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-700 ${
                progressPercentage === 100 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg' 
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-md'
              }`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressPercentage === 100 && (
            <div className="absolute -top-1 right-0 text-green-500 animate-bounce">
              <span className="text-lg">🎉</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-3">
          {todaysHabits.map(habit => {
            const isCompleted = completions.some(
              c => c.habitId === habit.id && c.date === today && c.completed
            );

            return (
              <button
                key={habit.id}
                onClick={() => onToggleCompletion(habit)}
                className={`flex items-center p-4 rounded-2xl border-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                  isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                <div 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${
                    isCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 dark:border-gray-500 group-hover:border-primary-500'
                  }`}
                >
                  {isCompleted && (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <h3 className={`font-heading font-semibold ${
                    isCompleted 
                      ? 'text-green-900 dark:text-green-100' 
                      : 'text-dark-base dark:text-soft-white'
                  }`}>
                    {habit.name}
                  </h3>
                  {habit.description && (
                    <p className={`text-sm mt-1 leading-relaxed ${
                      isCompleted 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-grey-tint'
                    }`}>
                      {habit.description}
                    </p>
                  )}
                </div>

                {isCompleted && (
                  <div className="ml-4">
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <BoltIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">Done!</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {completedCount === todaysHabits.length && todaysHabits.length > 0 && (
          <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 shadow-lg">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <FireIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              <span className="font-heading font-bold text-green-900 dark:text-green-100">
                Fantastic! All habits completed today!
              </span>
              <span className="text-xl animate-pulse">🎉</span>
            </div>
            <p className="text-center text-sm text-green-700 dark:text-green-300">
              You're building an amazing streak. FloCat is purr-oud of you! Keep flowing! 😺✨
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitQuickActions;