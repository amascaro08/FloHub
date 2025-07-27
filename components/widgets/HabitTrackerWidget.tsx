'use client'

import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { 
  Plus, 
  CheckCircle, 
  Circle, 
  Trash2, 
  Edit3, 
  Sparkles,
  Calendar,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'custom';
  customDays?: number[];
  streak: number;
  lastCompleted?: string;
}

interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
}

const HabitTrackerWidget: React.FC = () => {
  const { user } = useUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [newHabitCustomDays, setNewHabitCustomDays] = useState<number[]>([]);
  const [showAllHabits, setShowAllHabits] = useState(false);

  // Load habits and completions
  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) return;
      
      setIsLoading(true);
      try {
        // Load habits
        const habitsResponse = await fetch('/api/habits');
        if (habitsResponse.ok) {
          const userHabits = await habitsResponse.json();
          setHabits(userHabits);
        }
        
        // Load completions for current month
        const today = new Date();
        const completionsResponse = await fetch(
          `/api/habits/completions?year=${today.getFullYear()}&month=${today.getMonth()}`
        );
        if (completionsResponse.ok) {
          const monthCompletions = await completionsResponse.json();
          setCompletions(monthCompletions);
        }
      } catch (error) {
        console.error('Error loading habit data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.email]);

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

  const isCompletedToday = (habitId: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return completions.some(completion => 
      completion.habitId === habitId && completion.date === today
    );
  };

  const handleToggleCompletion = async (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = isCompletedToday(habit.id);

    try {
      if (isCompleted) {
        // Remove completion
        const completion = completions.find(c => 
          c.habitId === habit.id && c.date === today
        );
        if (completion) {
          await fetch(`/api/habits/completions/${completion.id}`, {
            method: 'DELETE'
          });
          setCompletions(prev => prev.filter(c => c.id !== completion.id));
        }
      } else {
        // Add completion
        const response = await fetch('/api/habits/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitId: habit.id,
            date: today
          })
        });
        if (response.ok) {
          const newCompletion = await response.json();
          setCompletions(prev => [...prev, newCompletion]);
        }
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHabitName.trim(),
          frequency: newHabitFrequency,
          customDays: newHabitFrequency === 'custom' ? newHabitCustomDays : undefined
        })
      });

      if (response.ok) {
        const newHabit = await response.json();
        setHabits(prev => [...prev, newHabit]);
        setNewHabitName('');
        setNewHabitFrequency('daily');
        setNewHabitCustomDays([]);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE'
      });
      setHabits(prev => prev.filter(h => h.id !== habitId));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  const getFrequencyLabel = (habit: Habit): string => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.frequency === 'weekly') return 'Weekly';
    if (habit.frequency === 'custom') {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return habit.customDays?.map(day => dayNames[day]).join(', ') || 'Custom';
    }
    return 'Unknown';
  };

  const getTodayHabits = (): Habit[] => {
    return habits.filter(habit => shouldCompleteToday(habit));
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body">Please sign in to track your habits.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const todayHabits = getTodayHabits();
  const completedToday = todayHabits.filter(habit => isCompletedToday(habit.id)).length;

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Stats Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex-shrink-0">
            <Target className="w-4 h-4 text-primary-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white truncate">
              Today's Progress
            </h3>
            <p className="text-xs text-grey-tint">
              {completedToday} of {todayHabits.length} completed
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-2 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors duration-200 flex items-center space-x-1 flex-shrink-0"
        >
          <Plus className="w-3 h-3" />
          <span className="text-xs hidden sm:inline">Add Habit</span>
        </button>
      </div>

      {/* Progress Bar */}
      {todayHabits.length > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedToday / todayHabits.length) * 100}%` }}
          />
        </div>
      )}

      {/* Add Habit Form */}
      {showAddForm && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-medium text-dark-base dark:text-soft-white mb-3">
            Add New Habit
          </h4>
          
          <div className="space-y-3">
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Habit name..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-grey-tint">Frequency</label>
              <div className="flex space-x-2">
                {['daily', 'weekly', 'custom'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setNewHabitFrequency(freq as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      newHabitFrequency === freq
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {newHabitFrequency === 'custom' && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-grey-tint">Days</label>
                <div className="flex space-x-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={day}
                      onClick={() => {
                        const newDays = newHabitCustomDays.includes(index)
                          ? newHabitCustomDays.filter(d => d !== index)
                          : [...newHabitCustomDays, index];
                        setNewHabitCustomDays(newDays);
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        newHabitCustomDays.includes(index)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={handleAddHabit}
                disabled={!newHabitName.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Add Habit
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Habits */}
      <div className="space-y-3">
        {todayHabits.length > 0 ? (
          todayHabits.map((habit) => {
            const completed = isCompletedToday(habit.id);
            return (
              <div
                key={habit.id}
                className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
              >
                <button
                  onClick={() => handleToggleCompletion(habit)}
                  className="flex-shrink-0"
                >
                  {completed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-primary-500 transition-colors" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    completed 
                      ? 'text-gray-500 dark:text-gray-400 line-through' 
                      : 'text-dark-base dark:text-soft-white'
                  }`}>
                    {habit.name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-grey-tint">
                      {getFrequencyLabel(habit)}
                    </span>
                    <span className="text-xs text-grey-tint flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>{habit.streak} day streak</span>
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-1 text-gray-400 hover:text-accent-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              No habits scheduled for today
            </p>
          </div>
        )}
      </div>

      {/* All Habits Summary */}
      {habits.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setShowAllHabits(!showAllHabits)}
            className="w-full text-left flex items-center space-x-2 text-sm font-medium text-dark-base dark:text-soft-white hover:text-primary-500 transition-colors"
          >
            {showAllHabits ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Calendar className="w-4 h-4 text-primary-500" />
            <span>All Habits ({habits.length})</span>
          </button>
          {showAllHabits && (
            <div className="space-y-2 ml-4">
            {habits.slice(0, 3).map((habit) => (
              <div
                key={habit.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-base dark:text-soft-white truncate">
                    {habit.name}
                  </p>
                  <p className="text-xs text-grey-tint">
                    {getFrequencyLabel(habit)}
                  </p>
                </div>
                <span className="text-xs text-grey-tint">
                  {habit.streak} day streak
                </span>
              </div>
            ))}
            {habits.length > 3 && (
              <p className="text-xs text-grey-tint text-center">
                +{habits.length - 3} more habits
              </p>
            )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HabitTrackerWidget;