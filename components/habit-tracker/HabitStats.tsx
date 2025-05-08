import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/ui/AuthContext';
import { calculateHabitStats } from '@/lib/habitService';
import { Habit, HabitStats as HabitStatsType } from '@/types/habit-tracker';
import { XMarkIcon, FireIcon, TrophyIcon, CheckCircleIcon, ChartBarIcon } from '@heroicons/react/24/solid';

interface HabitStatsProps {
  habit: Habit;
  onClose: () => void;
}

const HabitStats: React.FC<HabitStatsProps> = ({ habit, onClose }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<HabitStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.email) return;
      
      setLoading(true);
      try {
        const habitStats = await calculateHabitStats(user.email, habit.id);
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
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">Habit Statistics</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="text-lg font-medium text-white">{habit.name}</h4>
          {habit.description && (
            <p className="text-gray-300 mt-1">{habit.description}</p>
          )}
          <p className="text-gray-400 text-sm mt-2">
            <span className="font-medium">Frequency:</span> {getFrequencyText()}
          </p>
          <p className="text-gray-400 text-sm">
            <span className="font-medium">Created:</span> {new Date(habit.createdAt).toLocaleDateString()}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900 bg-opacity-50 text-white p-3 rounded-lg text-sm">
            {error}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
              <div className="flex items-center mb-2">
                <FireIcon className="w-5 h-5 text-orange-500 mr-1" />
                <span className="text-gray-300 text-sm">Current Streak</span>
              </div>
              <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
              <span className="text-gray-400 text-xs mt-1">days</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
              <div className="flex items-center mb-2">
                <TrophyIcon className="w-5 h-5 text-yellow-500 mr-1" />
                <span className="text-gray-300 text-sm">Longest Streak</span>
              </div>
              <span className="text-2xl font-bold text-white">{stats.longestStreak}</span>
              <span className="text-gray-400 text-xs mt-1">days</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
              <div className="flex items-center mb-2">
                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1" />
                <span className="text-gray-300 text-sm">Total Completions</span>
              </div>
              <span className="text-2xl font-bold text-white">{stats.totalCompletions}</span>
              <span className="text-gray-400 text-xs mt-1">times</span>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4 flex flex-col items-center">
              <div className="flex items-center mb-2">
                <ChartBarIcon className="w-5 h-5 text-blue-500 mr-1" />
                <span className="text-gray-300 text-sm">Completion Rate</span>
              </div>
              <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
              <span className="text-gray-400 text-xs mt-1">of days</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No statistics available
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HabitStats;