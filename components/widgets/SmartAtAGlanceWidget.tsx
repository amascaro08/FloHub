'use client'

import React, { useState, useEffect, memo, useCallback } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import {
  fetchCalendarEvents,
  fetchTasks,
  fetchNotes,
  fetchMeetings,
  invalidateCache,
} from '@/lib/widgetFetcher';
import {
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/habitServiceAPI';
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
  CheckSquare,
  FileText,
  Star
} from 'lucide-react';

interface ProactiveSuggestion {
  type: 'habit_adjustment' | 'workflow_optimization' | 'time_management' | 'task_priority' | 'health_reminder' | 'productivity_tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    type: string;
    data: any;
  };
  reasoning: string;
  confidence: number;
}

interface SmartSummary {
  suggestions: ProactiveSuggestion[];
  insights: {
    taskPatterns: {
      completionRate: number;
      overdueTasks: number;
      commonTags: string[];
      preferredDays: string[];
    };
    habitPatterns: {
      strugglingHabits: any[];
      successfulHabits: any[];
      consistencyScores: { [habitId: string]: number };
    };
    timePatterns: {
      mostActiveHours: number[];
      mostProductiveDay: string;
    };
    productivity: {
      tasksPerDay: number;
      goalAchievementRate: number;
    };
  };
}

// Function to generate FloCat insights and personality
function generateFloCatInsights(
  tasks: any[],
  events: any[],
  habits: any[],
  habitCompletions: any[],
  preferredName: string,
  userTimezone: string
): { insights: string[], priorityLevel: string, greeting: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Filter out completed/done tasks first
  const incompleteTasks = tasks.filter(task => !(task.completed || task.done));
  
  // Analyze data for insights
  const urgentTasks = incompleteTasks.filter(task => 
    task.text?.toLowerCase().includes('urgent') ||
    task.text?.toLowerCase().includes('asap') ||
    task.text?.toLowerCase().includes('priority') ||
    task.text?.toLowerCase().includes('important') ||
    (task.dueDate && new Date(task.dueDate) <= tomorrow)
  );

  const todayEvents = events.filter(event => {
    let eventDate;
    if (event.start instanceof Date) {
      eventDate = event.start;
    } else {
      eventDate = new Date(event.start?.dateTime || event.start?.date || '');
    }
    return eventDate >= today && eventDate < tomorrow;
  });

  const tomorrowEvents = events.filter(event => {
    let eventDate;
    if (event.start instanceof Date) {
      eventDate = event.start;
    } else {
      eventDate = new Date(event.start?.dateTime || event.start?.date || '');
    }
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    
    return eventDate >= tomorrow && eventDate < endOfTomorrow;
  });

  // Identify work vs personal events
  const workEvents = todayEvents.filter(event => 
    event.summary?.toLowerCase().includes('meeting') ||
    event.summary?.toLowerCase().includes('standup') ||
    event.summary?.toLowerCase().includes('review') ||
    event.summary?.toLowerCase().includes('work') ||
    event.description?.includes('teams.microsoft.com') ||
    event.description?.includes('zoom.us')
  );

  const personalEvents = todayEvents.filter(event => !workEvents.includes(event));

  // Habit progress
  const todayFormatted = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
  const completedHabits = habits.filter(habit =>
    habitCompletions.some(c =>
      c.habitId === habit.id &&
      c.date === todayFormatted &&
      c.completed
    )
  );

  // Generate FloCat insights
  let floCatInsights = [];
  let priorityLevel = "calm";

  if (urgentTasks.length > 0) {
    floCatInsights.push(`🚨 **Priority Alert:** You have ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} that need immediate attention!`);
    priorityLevel = "urgent";
  }

  if (todayEvents.length > 3) {
    floCatInsights.push(`📅 **Busy Day Ahead:** ${todayEvents.length} events scheduled today. Consider 15-min buffers between meetings.`);
    priorityLevel = priorityLevel === "urgent" ? "urgent" : "busy";
  }

  if (workEvents.length > 0 && personalEvents.length > 0) {
    floCatInsights.push(`⚖️ **Balance Tip:** Nice mix of ${workEvents.length} work and ${personalEvents.length} personal events today!`);
  }

  if (urgentTasks.length === 0 && todayEvents.length === 0) {
    floCatInsights.push(`🎯 **Focus Opportunity:** Clear schedule today - perfect for deep work on your ${incompleteTasks.length} pending tasks!`);
    priorityLevel = "focus";
  }

  if (completedHabits.length === habits.length && habits.length > 0) {
    floCatInsights.push(`🌟 **Habit Champion:** All ${habits.length} habits completed today! You're on fire! 🔥`);
  } else if (completedHabits.length > 0) {
    floCatInsights.push(`💪 **Good Progress:** ${completedHabits.length}/${habits.length} habits done. Keep the momentum going!`);
  }

  // Next event timing
  const nextEvent = todayEvents.find(event => {
    let eventTime;
    if (event.start instanceof Date) {
      eventTime = event.start;
    } else {
      eventTime = new Date(event.start?.dateTime || event.start?.date || '');
    }
    return eventTime > now;
  });

  if (nextEvent) {
    let nextEventTime;
    if (nextEvent.start instanceof Date) {
      nextEventTime = nextEvent.start;
    } else {
      nextEventTime = new Date(nextEvent.start?.dateTime || nextEvent.start?.date || '');
    }
    const timeUntilNext = nextEventTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursUntil === 0 && minutesUntil <= 15) {
      floCatInsights.unshift(`⏰ **Heads Up:** "${nextEvent.summary}" starts in ${minutesUntil} minutes!`);
    } else if (hoursUntil <= 1) {
      floCatInsights.push(`⌚ **Coming Up:** "${nextEvent.summary}" in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minutesUntil}m - perfect time for a quick task!`);
    }
  }

  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // FloCat personality responses
  const floCatGreetings = {
    urgent: [`${timeGreeting} ${preferredName}! 😾 Time to pounce on those urgent tasks!`, `Meow! ${timeGreeting}! 🙀 We've got some important items that need your claws on them!`],
    busy: [`${timeGreeting} ${preferredName}! 😸 Busy day ahead - let's tackle it paw by paw!`, `Purr-fect timing, ${preferredName}! 😺 Lots happening today, but you've got this!`],
    focus: [`${timeGreeting} ${preferredName}! 😌 Clear skies ahead - time for some deep focus work!`, `Meow! ${timeGreeting}! 🐱 Perfect day for productivity - your calendar is purr-fectly clear!`],
    calm: [`${timeGreeting} ${preferredName}! 😸 Looking good today - smooth sailing ahead!`, `Purr-fect! ${timeGreeting} ${preferredName}! 😺 Everything looks well under control!`]
  };

  const randomGreeting = floCatGreetings[priorityLevel as keyof typeof floCatGreetings][Math.floor(Math.random() * floCatGreetings[priorityLevel as keyof typeof floCatGreetings].length)];

  return {
    insights: floCatInsights,
    priorityLevel,
    greeting: randomGreeting
  };
}

const SmartAtAGlanceWidget = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetData, setWidgetData] = useState<any>(null);
  const [smartSummary, setSmartSummary] = useState<SmartSummary | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  const trackingHook = isClient ? useWidgetTracking('SmartAtAGlanceWidget') : { trackInteraction: () => {} };

  // Optimized data fetching with parallel requests and better error handling
  const fetchDataOptimized = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Calculate proper time range for fetching events (today + next 7 days)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekFromNow = new Date(startOfToday);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      oneWeekFromNow.setHours(23, 59, 59, 999);

      // Build API parameters for calendar with required timeMin and timeMax
      const timeMin = startOfToday.toISOString();
      const timeMax = oneWeekFromNow.toISOString();
      let apiUrlParams = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true&userTimezone=${encodeURIComponent(userTimezone)}`;

      // Create all fetch promises with individual timeout protection
      const fetchPromises = [
        fetchCalendarEvents(`/api/calendar?${apiUrlParams}`, `calendar_${timeMin}_${timeMax}`).catch(() => []),
        fetchTasks().catch(() => ({ tasks: [] })),
        fetchNotes().catch(() => ({ notes: [] })),
        fetchMeetings().catch(() => ({ meetings: [] })),
        fetchHabits().catch(() => ({ habits: [] })),
        fetchHabitCompletions(now.getFullYear(), now.getMonth() + 1).catch(() => ({ completions: [] })),
        fetch('/api/assistant/smart-summary').then(res => res.ok ? res.json() : null).catch(() => null)
      ];

      // Execute all requests in parallel with timeout
      const [eventsData, tasksData, notesData, meetingsData, habitsData, habitCompletionsData, smartSummaryData] = await Promise.allSettled(fetchPromises);

      // Process results with fallbacks
      const events = eventsData.status === 'fulfilled' ? eventsData.value : [];
      const tasks = tasksData.status === 'fulfilled' ? tasksData.value : { tasks: [] };
      const notes = notesData.status === 'fulfilled' ? notesData.value : { notes: [] };
      const meetings = meetingsData.status === 'fulfilled' ? meetingsData.value : { meetings: [] };
      const habits = habitsData.status === 'fulfilled' ? habitsData.value : { habits: [] };
      const habitCompletions = habitCompletionsData.status === 'fulfilled' ? habitCompletionsData.value : { completions: [] };
      const smartSummary = smartSummaryData.status === 'fulfilled' ? smartSummaryData.value : null;

      // Process events data with timezone conversion
      const eventsInUserTimezone = events.map((event: any) => {
        let start: any = {};
        if (event.start instanceof Date) {
          start = { dateTime: formatInTimeZone(event.start, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
        } else {
          if (event.start.dateTime) {
            start = { dateTime: formatInTimeZone(toZonedTime(event.start.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
          } else if (event.start.date) {
            start = { date: event.start.date };
          }
        }
        
        let end: any = undefined;
        if (event.end) {
          if (event.end instanceof Date) {
            end = { dateTime: formatInTimeZone(event.end, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
          } else {
            if (event.end.dateTime) {
              end = { dateTime: formatInTimeZone(toZonedTime(event.end.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
            } else if (event.end.date) {
              end = { date: event.end.date };
            }
          }
        }

        return {
          ...event,
          start,
          end,
        };
      });

      // Filter upcoming events
      const upcomingEventsForPrompt = eventsInUserTimezone.filter((ev: any) => {
        const nowInUserTimezone = toZonedTime(now, userTimezone);
        const oneWeekFromNow = new Date(nowInUserTimezone);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        if (ev.start instanceof Date) {
          return ev.start.getTime() >= nowInUserTimezone.getTime() &&
                 ev.start.getTime() <= oneWeekFromNow.getTime();
        } else {
          if (ev.start.dateTime) {
            const startTime = toZonedTime(ev.start.dateTime, userTimezone);
            let endTime = null;
            
            if (ev.end) {
              if (ev.end instanceof Date) {
                endTime = ev.end;
              } else if (ev.end.dateTime) {
                endTime = toZonedTime(ev.end.dateTime, userTimezone);
              }
            }

            const hasNotEnded = !endTime || endTime.getTime() > nowInUserTimezone.getTime();
            const startsWithinNextWeek = startTime.getTime() <= oneWeekFromNow.getTime();
            const startsAfterNow = startTime.getTime() >= nowInUserTimezone.getTime();

            return hasNotEnded && startsWithinNextWeek && startsAfterNow;
          } else if (ev.start.date) {
            const eventDate = new Date(ev.start.date);
            const endOfWeek = new Date(oneWeekFromNow);
            endOfWeek.setDate(endOfWeek.getDate() + 1);
            
            return eventDate >= nowInUserTimezone && eventDate <= endOfWeek;
          }
        }
        return false;
      });

      // Generate FloCat insights
      const floCatData = generateFloCatInsights(
        tasks.tasks || [],
        upcomingEventsForPrompt,
        habits.habits || [],
        habitCompletions.completions || [],
        user.name || user.email,
        userTimezone
      );

      setWidgetData({
        events: upcomingEventsForPrompt,
        tasks: tasks.tasks || [],
        notes: notes.notes || [],
        meetings: meetings.meetings || [],
        habits: habits.habits || [],
        habitCompletions: habitCompletions.completions || [],
        floCatData,
        lastUpdated: new Date()
      });

      setSmartSummary(smartSummary);
      setLastRefresh(new Date());
      setLoading(false);

    } catch (err) {
      console.error('Error fetching SmartAtAGlance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, [user]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user?.email) {
      fetchDataOptimized();
    }
  }, [user, fetchDataOptimized]);

  // Background refresh every 5 minutes
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      fetchDataOptimized();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user, fetchDataOptimized]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    invalidateCache('calendar');
    invalidateCache('tasks');
    invalidateCache('notes');
    invalidateCache('meetings');
    invalidateCache('habits');
    fetchDataOptimized();
  }, [fetchDataOptimized]);

  const handleActionableSuggestion = async (suggestion: ProactiveSuggestion) => {
    if (!suggestion.actionable || !suggestion.action) return;

    try {
      // Execute the actionable suggestion
      const response = await fetch('/api/assistant/execute-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: suggestion.action,
          suggestionId: suggestion.title
        }),
      });

      if (response.ok) {
        // Refresh the data after action
        await fetchDataOptimized();
      }
    } catch (error) {
      console.error('Error executing suggestion:', error);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'habit_adjustment':
        return <Target className="w-4 h-4" />;
      case 'workflow_optimization':
        return <TrendingUp className="w-4 h-4" />;
      case 'time_management':
        return <Clock className="w-4 h-4" />;
      case 'task_priority':
        return <AlertTriangle className="w-4 h-4" />;
      case 'health_reminder':
        return <Heart className="w-4 h-4" />;
      case 'productivity_tip':
        return <Zap className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (error) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5" />
            Smart At a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--fg-muted)] dark:text-gray-300">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>FloCat is taking a quick nap 😴</p>
            <p className="text-sm mt-2">Having trouble gathering your information right now, but I'll keep trying!</p>
            <Button 
              variant="secondary" 
              onClick={fetchDataOptimized}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
            <Brain className="w-5 h-5" />
            Smart At a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
            <span className="ml-2 text-[var(--fg)] dark:text-gray-100">FloCat is preparing your dashboard...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!widgetData) {
    return null;
  }

  const { events, tasks, habits, habitCompletions, floCatData } = widgetData;
  const { insights, priorityLevel, greeting } = floCatData;

  // Filter data for display
  const incompleteTasks = tasks.filter((task: any) => !(task.completed || task.done));
  const urgentTasks = incompleteTasks.filter((task: any) => 
    task.text?.toLowerCase().includes('urgent') ||
    task.text?.toLowerCase().includes('asap') ||
    task.text?.toLowerCase().includes('priority') ||
    task.text?.toLowerCase().includes('important') ||
    (task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000))
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayEvents = events.filter((event: any) => {
    let eventDate;
    if (event.start instanceof Date) {
      eventDate = event.start;
    } else {
      eventDate = new Date(event.start?.dateTime || event.start?.date || '');
    }
    return eventDate >= today && eventDate < tomorrow;
  });

  const tomorrowEvents = events.filter((event: any) => {
    let eventDate;
    if (event.start instanceof Date) {
      eventDate = event.start;
    } else {
      eventDate = new Date(event.start?.dateTime || event.start?.date || '');
    }
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    return eventDate >= tomorrow && eventDate < endOfTomorrow;
  });

  const workEvents = todayEvents.filter((event: any) => 
    event.summary?.toLowerCase().includes('meeting') ||
    event.summary?.toLowerCase().includes('standup') ||
    event.summary?.toLowerCase().includes('review') ||
    event.summary?.toLowerCase().includes('work') ||
    event.description?.includes('teams.microsoft.com') ||
    event.description?.includes('zoom.us')
  );

  const personalEvents = todayEvents.filter((event: any) => !workEvents.includes(event));

  // Habit progress
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayFormatted = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
  const completedHabits = habits.filter((habit: any) =>
    habitCompletions.some((c: any) =>
      c.habitId === habit.id &&
      c.date === todayFormatted &&
      c.completed
    )
  );

  return (
    <div 
      className="space-y-4"
      onClick={() => trackingHook.trackInteraction('view_summary')}
    >
      {/* FloCat Header */}
      <Card className="w-full bg-gradient-to-r from-blue-500 to-purple-600 border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-white">
            <div className="text-2xl">😺</div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{greeting}</h3>
              {insights.length > 0 && (
                <p className="text-sm opacity-90 mt-1">
                  {insights[0]}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tasks */}
        <Card className="bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-[var(--fg)] dark:text-gray-100">Tasks</span>
            </div>
            <div className="text-2xl font-bold text-[var(--primary)]">{incompleteTasks.length}</div>
            {urgentTasks.length > 0 && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                {urgentTasks.length} urgent
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Events */}
        <Card className="bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-[var(--fg)] dark:text-gray-100">Today</span>
            </div>
            <div className="text-2xl font-bold text-[var(--primary)]">{todayEvents.length}</div>
            <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400 mt-1">
              {workEvents.length} work, {personalEvents.length} personal
            </div>
          </CardContent>
        </Card>

        {/* Habits */}
        <Card className="bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-[var(--fg)] dark:text-gray-100">Habits</span>
            </div>
            <div className="text-2xl font-bold text-[var(--primary)]">
              {completedHabits.length}/{habits.length}
            </div>
            <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400 mt-1">
              {habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0}% done
            </div>
          </CardContent>
        </Card>

        {/* Tomorrow */}
        <Card className="bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-[var(--fg)] dark:text-gray-100">Tomorrow</span>
            </div>
            <div className="text-2xl font-bold text-[var(--primary)]">{tomorrowEvents.length}</div>
            <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400 mt-1">
              events scheduled
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      {smartSummary && smartSummary.suggestions.length > 0 && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              AI Suggestions
              <Badge variant="secondary">{smartSummary.suggestions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {smartSummary.suggestions.slice(0, 3).map((suggestion, index) => (
              <div 
                key={index}
                className="border border-[var(--neutral-300)] dark:border-gray-600 rounded-lg p-4 hover:bg-[var(--neutral-50)] dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-[var(--fg)] dark:text-gray-100">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-[var(--fg)] dark:text-gray-100">{suggestion.title}</h4>
                      <Badge 
                        variant={getPriorityColor(suggestion.priority) as any}
                        className="text-xs"
                      >
                        {suggestion.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}% confident
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-[var(--fg-muted)] dark:text-gray-300">
                      {suggestion.message}
                    </p>
                    
                    {expandedSuggestion === index && (
                      <div className="space-y-2 pt-2 border-t border-[var(--neutral-300)] dark:border-gray-600">
                        <p className="text-xs text-[var(--fg-muted)] dark:text-gray-400 italic">
                          💡 {suggestion.reasoning}
                        </p>
                        
                        {suggestion.actionable && suggestion.action && (
                          <Button
                            size="sm"
                            onClick={() => handleActionableSuggestion(suggestion)}
                            className="mt-2"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Apply Suggestion
                          </Button>
                        )}
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === index ? null : index
                      )}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 transition-colors"
                    >
                      {expandedSuggestion === index ? 'Show Less' : 'Show More'}
                      <ChevronRight 
                        className={`w-3 h-3 transform transition-transform ${
                          expandedSuggestion === index ? 'rotate-90' : ''
                        }`} 
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Insights */}
      {smartSummary && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--fg)] dark:text-gray-100">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Task Completion Rate */}
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {Math.round(smartSummary.insights.taskPatterns.completionRate)}%
                </div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Task Completion</div>
              </div>

              {/* Tasks Per Day */}
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--primary)]">
                  {Math.round(smartSummary.insights.productivity.tasksPerDay * 10) / 10}
                </div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Tasks/Day</div>
              </div>

              {/* Most Productive Day */}
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--primary)]">
                  {smartSummary.insights.timePatterns.mostProductiveDay}
                </div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Best Day</div>
              </div>

              {/* Active Hours */}
              <div className="text-center">
                <div className="text-lg font-bold text-[var(--primary)]">
                  {smartSummary.insights.timePatterns.mostActiveHours.slice(0, 2).map(h => `${h}:00`).join(', ')}
                </div>
                <div className="text-xs text-[var(--fg-muted)] dark:text-gray-400">Peak Hours</div>
              </div>
            </div>

            {/* Overdue Tasks Warning */}
            {smartSummary.insights.taskPatterns.overdueTasks > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">
                    {smartSummary.insights.taskPatterns.overdueTasks} overdue tasks need attention
                  </span>
                </div>
              </div>
            )}

            {/* Habit Status */}
            {(smartSummary.insights.habitPatterns.strugglingHabits.length > 0 || 
              smartSummary.insights.habitPatterns.successfulHabits.length > 0) && (
              <div className="mt-4 space-y-2">
                {smartSummary.insights.habitPatterns.successfulHabits.length > 0 && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {smartSummary.insights.habitPatterns.successfulHabits.length} habits going strong!
                    </span>
                  </div>
                )}
                
                {smartSummary.insights.habitPatterns.strugglingHabits.length > 0 && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <Target className="w-4 h-4" />
                    <span className="text-sm">
                      {smartSummary.insights.habitPatterns.strugglingHabits.length} habits need attention
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Popular Tags */}
      {smartSummary && smartSummary.insights.taskPatterns.commonTags.length > 0 && (
        <Card className="w-full bg-white dark:bg-gray-800 border border-[var(--neutral-300)] dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--fg)] dark:text-gray-100">Popular Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {smartSummary.insights.taskPatterns.commonTags.map((tag, index) => (
                <Badge key={index} variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivational Footer */}
      <Card className="w-full bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-green-700 dark:text-green-300 italic">
            {priorityLevel === "urgent" ? "Remember: One paw at a time! 🐾" : 
              priorityLevel === "busy" ? "You're paw-sitively capable of handling this! 💪" :
              priorityLevel === "focus" ? "Time to show those tasks who's the cat! 😼" :
              "Purr-fect balance makes for a great day! ✨"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(SmartAtAGlanceWidget);