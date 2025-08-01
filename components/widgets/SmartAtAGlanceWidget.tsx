import React, { useState, useEffect, useCallback, memo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import type { WidgetProps } from '@/types/app';
import {
  fetchTasks,
} from '@/lib/widgetFetcher';
import {
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/habitServiceAPI';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Target,
  ChevronRight,
  Calendar,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Star,
  Timer,
  BookOpen
} from 'lucide-react';
import type { CalendarEvent } from '../../types/calendar';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';
import type { Task, UserSettings } from '../../types/app';
import useSWR from 'swr';

interface SmartInsight {
  type: 'urgent' | 'opportunity' | 'celebration' | 'suggestion' | 'warning';
  title: string;
  message: string;
  icon: React.ReactNode;
  actionable?: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface FloCatMessage {
  greeting: string;
  insights: string[];
  mood: 'happy' | 'concerned' | 'excited' | 'calm' | 'focused';
}

const SmartAtAGlanceWidget = ({ size = 'medium', colSpan = 4, isCompact = false, isHero = false }: WidgetProps = {}) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    tasks: { total: number; incomplete: number; urgent: number };
    events: { today: number; next: { summary: string; startTime: Date; timeUntilStart: string; isUrgent: boolean; location?: string } | null };
    habits: { total: number; completed: number; completionRate: number };
    suggestions: SmartInsight[];
    floCatMessage: FloCatMessage;
  } | null>(null);

  // Fetch user settings for FloCat personality
  const { data: userSettings } = useSWR<UserSettings>(
    user ? "/api/userSettings" : null,
    (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())
  );

  // Use shared calendar context
  const {
    events: calendarEvents,
  } = useCalendarContext();

      // Generate FloCat message based on data analysis and user personality settings
  const generateFloCatMessage = useCallback((tasks: Task[], events: CalendarEvent[]): FloCatMessage => {
    const now = new Date();
    const hour = now.getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const preferredName = userSettings?.preferredName || user?.name || user?.email?.split('@')[0] || 'there';

    // Get FloCat personality settings
    const floCatStyle = userSettings?.floCatStyle || 'default';
    const floCatPersonality = userSettings?.floCatPersonality || [];

    // Analyze the day
    const incompleteTasks = tasks.filter(task => task && !task.done);
    const urgentTasks = incompleteTasks.filter(task => {
      if (!task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Check if due date is today or tomorrow
      return dueDate >= today && dueDate < tomorrow;
    });

    const todayEvents = events.filter(event => {
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
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return eventDate >= today && eventDate < tomorrow;
    });

    // Get remaining events for today (events that haven't started yet)
    const remainingEvents = todayEvents.filter(event => {
      let eventStart: Date;
      if (event.start instanceof Date) {
        eventStart = event.start;
      } else if (event.start?.dateTime) {
        eventStart = new Date(event.start.dateTime);
      } else {
        return false; // Skip all-day events for remaining count
      }
      return eventStart > now;
    });

    const workEvents = remainingEvents.filter(event => 
      event.summary?.toLowerCase().includes('meeting') ||
      event.summary?.toLowerCase().includes('standup') ||
      event.summary?.toLowerCase().includes('review') ||
      event.summary?.toLowerCase().includes('work') ||
      event.description?.includes('teams.microsoft.com') ||
      event.description?.includes('zoom.us')
    );

    const personalEvents = remainingEvents.filter(event => !workEvents.includes(event));

    // Determine mood and generate insights
    let mood: FloCatMessage['mood'] = 'calm';
    const insights: string[] = [];

    if (urgentTasks.length > 0) {
      mood = 'concerned';
      insights.push(`🚨 You have ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} that need immediate attention!`);
    }

    if (remainingEvents.length > 3) {
      mood = remainingEvents.length > 5 ? 'concerned' : 'excited';
      insights.push(`📅 Still ${remainingEvents.length} events left today. Consider blocking 15-min buffers between meetings.`);
    } else if (todayEvents.length > 0 && remainingEvents.length === 0) {
      mood = 'calm';
      insights.push(`✅ All events for today are complete! Great job staying on schedule.`);
    }

    if (workEvents.length > 0 && personalEvents.length > 0) {
      mood = 'happy';
      insights.push(`⚖️ Nice balance: ${workEvents.length} work and ${personalEvents.length} personal events remaining!`);
    }

    if (urgentTasks.length === 0 && remainingEvents.length === 0) {
      mood = 'focused';
      insights.push(`🎯 Clear schedule for the rest of today - perfect for deep work on your ${incompleteTasks.length} pending tasks!`);
    }

    // Next event timing
    const nextEvent = remainingEvents.find(event => {
      let eventTime: Date;
      if (event.start instanceof Date) {
        eventTime = event.start;
      } else {
        eventTime = new Date(event.start?.dateTime || event.start?.date || '');
      }
      return eventTime > now;
    });

    if (nextEvent) {
      let nextEventTime: Date;
      if (nextEvent.start instanceof Date) {
        nextEventTime = nextEvent.start;
      } else {
        nextEventTime = new Date(nextEvent.start?.dateTime || nextEvent.start?.date || '');
      }
      const timeUntilNext = nextEventTime.getTime() - now.getTime();
      const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
      const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hoursUntil === 0 && minutesUntil <= 15) {
        mood = 'concerned';
        insights.unshift(`⏰ "${nextEvent.summary}" starts in ${minutesUntil} minutes!`);
      } else if (hoursUntil <= 1) {
        insights.push(`⌚ "${nextEvent.summary}" in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minutesUntil}m - perfect time for a quick task!`);
      }
    }

    // FloCat personality responses based on user settings
    const getPersonalityGreeting = () => {
      const baseGreetings = {
        happy: [`${timeGreeting} ${preferredName}! 😸 Purr-fect timing for a great day!`, `Meow! ${timeGreeting}! 😺 Everything looks paw-sitively wonderful!`],
        concerned: [`${timeGreeting} ${preferredName}! 😾 Time to pounce on those urgent tasks!`, `Meow! ${timeGreeting}! 🙀 We've got some important items that need your claws on them!`],
        excited: [`${timeGreeting} ${preferredName}! 😸 Busy day ahead - let's tackle it paw by paw!`, `Purr-fect timing, ${preferredName}! 😺 Lots happening today, but you've got this!`],
        focused: [`${timeGreeting} ${preferredName}! 😌 Clear skies ahead - time for some deep focus work!`, `Meow! ${timeGreeting}! 🐱 Perfect day for productivity - your calendar is purr-fectly clear!`],
        calm: [`${timeGreeting} ${preferredName}! 😸 Looking good today - smooth sailing ahead!`, `Purr-fect! ${timeGreeting} ${preferredName}! 😺 Everything looks well under control!`]
      };

      // Apply personality style
      let greetings = baseGreetings[mood];
      
      if (floCatStyle === 'more_catty') {
        greetings = greetings.map(g => g.replace(/😸|😺|😾|🙀|😌|🐱/g, '😸').replace(/Meow!/g, 'Meow! 😸').replace(/Purr-fect/g, 'Purr-fect 😺'));
      } else if (floCatStyle === 'less_catty') {
        greetings = greetings.map(g => g.replace(/😸|😺|😾|🙀|😌|🐱/g, '').replace(/Meow!/g, 'Hello!').replace(/Purr-fect/g, 'Perfect'));
      } else if (floCatStyle === 'professional') {
        greetings = greetings.map(g => g.replace(/😸|😺|😾|🙀|😌|🐱/g, '').replace(/Meow!/g, 'Hello!').replace(/Purr-fect/g, 'Excellent').replace(/paw-sitively/g, 'positively'));
      }

      // Apply custom personality keywords
      if (floCatPersonality.length > 0) {
        const personalityKeyword = floCatPersonality[Math.floor(Math.random() * floCatPersonality.length)];
        greetings = greetings.map(g => g.replace(/😸|😺/, `😸 ${personalityKeyword}`));
      }

      return greetings[Math.floor(Math.random() * greetings.length)];
    };

    return {
      greeting: getPersonalityGreeting(),
      insights: insights.slice(0, 2), // Limit to 2 insights
      mood
    };
  }, [user, userSettings]);

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

  // Smart data analysis functions - memoized to prevent re-creation
  const analyzeData = useCallback((tasks: Task[], events: CalendarEvent[], habits: Habit[], habitCompletions: HabitCompletion[]) => {
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

      // Filter incomplete tasks (using correct Task type with 'done' property)
      const incompleteTasks = safeTasks.filter(task => task && !task.done);

      // Get urgent tasks (due today or tomorrow)
      const urgentTasks = incompleteTasks.filter(task => {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return dueDate >= today && dueDate < tomorrow;
      });

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

      // Get remaining events for today (events that haven't started yet)
      const remainingEvents = todayEvents.filter(event => {
        let eventStart: Date;
        if (event.start instanceof Date) {
          eventStart = event.start;
        } else if (event.start?.dateTime) {
          eventStart = new Date(event.start.dateTime);
        } else {
          return false; // Skip all-day events for remaining count
        }
        return eventStart > now;
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

      // Generate proactive suggestions
      const suggestions: SmartInsight[] = [];

      // Task-based suggestions
      if (urgentTasks.length > 0) {
        suggestions.push({
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
        suggestions.push({
          type: 'warning',
          title: 'Many Pending Tasks',
          message: `You have ${incompleteTasks.length} incomplete tasks - consider prioritizing the most important ones`,
          icon: <CheckSquare className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/tasks',
          actionLabel: 'Review Tasks'
        });
      }

      // Meeting insights
      if (nextMeeting) {
        if (nextMeeting.isUrgent) {
          suggestions.push({
            type: 'urgent',
            title: 'Meeting Starting Soon',
            message: `${nextMeeting.summary} starts in ${nextMeeting.timeUntilStart}`,
            icon: <Clock className="w-4 h-4" />,
            actionable: true,
            action: () => window.location.href = '/dashboard/meetings',
            actionLabel: 'View Meeting'
          });
        } else {
          suggestions.push({
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

      // Habit insights (only if habits exist)
      if (todayHabits.length > 0) {
        const completionRate = (completedHabits.length / todayHabits.length) * 100;
        
        if (completionRate === 100) {
          suggestions.push({
            type: 'celebration',
            title: 'Perfect Day!',
            message: 'All habits completed for today',
            icon: <Star className="w-4 h-4" />,
            actionable: true,
            action: () => window.location.href = '/habit-tracker',
            actionLabel: 'View Progress'
          });
        } else if (completionRate >= 50) {
          suggestions.push({
            type: 'opportunity',
            title: 'Good Progress',
            message: `${completedHabits.length} of ${todayHabits.length} habits completed`,
            icon: <TrendingUp className="w-4 h-4" />,
            actionable: true,
            action: () => window.location.href = '/habit-tracker',
            actionLabel: 'Complete More'
          });
        } else {
          suggestions.push({
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
        suggestions.push({
          type: 'celebration',
          title: 'All Caught Up!',
          message: 'No pending tasks or habits for today',
          icon: <CheckCircle className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/notes',
          actionLabel: 'Add Notes'
        });
      }

      // Proactive suggestions based on day analysis
      if (remainingEvents.length > 3) {
        suggestions.push({
          type: 'suggestion',
          title: 'Busy Day Ahead',
          message: `Still ${remainingEvents.length} events remaining - consider blocking time for focused work`,
          icon: <Timer className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/calendar',
          actionLabel: 'View Calendar'
        });
      }

      if (incompleteTasks.length > 3 && remainingEvents.length < 2) {
        suggestions.push({
          type: 'opportunity',
          title: 'Focus Opportunity',
          message: 'Clear schedule for the rest of today - perfect time to tackle your pending tasks',
          icon: <BookOpen className="w-4 h-4" />,
          actionable: true,
          action: () => window.location.href = '/dashboard/tasks',
          actionLabel: 'Start Working'
        });
      }

      return {
        tasks: {
          total: safeTasks.length,
          incomplete: incompleteTasks.length,
          urgent: urgentTasks.length
        },
        events: {
          today: remainingEvents.length,
          next: nextMeeting
        },
        habits: {
          total: todayHabits.length,
          completed: completedHabits.length,
          completionRate: todayHabits.length > 0 ? (completedHabits.length / todayHabits.length) * 100 : 0
        },
        suggestions,
        floCatMessage: generateFloCatMessage(safeTasks, safeEvents)
      };
    } catch (error) {
      console.error('Error analyzing smart widget data:', error);
      // Return safe default data structure
      return {
        tasks: { total: 0, incomplete: 0, urgent: 0 },
        events: { today: 0, next: null },
        habits: { total: 0, completed: 0, completionRate: 0 },
        suggestions: [],
        floCatMessage: {
          greeting: 'Hello there! 😸',
          insights: [],
          mood: 'calm' as const
        }
      };
    }
  }, [generateFloCatMessage]);

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
        const [tasks, habits, habitCompletions] = await Promise.allSettled([
          fetchTasks(),
          fetchHabits(),
          fetchHabitCompletions(currentYear, currentMonth)
        ]);

        // Extract successful results with fallbacks
        const safeTasks = tasks.status === 'fulfilled' ? tasks.value : [];
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

  // Determine layout based on widget size and hero status
  const isWideLayout = isHero || size === 'large' || colSpan > 4;
  const isCompactLayout = isCompact || size === 'small';
  const showFloCatHeader = !isCompactLayout;
  const showSuggestions = !isCompactLayout;

  return (
    <div className={`h-full flex flex-col ${isCompactLayout ? 'space-y-2' : 'space-y-4'}`}>
      {/* FloCat Header - Only show in non-compact layouts */}
      {showFloCatHeader && (
        <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
          <div className="flex-shrink-0">
            <img 
              src="/flohub_flocat.png" 
              alt="FloCat" 
              className="w-12 h-12 rounded-full"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-2xl hidden">
              😺
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-dark-base dark:text-soft-white mb-1">
              {data.floCatMessage?.greeting || 'Hello there! 😸'}
            </h3>
            {data.floCatMessage?.insights && data.floCatMessage.insights.length > 0 && (
              <div className="space-y-1">
                {data.floCatMessage.insights.map((insight: string, index: number) => (
                  <p key={index} className="text-xs text-grey-tint">
                    {insight}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Responsive layout */}
      <div className={`flex-1 ${isWideLayout ? 'grid grid-cols-2 gap-4' : 'flex flex-col space-y-4'}`}>
        {/* Left Side - Stats and FloCat (in wide layouts) */}
        <div className={`${isWideLayout ? '' : 'space-y-4'}`}>
          {/* Quick Stats - Only show cards with data */}
          <div className={`grid gap-3 ${
            isWideLayout 
              ? 'grid-cols-3' 
              : isCompactLayout 
                ? 'grid-cols-2' 
                : 'grid-cols-3'
          }`}>
            {/* Tasks Card - Always show if there are tasks */}
            {(data?.tasks?.total ?? 0) > 0 && (
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-2">
                  <CheckSquare className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
                  {data?.tasks?.incomplete ?? 0}
                </p>
                <p className="text-xs text-grey-tint">Tasks</p>
              </div>
            )}
            
            {/* Events Card - Always show if there are events */}
            {(data?.events?.today ?? 0) > 0 && (
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center w-8 h-8 bg-accent-100 dark:bg-accent-900/30 rounded-lg mx-auto mb-2">
                  <Calendar className="w-4 h-4 text-accent-500" />
                </div>
                <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
                  {data?.events?.today ?? 0}
                </p>
                <p className="text-xs text-grey-tint">Remaining</p>
              </div>
            )}
            
            {/* Habits Card - Only show if there are habits */}
            {(data?.habits?.total ?? 0) > 0 && (
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-center w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg mx-auto mb-2">
                  <Target className="w-4 h-4 text-primary-500" />
                </div>
                <p className="text-lg font-semibold text-dark-base dark:text-soft-white">
                  {data?.habits?.completed ?? 0}/{data?.habits?.total ?? 0}
                </p>
                <p className="text-xs text-grey-tint">Habits</p>
              </div>
            )}
          </div>

          {/* Next Meeting - Show in all layouts except when no next meeting */}
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

        {/* Right Side - Suggestions (in wide layouts) or below (in standard layouts) */}
        {showSuggestions && (
          <div className={`${isWideLayout ? 'space-y-2' : 'space-y-3'}`}>
            {data?.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0 ? (
              <div className={`grid gap-2 ${
                isWideLayout 
                  ? 'grid-cols-2' 
                  : 'grid-cols-1 md:grid-cols-2'
              }`}>
                {data.suggestions.slice(0, isWideLayout ? 4 : 4).map((suggestion: SmartInsight, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded-xl border ${
                      suggestion.type === 'urgent'
                        ? 'bg-accent-50 border-accent-200 dark:bg-accent-900/20 dark:border-accent-800'
                        : suggestion.type === 'celebration'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : suggestion.type === 'warning'
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : suggestion.type === 'suggestion'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      <div className={`p-1 rounded-lg flex-shrink-0 ${
                        suggestion.type === 'urgent'
                          ? 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300'
                          : suggestion.type === 'celebration'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : suggestion.type === 'warning'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          : suggestion.type === 'suggestion'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      }`}>
                        {suggestion.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-dark-base dark:text-soft-white truncate">
                          {suggestion.title}
                        </h4>
                        <p className="text-xs text-grey-tint mt-1 line-clamp-2">
                          {suggestion.message}
                        </p>
                        
                        {suggestion.actionable && suggestion.action && (
                          <button
                            onClick={suggestion.action}
                            className="mt-2 text-xs text-primary-500 hover:text-primary-600 transition-colors flex items-center space-x-1"
                          >
                            <span>{suggestion.actionLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-primary-500" />
                </div>
                <p className="text-grey-tint font-body text-sm">
                  All caught up! No suggestions to show.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(SmartAtAGlanceWidget);