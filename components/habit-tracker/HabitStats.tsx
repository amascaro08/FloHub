import React, { useState, useEffect } from 'react';
import { useUser } from '@stackframe/react';
import { calculateHabitStats } from '@/lib/habitService';
import { Habit, HabitStats as HabitStatsType } from '@/types/habit-tracker';
import { XMarkIcon, FireIcon, TrophyIcon, CheckCircleIcon, ChartBarIcon } from '@heroicons/react/24/solid';

interface HabitStatsProps {
  habit: Habit;
  onClose: () => void;
}

const HabitStats: React.FC<HabitStatsProps> = ({ habit, onClose }) => {
  const user = useUser();
  const [stats, setStats] = useState<HabitStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.primaryEmail) return;
      
      setLoading(true);
      try {
        const habitStats = await calculateHabitStats(user.primaryEmail, habit.id);
        setStats(habitStats);
      } catch (error) {
        console.error('Error loading habit stats:', error);
        setError('Failed to load habit statistics');
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [habit.id, user]);

  // Format frequency text
  const getFrequencyText = () => {
    switch (habit.frequency) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return 'Every week (Sunday)';
      case 'custom':
        if (!habit.customDays || habit.customDays.length === 0) return 'Custom (no days selected)';
        
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const selectedDays = habit.customDays
          .sort((a, b) => a - b)
          .map(day => daysOfWeek[day])
          .join(', ');
        
        return `Custom (${selectedDays})`;
      default:
        return 'Unknown frequency';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white transition-colors">Habit Statistics</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="text-lg font-medium text-gray-800 dark:text-white transition-colors">{habit.name}</h4>
          {habit.description && (
            <p className="text-gray-700 dark:text-gray-300 mt-1 transition-colors">{habit.description}</p>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 transition-colors">
            <span className="font-medium">Frequency:</span> {getFrequencyText()}
          </p>
          <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">
            <span className="font-medium">Created:</span> {new Date(habit.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900 bg-opacity-100 dark:bg-opacity-50 text-red-700 dark:text-white p-3 rounded-lg text-sm transition-colors">
            {error}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center transition-colors">
              <div className="flex items-center mb-2">
                <FireIcon className="w-5 h-5 text-orange-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors">Current Streak</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">{stats.currentStreak}</span>
              <span className="text-gray-600 dark:text-gray-400 text-xs mt-1 transition-colors">days</span>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center transition-colors">
              <div className="flex items-center mb-2">
                <TrophyIcon className="w-5 h-5 text-yellow-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors">Longest Streak</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">{stats.longestStreak}</span>
              <span className="text-gray-600 dark:text-gray-400 text-xs mt-1 transition-colors">days</span>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center transition-colors">
              <div className="flex items-center mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors">Total Completions</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">{stats.totalCompletions}</span>
              <span className="text-gray-600 dark:text-gray-400 text-xs mt-1 transition-colors">times</span>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center transition-colors">
              <div className="flex items-center mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-500 mr-1" />
                <span className="text-gray-700 dark:text-gray-300 text-sm transition-colors">Completion Rate</span>
              </div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white transition-colors">{stats.completionRate}%</span>
              <span className="text-gray-600 dark:text-gray-400 text-xs mt-1 transition-colors">of days</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-600 dark:text-gray-400 py-8 transition-colors">
            No statistics available
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitStats;