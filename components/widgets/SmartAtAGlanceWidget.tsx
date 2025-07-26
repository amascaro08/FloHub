import React, { useState, useEffect, useCallback, memo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
  CheckSquare
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

const SmartAtAGlanceWidget = () => {
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

  // Smart data analysis functions
  const analyzeData = useCallback((tasks: any[], events: CalendarEvent[], habits: any[], habitCompletions: any[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Filter incomplete tasks
    const incompleteTasks = tasks.filter(task => !(task.completed || task.done));
    
    // Analyze urgency
    const urgentTasks = incompleteTasks.filter(task => 
      task.text?.toLowerCase().includes('urgent') ||
      task.text?.toLowerCase().includes('asap') ||
      task.text?.toLowerCase().includes('priority') ||
      task.text?.toLowerCase().includes('important') ||
      (task.dueDate && new Date(task.dueDate) <= tomorrow)
    );

    const overdueTasks = incompleteTasks.filter(task =>
      task.dueDate && new Date(task.dueDate) < today
    );

    // Today's events
    const todayEvents = events.filter(event => {
      let eventDate;
      if (event.start instanceof Date) {
        eventDate = event.start;
      } else {
        eventDate = new Date(event.start?.dateTime || event.start?.date || '');
      }
      return eventDate >= today && eventDate < tomorrow;
    });

    // Find next meeting
    const upcomingEvents = todayEvents.filter(event => {
      let eventTime;
      if (event.start instanceof Date) {
        eventTime = event.start;
      } else {
        eventTime = new Date(event.start?.dateTime || event.start?.date || '');
      }
      return eventTime > now;
    }).sort((a, b) => {
      const timeA = a.start instanceof Date ? a.start : new Date(a.start?.dateTime || a.start?.date || '');
      const timeB = b.start instanceof Date ? b.start : new Date(b.start?.dateTime || b.start?.date || '');
      return timeA.getTime() - timeB.getTime();
    });

    let nextMeeting: NextMeeting | null = null;
    if (upcomingEvents.length > 0) {
      const event = upcomingEvents[0];
      const eventTime = event.start instanceof Date ? event.start : new Date(event.start?.dateTime || event.start?.date || '');
      const timeUntil = eventTime.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeUntilStart = '';
      if (hoursUntil === 0 && minutesUntil <= 60) {
        timeUntilStart = `${minutesUntil}m`;
      } else if (hoursUntil < 24) {
        timeUntilStart = `${hoursUntil}h ${minutesUntil}m`;
      } else {
        timeUntilStart = formatInTimeZone(eventTime, userTimezone, 'h:mm a');
      }

      nextMeeting = {
        summary: event.summary || 'Untitled Meeting',
        startTime: eventTime,
        timeUntilStart,
        isUrgent: minutesUntil <= 15,
        location: event.location
      };
    }

    // Habit analysis
    const todayFormatted = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
    const completedHabits = habits.filter(habit =>
      habitCompletions.some(c =>
        c.habitId === habit.id &&
        c.date === todayFormatted &&
        c.completed
      )
    );

    // Generate smart insights
    const insights: SmartInsight[] = [];

    // Urgent alerts
    if (nextMeeting?.isUrgent) {
      insights.push({
        type: 'urgent',
        title: 'Meeting Starting Soon!',
        message: `"${nextMeeting.summary}" starts in ${nextMeeting.timeUntilStart}`,
        icon: <AlertTriangle className="w-4 h-4" />,
        actionable: true,
                 action: () => window.open('/calendar', '_blank'),
        actionLabel: 'Open Calendar'
      });
    }

    if (overdueTasks.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Overdue Tasks',
        message: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past due`,
        icon: <Clock className="w-4 h-4" />,
        actionable: true,
                 action: () => window.open('/dashboard/tasks', '_blank'),
        actionLabel: 'Review Tasks'
      });
    }

    // Positive insights
    if (completedHabits.length === habits.length && habits.length > 0) {
      insights.push({
        type: 'celebration',
        title: 'Habit Streak! 🎉',
        message: `All ${habits.length} habits completed today!`,
        icon: <Target className="w-4 h-4" />
      });
    }

    // Opportunities
    if (incompleteTasks.length === 0 && todayEvents.length === 0) {
      insights.push({
        type: 'opportunity',
        title: 'Free Time Ahead',
        message: 'Perfect opportunity for deep work or planning',
        icon: <Lightbulb className="w-4 h-4" />
      });
    }

    // Smart suggestions
    if (urgentTasks.length > 2) {
      insights.push({
        type: 'suggestion',
        title: 'Focus Recommendation',
        message: 'Consider blocking time for your priority tasks',
        icon: <Brain className="w-4 h-4" />
      });
    }

    if (todayEvents.length > 4) {
      insights.push({
        type: 'suggestion',
        title: 'Busy Day Alert',
        message: 'Schedule 15-min buffers between meetings',
        icon: <Coffee className="w-4 h-4" />
      });
    }

         return {
       incompleteTasks,
       urgentTasks,
       overdueTasks,
       todayEvents,
       nextMeeting,
       completedHabits,
       insights: insights.slice(0, 3), // Top 3 insights
       stats: {
         tasksTotal: incompleteTasks.length,
         tasksUrgent: urgentTasks.length,
         tasksOverdue: overdueTasks.length,
         eventsToday: todayEvents.length,
         habitProgress: habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0,
         habitCount: `${completedHabits.length}/${habits.length}`
       }
     };
  }, []);

  // Quick actions
  const getQuickActions = useCallback((): QuickAction[] => {
    const actions: QuickAction[] = [
      {
                 label: 'Add Task',
         icon: <PlusCircle className="w-4 h-4" />,
         action: () => window.open('/dashboard/tasks', '_blank')
      },
      {
        label: 'View Calendar',
        icon: <Calendar className="w-4 h-4" />,
        action: () => window.open('/calendar', '_blank')
      },
    ];

    if (data?.stats.tasksUrgent > 0) {
      actions.unshift({
        label: 'Review Urgent',
        icon: <AlertTriangle className="w-4 h-4" />,
                 action: () => window.open('/dashboard/tasks?filter=urgent', '_blank'),
        variant: 'destructive'
      });
    }

         if (data?.stats.habitCount && data.stats.habitProgress < 100) {
       actions.push({
         label: 'Track Habits',
         icon: <Target className="w-4 h-4" />,
         action: () => window.open('/habit-tracker', '_blank'),
         variant: 'ghost'
       });
     }

    return actions.slice(0, 4); // Max 4 actions
  }, [data]);

  // Optimized data fetching
  const fetchData = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Fetch data in parallel
      const fetchPromises = [
        fetchTasks().catch(() => ({ tasks: [] })),
        fetchNotes().catch(() => ({ notes: [] })),
        fetchMeetings().catch(() => ({ meetings: [] })),
        fetchHabits().catch(() => ({ habits: [] })),
        fetchHabitCompletions(new Date().getFullYear(), new Date().getMonth() + 1).catch(() => ({ completions: [] }))
      ];

      const [tasksData, notesData, meetingsData, habitsData, habitCompletionsData] = await Promise.allSettled(fetchPromises);

      // Process results with fallbacks
      const tasks = tasksData.status === 'fulfilled' ? tasksData.value.tasks || [] : [];
      const notes = notesData.status === 'fulfilled' ? notesData.value.notes || [] : [];
      const meetings = meetingsData.status === 'fulfilled' ? meetingsData.value.meetings || [] : [];
      const habits = habitsData.status === 'fulfilled' ? habitsData.value.habits || [] : [];
      const habitCompletions = habitCompletionsData.status === 'fulfilled' ? habitCompletionsData.value.completions || [] : [];

      // Analyze and set data
      const analysis = analyzeData(tasks, calendarEvents, habits, habitCompletions);
      setData({
        ...analysis,
        notes,
        meetings,
        lastUpdated: new Date()
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching SmartAtAGlance data:', err);
      setError('Failed to load data');
      setLoading(false);
    }
  }, [user, calendarEvents, analyzeData]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (user?.email && !eventsLoading) {
      fetchData();
    }
  }, [user, fetchData, eventsLoading]);

  // Manual refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateCache('tasks');
    invalidateCache('notes');
    invalidateCache('meetings');
    invalidateCache('habits');
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!user?.email) return;
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, fetchData]);

  if (error) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5 text-purple-500" />
            Smart Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--fg-muted)] dark:text-gray-300">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                         <p className="font-medium">FloHub AI is Recharging</p>
             <p className="text-sm mt-1">Smart insights temporarily unavailable</p>
            <Button 
              variant="secondary" 
              onClick={handleRefresh}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || eventsLoading) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5 text-purple-500" />
            Smart Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
            <span className="ml-2 text-[var(--fg)] dark:text-gray-100">FloHub AI is analyzing your day...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const quickActions = getQuickActions();

  return (
    <div 
      className="space-y-4"
      onClick={() => trackingHook.trackInteraction('view_smart_summary')}
    >
      {/* Header with Key Insights */}
      <Card className="w-full bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
              <Brain className="w-5 h-5 text-teal-500" />
              Smart Dashboard
              <Badge variant="secondary" className="ml-2 bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                AI Powered
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-teal-600 hover:text-teal-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">{data.stats.tasksTotal}</div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Pending Tasks</div>
              {data.stats.tasksUrgent > 0 && (
                <Badge variant="destructive" className="mt-1 text-xs">{data.stats.tasksUrgent} urgent</Badge>
              )}
              {data.stats.tasksOverdue > 0 && (
                <Badge className="mt-1 text-xs bg-orange-100 text-orange-700">{data.stats.tasksOverdue} overdue</Badge>
              )}
            </div>
            
            {data.nextMeeting && (
              <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                                   <div className="text-lg font-bold text-teal-600">{data.nextMeeting.timeUntilStart}</div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Next Meeting</div>
                {data.nextMeeting.isUrgent && (
                  <Badge variant="destructive" className="mt-1 text-xs">Starting Soon</Badge>
                )}
              </div>
            )}
            
            <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
              <div className="text-2xl font-bold text-teal-600">{data.stats.eventsToday}</div>
              <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Events Today</div>
            </div>
            
            {data.stats.habitCount !== '0/0' && (
              <div className="text-center p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                                 <div className="text-lg font-bold text-teal-600">{data.stats.habitProgress}%</div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Habits ({data.stats.habitCount})</div>
              </div>
            )}
          </div>

                     {/* Smart Insights */}
           {data.insights.length > 0 && (
             <div className="space-y-2">
               {data.insights.map((insight: SmartInsight, index: number) => (
                <div 
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    insight.type === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                    insight.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' :
                    insight.type === 'celebration' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                    insight.type === 'opportunity' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                                         'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800'
                  }`}
                >
                  <div className={`mt-0.5 ${
                    insight.type === 'urgent' ? 'text-red-600' :
                    insight.type === 'warning' ? 'text-amber-600' :
                    insight.type === 'celebration' ? 'text-green-600' :
                    insight.type === 'opportunity' ? 'text-blue-600' :
                                         'text-teal-600'
                  }`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--fg)] dark:text-gray-100">{insight.title}</p>
                    <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300">{insight.message}</p>
                  </div>
                  {insight.actionable && insight.action && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={insight.action}
                      className="text-xs"
                    >
                      {insight.actionLabel}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
              <Zap className="w-5 h-5 text-yellow-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, index) => (
                                 <Button
                   key={index}
                   variant={action.variant || 'ghost'}
                   size="sm"
                   onClick={action.action}
                   className="justify-start text-sm"
                 >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Sections (expandable) */}
      <div className="space-y-2">
        {/* Next Meeting Detail */}
        {data.nextMeeting && (
          <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-[var(--fg)] dark:text-gray-100">{data.nextMeeting.summary}</p>
                    <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300">
                      in {data.nextMeeting.timeUntilStart}
                      {data.nextMeeting.location && ` • ${data.nextMeeting.location}`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => window.open('/calendar', '_blank')}>
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Condensed Task List */}
        {data.incompleteTasks.length > 0 && (
          <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
            <CardContent className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-[var(--fg)] dark:text-gray-100">
                    Tasks ({data.incompleteTasks.length})
                  </span>
                  {data.urgentTasks.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{data.urgentTasks.length} urgent</Badge>
                  )}
                </div>
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${
                    expandedSection === 'tasks' ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSection === 'tasks' && (
                <div className="mt-3 space-y-2">
                  {data.incompleteTasks.slice(0, 5).map((task: any, index: number) => (
                    <div key={index} className={`flex items-center gap-2 p-2 rounded ${
                      data.urgentTasks.includes(task) ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        data.urgentTasks.includes(task) ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-[var(--fg)] dark:text-gray-100 flex-1">
                        {task.text || 'Untitled task'}
                      </span>
                      {data.urgentTasks.includes(task) && (
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  ))}
                  {data.incompleteTasks.length > 5 && (
                    <p className="text-xs text-[var(--fg-muted)] dark:text-gray-400 text-center">
                      +{data.incompleteTasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Events (if any) */}
        {data.todayEvents.length > 0 && (
          <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
            <CardContent className="p-4">
              <button
                onClick={() => setExpandedSection(expandedSection === 'events' ? null : 'events')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-[var(--fg)] dark:text-gray-100">
                    Today's Events ({data.todayEvents.length})
                  </span>
                </div>
                <ChevronRight 
                  className={`w-4 h-4 transition-transform ${
                    expandedSection === 'events' ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSection === 'events' && (
                <div className="mt-3 space-y-2">
                  {data.todayEvents.slice(0, 4).map((event: CalendarEvent, index: number) => {
                    const eventTime = event.start instanceof Date ? event.start : 
                      new Date(event.start?.dateTime || event.start?.date || '');
                    const timeStr = formatInTimeZone(eventTime, Intl.DateTimeFormat().resolvedOptions().timeZone, 'h:mm a');
                    
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-[var(--fg-muted)] dark:text-gray-400 w-16">{timeStr}</span>
                        <span className="text-sm text-[var(--fg)] dark:text-gray-100 flex-1">
                          {event.summary || 'Untitled Event'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* FloCat Footer */}
              <div className="text-center p-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg border border-teal-200 dark:border-teal-700">
          <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300 italic">
            🐱 FloHub AI insights • Last updated {data.lastUpdated.toLocaleTimeString()}
          </p>
        </div>
    </div>
  );
};

export default memo(SmartAtAGlanceWidget);