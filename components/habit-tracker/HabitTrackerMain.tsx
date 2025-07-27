import React, { useState, useEffect } from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { Habit, HabitCompletion } from '@/types/habit-tracker';
import { 
  PlusIcon, 
  FireIcon, 
  TrophyIcon, 
  ChartBarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  BoltIcon
} from '@heroicons/react/24/solid';

// Components
import HabitForm from './HabitForm';
import HabitStats from './HabitStats';
import FloCatInsights from './FloCatInsights';
import HabitCalendarView from './HabitCalendarView';
import HabitQuickActions from './HabitQuickActions';

// Helper functions
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getTodayFormatted = (): string => {
  return formatDate(new Date());
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

const HabitTrackerMain = () => {
  const { user } = useUser();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [viewStatsForHabit, setViewStatsForHabit] = useState<Habit | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'insights'>('dashboard');
  
  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalHabits: 0,
    todayCompleted: 0,
    todayTotal: 0,
    currentStreak: 0,
    weeklyRate: 0,
    monthlyRate: 0,
    longestStreak: 0
  });

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.primaryEmail) return;
      
      setLoading(true);
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
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.primaryEmail]);

  // Calculate dashboard stats
  useEffect(() => {
    if (!habits.length) return;
    
    const calculateStats = async () => {
      const todaysHabits = habits.filter(shouldCompleteToday);
      const today = getTodayFormatted();
      const completedToday = completions.filter(
        c => c.date === today && c.completed && todaysHabits.some(h => h.id === c.habitId)
      ).length;

      // Calculate overall streak and rates
      let maxStreak = 0;
      for (const habit of habits) {
        try {
          const statsResponse = await fetch(`/api/habits/stats?habitId=${habit.id}`);
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            if (stats.longestStreak > maxStreak) {
              maxStreak = stats.longestStreak;
            }
          }
        } catch (error) {
          console.error('Error loading habit stats:', error);
        }
      }

      // Calculate weekly rate
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyCompletions = completions.filter(c => 
        new Date(c.date) >= oneWeekAgo && c.completed
      ).length;
      
      const weeklyTotal = habits.reduce((total, habit) => {
        let count = 0;
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - i);
          if (shouldCompleteToday(habit)) count++;
        }
        return total + count;
      }, 0);

      const weeklyRate = weeklyTotal > 0 ? Math.round((weeklyCompletions / weeklyTotal) * 100) : 0;

      setDashboardStats({
        totalHabits: habits.length,
        todayCompleted: completedToday,
        todayTotal: todaysHabits.length,
        currentStreak: 0, // Will be calculated based on most recent habit
        weeklyRate,
        monthlyRate: 0, // Simplified for now
        longestStreak: maxStreak
      });
    };

    calculateStats();
  }, [habits, completions]);

  // Handle habit actions
  const handleAddHabit = (newHabit: Habit) => {
    setHabits(prev => [newHabit, ...prev]);
    setShowAddHabit(false);
  };

  const handleUpdateHabit = (updatedHabit: Habit) => {
    setHabits(prev => prev.map(h => h.id === updatedHabit.id ? updatedHabit : h));
    setSelectedHabit(null);
  };

  const handleDeleteHabit = (habitId: string) => {
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setSelectedHabit(null);
  };

  const handleToggleCompletion = async (habit: Habit, date?: Date) => {
    const targetDate = date ? formatDate(date) : getTodayFormatted();
    
    try {
      const response = await fetch('/api/habits/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: habit.id, date: targetDate })
      });
      
      if (response.ok) {
        const updatedCompletion = await response.json();
        setCompletions(prev => {
          const existingIndex = prev.findIndex(
            c => c.habitId === habit.id && c.date === targetDate
          );
          
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedCompletion;
            return updated;
          } else {
            return [...prev, updatedCompletion];
          }
        });
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading your habits...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-soft-white dark:bg-dark-base border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-white text-lg">🎯</span>
                </div>
                <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                  Habit Tracker
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddHabit(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Habit</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8 shadow-md">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
            { id: 'calendar', label: 'Calendar', icon: CalendarDaysIcon },
            { id: 'insights', label: 'FloCat Insights', icon: SparklesIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as any)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                currentView === tab.id
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg transform translate-y-0'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'dashboard' ? 'Stats' : tab.id === 'calendar' ? 'Cal' : '😺'}
              </span>
            </button>
          ))}
        </div>

        {/* Content based on current view */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* Overview Stats */}
            {habits.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                        Today
                      </p>
                      <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                        {dashboardStats.todayCompleted}/{dashboardStats.todayTotal}
                      </p>
                    </div>
                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                        Streak
                      </p>
                      <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                        {dashboardStats.longestStreak}
                      </p>
                    </div>
                    <FireIcon className="w-8 h-8 text-accent-500" />
                  </div>
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                        Weekly
                      </p>
                      <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                        {dashboardStats.weeklyRate}%
                      </p>
                    </div>
                    <ArrowTrendingUpIcon className="w-8 h-8 text-primary-500" />
                  </div>
                </div>

                <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-grey-tint uppercase tracking-wide mb-2">
                        Total
                      </p>
                      <p className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                        {dashboardStats.totalHabits}
                      </p>
                    </div>
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <HabitQuickActions
              habits={habits}
              completions={completions}
              onToggleCompletion={handleToggleCompletion}
            />

            {/* Habits List */}
            {habits.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 dark:bg-gradient-to-br dark:from-primary-800 dark:to-primary-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-4xl">🎯</span>
                </div>
                <h3 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white mb-3">
                  Ready to build amazing habits?
                </h3>
                <p className="text-grey-tint mb-8 max-w-md mx-auto leading-relaxed">
                  Start your journey to better habits today. Track your progress, build streaks, and let FloCat guide you to success! 😺
                </p>
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-2xl transition-all duration-200 font-medium shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />
                  Create Your First Habit
                </button>
              </div>
            ) : (
              <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-heading font-bold text-dark-base dark:text-soft-white">
                    Your Habits
                  </h2>
                  <p className="text-grey-tint mt-1">
                    Track your daily progress and build consistency
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {habits.map(habit => {
                    const isCompletedToday = completions.some(
                      c => c.habitId === habit.id && c.date === getTodayFormatted() && c.completed
                    );
                    const shouldComplete = shouldCompleteToday(habit);

                    return (
                      <div key={habit.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <button
                              onClick={() => handleToggleCompletion(habit)}
                              disabled={!shouldComplete}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isCompletedToday
                                  ? 'bg-green-500 border-green-500'
                                  : shouldComplete
                                  ? 'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                                  : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {isCompletedToday && (
                                <CheckCircleIcon className="w-4 h-4 text-white" />
                              )}
                            </button>
                            
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {habit.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {habit.frequency === 'daily' && 'Every day'}
                                {habit.frequency === 'weekly' && 'Weekly'}
                                {habit.frequency === 'custom' && 'Custom schedule'}
                                {!shouldComplete && ' (not scheduled today)'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setViewStatsForHabit(habit)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            >
                              <ChartBarIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSelectedHabit(habit)}
                              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'calendar' && (
          <HabitCalendarView
            habits={habits}
            completions={completions}
            onToggleCompletion={handleToggleCompletion}
            onEditHabit={setSelectedHabit}
            onViewStats={setViewStatsForHabit}
          />
        )}

        {currentView === 'insights' && (
          <FloCatInsights
            habits={habits}
            completions={completions}
            stats={dashboardStats}
          />
        )}
      </div>

      {/* Modals */}
      {(showAddHabit || selectedHabit) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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

      {viewStatsForHabit && (
        <HabitStats
          habit={viewStatsForHabit}
          onClose={() => setViewStatsForHabit(null)}
        />
      )}
    </div>
  );
};

export default HabitTrackerMain;