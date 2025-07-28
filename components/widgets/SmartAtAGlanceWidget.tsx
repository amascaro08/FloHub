import React, { useState, useEffect, useCallback, memo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import type { WidgetProps } from '@/types/app';
import {
  fetchTasks,
  fetchNotes,
  fetchMeetings,
  invalidateCache,
} from '@/lib/widgetFetcher';
import {
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/habitServiceAPI';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  CheckCircle,
  Clock,
  Target,
  Heart,
  Zap,
  ChevronRight,
  RefreshCw,
  Calendar,
  Users,
  PlusCircle,
  Eye,
  BarChart3,
  Coffee,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Star
} from 'lucide-react';
import type { CalendarEvent, Task, Note } from '../../types/calendar';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';

interface SmartInsight {
  type: 'urgent' | 'opportunity' | 'celebration' | 'suggestion' | 'warning';
  title: string;
  message: string;
  icon: React.ReactNode;
  actionable?: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface NextMeeting {
  summary: string;
  startTime: Date;
  timeUntilStart: string;
  isUrgent: boolean;
  location?: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  variant?: 'default' | 'destructive' | 'ghost' | 'secondary';
}

const SmartAtAGlanceWidget = ({ size = 'medium', colSpan = 4, rowSpan = 3, isCompact = false, isHero = false }: WidgetProps = {}) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  const trackingHook = isClient ? useWidgetTracking('SmartAtAGlanceWidget') : { trackInteraction: () => {} };

  // Use shared calendar context
  const {
    events: calendarEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCalendarContext();

  // Smart data analysis functions - memoized to prevent re-creation
  const analyzeData = useCallback((tasks: any[], events: CalendarEvent[], habits: any[], habitCompletions: any[]) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Safely handle arrays with fallbacks
      const safeTasks = Array.isArray(tasks) ? tasks : [];
      const safeEvents = Array.isArray(events) ? events : [];
      const safeHabits = Array.isArray(habits) ? habits : [];
      const safeHabitCompletions = Array.isArray(habitCompletions) ? habitCompletions : [];

      // Filter incomplete tasks (using same logic as other widgets)
      const incompleteTasks = safeTasks.filter(task => task && !task.done);

          // Get today's events
      const todayEvents = safeEvents.filter(event => {
      let eventDate: Date;
      if (event.start instanceof Date) {
        eventDate = event.start;
      } else if (event.start?.dateTime) {
        eventDate = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        eventDate = new Date(event.start.date);
      } else {
        return false;
      }
      return eventDate >= today && eventDate < tomorrow;
    });

          // Get next meeting
      const upcomingEvents = safeEvents
        .filter(event => {
        let eventStart: Date;
        if (event.start instanceof Date) {
          eventStart = event.start;
        } else if (event.start?.dateTime) {
          eventStart = new Date(event.start.dateTime);
        } else {
          return false;
        }
        return eventStart > now;
      })
      .sort((a, b) => {
        const aStart = a.start instanceof Date ? a.start : new Date(a.start?.dateTime || '');
        const bStart = b.start instanceof Date ? b.start : new Date(b.start?.dateTime || '');
        return aStart.getTime() - bStart.getTime();
      });

    const nextMeeting = upcomingEvents.length > 0 ? {
      summary: upcomingEvents[0].summary || 'Meeting',
      startTime: upcomingEvents[0].start instanceof Date ? upcomingEvents[0].start : new Date(upcomingEvents[0].start?.dateTime || ''),
      timeUntilStart: formatTimeUntil(upcomingEvents[0].start instanceof Date ? upcomingEvents[0].start : new Date(upcomingEvents[0].start?.dateTime || '')),
      isUrgent: isUrgentMeeting(upcomingEvents[0]),
      location: upcomingEvents[0].location
    } : null;

          // Analyze habits
      const todayHabits = safeHabits.filter(habit => {
      const dayOfWeek = now.getDay();
      if (habit.frequency === 'daily') return true;
      if (habit.frequency === 'weekly') return dayOfWeek === 1; // Monday
      if (habit.frequency === 'custom' && habit.customDays) {
        return habit.customDays.includes(dayOfWeek);
      }
      return false;
    });

          const completedHabits = todayHabits.filter(habit => {
        const today = now.toISOString().split('T')[0];
        return safeHabitCompletions.some(completion => 
          completion && completion.habitId === habit.id && completion.date === today
        );
      });

    // Generate insights
    const insights: SmartInsight[] = [];

    // Task insights
    if (incompleteTasks.length > 0) {
      const urgentTasks = incompleteTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const diffTime = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 1;
      });

      if (urgentTasks.length > 0) {
        insights.push({
          type: 'urgent',
          title: 'Urgent Tasks Due',
          message: `${urgentTasks.length} task${urgentTasks.length > 1 ? 's' : ''} due today or tomorrow`,
          icon: <AlertTriangle className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/tasks',
          actionLabel: 'View Tasks'
        });
      }

      if (incompleteTasks.length > 5) {
        insights.push({
          type: 'warning',
          title: 'Many Pending Tasks',
          message: `You have ${incompleteTasks.length} incomplete tasks`,
          icon: <CheckSquare className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/tasks',
          actionLabel: 'Review Tasks'
        });
      }
    }

    // Meeting insights
    if (nextMeeting) {
      if (nextMeeting.isUrgent) {
        insights.push({
          type: 'urgent',
          title: 'Meeting Starting Soon',
          message: `${nextMeeting.summary} starts in ${nextMeeting.timeUntilStart}`,
          icon: <Clock className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/meetings',
          actionLabel: 'View Meeting'
        });
      } else {
        insights.push({
          type: 'opportunity',
          title: 'Next Meeting',
          message: `${nextMeeting.summary} at ${nextMeeting.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          icon: <Calendar className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/meetings',
          actionLabel: 'View Details'
        });
      }
    }

    // Habit insights
    if (todayHabits.length > 0) {
      const completionRate = (completedHabits.length / todayHabits.length) * 100;
      
      if (completionRate === 100) {
        insights.push({
          type: 'celebration',
          title: 'Perfect Day!',
          message: 'All habits completed for today',
          icon: <Star className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/habit-tracker',
          actionLabel: 'View Progress'
        });
      } else if (completionRate >= 50) {
        insights.push({
          type: 'opportunity',
          title: 'Good Progress',
          message: `${completedHabits.length} of ${todayHabits.length} habits completed`,
          icon: <TrendingUp className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/habit-tracker',
          actionLabel: 'Complete More'
        });
      } else {
        insights.push({
          type: 'warning',
          title: 'Habits Need Attention',
          message: `${completedHabits.length} of ${todayHabits.length} habits completed`,
          icon: <Target className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/habit-tracker',
          actionLabel: 'Get Started'
        });
      }
    }

    // Productivity insights
    if (incompleteTasks.length === 0 && todayHabits.length === 0) {
      insights.push({
        type: 'celebration',
        title: 'All Caught Up!',
        message: 'No pending tasks or habits for today',
        icon: <CheckCircle className="w-4 h-4" />,
        actionable: true,
        action: () => window.location.href = '/dashboard/notes',
        actionLabel: 'Add Notes'
      });
    }

          return {
        tasks: {
          total: safeTasks.length,
          incomplete: incompleteTasks.length,
          urgent: incompleteTasks.filter(task => {
            if (!task || !task.dueDate) return false;
            try {
              const dueDate = new Date(task.dueDate);
              const diffTime = dueDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays <= 1;
            } catch {
              return false;
            }
          }).length
        },
        events: {
          today: todayEvents.length,
          next: nextMeeting
        },
        habits: {
          total: todayHabits.length,
          completed: completedHabits.length,
          completionRate: todayHabits.length > 0 ? (completedHabits.length / todayHabits.length) * 100 : 0
        },
        insights
      };
    } catch (error) {
      console.error('Error analyzing smart widget data:', error);
      // Return safe default data structure
      return {
        tasks: { total: 0, incomplete: 0, urgent: 0 },
        events: { today: 0, next: null },
        habits: { total: 0, completed: 0, completionRate: 0 },
        insights: []
      };
    }
  }, []);

  // Helper functions
  const formatTimeUntil = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    return 'Now';
  };

  const isUrgentMeeting = (event: CalendarEvent): boolean => {
    if (!event.start) return false;
    const startTime = event.start instanceof Date ? event.start : new Date(event.start.dateTime || '');
    const now = new Date();
    const diffMs = startTime.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins <= 30 && diffMins >= 0;
  };

  // Load data with enhanced error handling
  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) return;

      setLoading(true);
      setError(null);
      
      try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, but API expects 1-12
        
        // Safely fetch data with fallbacks
        const [tasks, notes, meetings, habits, habitCompletions] = await Promise.allSettled([
          fetchTasks(),
          fetchNotes(),
          fetchMeetings(),
          fetchHabits(),
          fetchHabitCompletions(currentYear, currentMonth)
        ]);

        // Extract successful results with fallbacks
        const safeTasks = tasks.status === 'fulfilled' ? tasks.value : [];
        const safeNotes = notes.status === 'fulfilled' ? notes.value : [];
        const safeMeetings = meetings.status === 'fulfilled' ? meetings.value : [];
        const safeHabits = habits.status === 'fulfilled' ? habits.value : [];
        const safeHabitCompletions = habitCompletions.status === 'fulfilled' ? habitCompletions.value : [];

        // Ensure calendarEvents is an array
        const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];

        const analyzedData = analyzeData(safeTasks, safeCalendarEvents, safeHabits, safeHabitCompletions);
        setData(analyzedData);
      } catch (error) {
        console.error('Error loading smart widget data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.email, calendarEvents, analyzeData]);

  // Refresh data with enhanced error handling
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      await invalidateCache('*'); // Invalidate all cached data
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11, but API expects 1-12
      
      // Use Promise.allSettled for safer concurrent requests
      const [tasks, notes, meetings, habits, habitCompletions] = await Promise.allSettled([
        fetchTasks(),
        fetchNotes(),
        fetchMeetings(),
        fetchHabits(),
        fetchHabitCompletions(currentYear, currentMonth)
      ]);

      // Extract successful results with fallbacks
      const safeTasks = tasks.status === 'fulfilled' ? tasks.value : [];
      const safeNotes = notes.status === 'fulfilled' ? notes.value : [];
      const safeMeetings = meetings.status === 'fulfilled' ? meetings.value : [];
      const safeHabits = habits.status === 'fulfilled' ? habits.value : [];
      const safeHabitCompletions = habitCompletions.status === 'fulfilled' ? habitCompletions.value : [];

      // Ensure calendarEvents is an array
      const safeCalendarEvents = Array.isArray(calendarEvents) ? calendarEvents : [];

      const analyzedData = analyzeData(safeTasks, safeCalendarEvents, safeHabits, safeHabitCompletions);
      setData(analyzedData);
      trackingHook.trackInteraction('refresh_data');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body">Please sign in to view your smart insights.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-accent-500" />
        </div>
        <p className="text-grey-tint font-body text-sm">
          Unable to load smart insights
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Brain className="w-6 h-6 text-primary-500" />
        </div>
        <p className="text-grey-tint font-body text-sm">
          No data available
        </p>
      </div>
    );
  }

  return (
    <div className={`${isCompact ? 'space-y-2' : 'space-y-4'} h-full flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className={`${isCompact ? 'p-1.5' : 'p-2'} bg-primary-100 dark:bg-primary-900/30 rounded-xl`}>
            <Brain className={`${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-primary-500`} />
          </div>
          <div>
            <h3 className={`${isCompact ? 'text-xs' : 'text-sm'} font-medium text-dark-base dark:text-soft-white`}>
              {isCompact ? 'Insights' : 'Smart Insights'}
            </h3>
                        {!isCompact && (
              <p className="text-xs text-grey-tint">
                AI-powered recommendations
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-2">
            <CheckSquare className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
            {data?.tasks?.incomplete ?? 0}
          </p>
          <p className="text-xs text-grey-tint">Tasks</p>
        </div>
        
        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center w-8 h-8 bg-accent-100 dark:bg-accent-900/30 rounded-lg mx-auto mb-2">
            <Calendar className="w-4 h-4 text-accent-500" />
          </div>
          <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
            {data?.events?.today ?? 0}
          </p>
          <p className="text-xs text-grey-tint">Events</p>
        </div>
        
        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-2">
            <Target className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
            {data?.habits?.completed ?? 0}/{data?.habits?.total ?? 0}
          </p>
          <p className="text-xs text-grey-tint">Habits</p>
        </div>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        {data?.insights && Array.isArray(data.insights) && data.insights.length > 0 ? (
          data.insights.slice(0, 3).map((insight: SmartInsight, index: number) => (
            <div
              key={index}
              className={`p-3 rounded-xl border ${
                insight.type === 'urgent'
                  ? 'bg-accent-50 border-accent-200 dark:bg-accent-900/20 dark:border-accent-800'
                  : insight.type === 'celebration'
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  : insight.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 rounded-lg ${
                  insight.type === 'urgent'
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300'
                    : insight.type === 'celebration'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : insight.type === 'warning'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                }`}>
                  {insight.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-dark-base dark:text-soft-white">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-grey-tint mt-1">
                    {insight.message}
                  </p>
                  
                  {insight.actionable && insight.action && (
                    <button
                      onClick={insight.action}
                      className="mt-2 text-xs text-primary-500 hover:text-primary-600 transition-colors flex items-center space-x-1"
                    >
                      <span>{insight.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-grey-tint font-body text-sm">
              All caught up! No insights to show.
            </p>
          </div>
        )}
      </div>

      {/* Next Meeting */}
      {data?.events?.next && (
        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent-100 dark:bg-accent-900/30 rounded-xl">
              <Clock className="w-4 h-4 text-accent-500" />
            </div>
                          <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-dark-base dark:text-soft-white truncate">
                  {data?.events?.next?.summary || 'Meeting'}
                </h4>
                <p className="text-xs text-grey-tint">
                  {data?.events?.next?.startTime?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || ''} • {data?.events?.next?.timeUntilStart || ''}
                </p>
              </div>
            <button
              onClick={() => window.location.href = '/dashboard/meetings'}
              className="p-1 text-gray-400 hover:text-accent-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(SmartAtAGlanceWidget);