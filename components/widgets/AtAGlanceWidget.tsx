'use client'

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useWidgetTracking } from '@/lib/analyticsTracker';
import {
  fetchCalendarEvents,
  fetchTasks,
  fetchNotes,
  fetchMeetings,
} from '@/lib/widgetFetcher';
import {
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/habitServiceAPI';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import useSWR from 'swr';
import type { CalendarEvent, Task, Note } from '../../types/calendar';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';

// Enhanced caching with SWR
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

// Cache keys for SWR
const CACHE_KEYS = {
  CALENDAR: 'ataglance-calendar',
  TASKS: 'ataglance-tasks',
  NOTES: 'ataglance-notes',
  MEETINGS: 'ataglance-meetings',
  HABITS: 'ataglance-habits',
  HABIT_COMPLETIONS: 'ataglance-habit-completions',
};

// Brand-compliant styling
const BRAND_STYLES = {
  primary: '#00C9A7', // FloTeal
  accent: '#FF6B6B',  // FloCoral
  dark: '#1E1E2F',    // Dark Base
  light: '#FDFDFD',   // Soft White
  grey: '#9CA3AF',    // Grey Tint
};

// Function to generate dashboard widget with FloCat insights
function generateDashboardWidget(
  tasks: any[],
  events: CalendarEvent[],
  habits: Habit[],
  habitCompletions: any[],
  preferredName: string,
  userTimezone: string
): string {
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

  // Find next meeting
  const currentTime = new Date();
  const nextMeeting = todayEvents
    .filter(event => {
      let eventTime;
      if (event.start instanceof Date) {
        eventTime = event.start;
      } else {
        eventTime = new Date(event.start?.dateTime || event.start?.date || '');
      }
      return eventTime > currentTime;
    })
    .sort((a, b) => {
      let aTime = a.start instanceof Date ? a.start : new Date(a.start?.dateTime || a.start?.date || '');
      let bTime = b.start instanceof Date ? b.start : new Date(b.start?.dateTime || b.start?.date || '');
      return aTime.getTime() - bTime.getTime();
    })[0];

  // Debug: Log next meeting info
  console.log('[AtAGlanceWidget] Next meeting:', nextMeeting ? {
    summary: nextMeeting.summary,
    start: nextMeeting.start,
    currentTime: currentTime
  } : 'No next meeting found');

  // Generate FloCat insights with brand voice
  let floCatInsights = [];
  let priorityLevel = "calm";

  if (urgentTasks.length > 0) {
    floCatInsights.push(`🚨 **Priority Alert:** You have ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} that need immediate attention!`);
    priorityLevel = "urgent";
  }

  if (todayEvents.length > 0) {
    const eventCount = todayEvents.length;
    const workCount = workEvents.length;
    const personalCount = personalEvents.length;
    
    if (workCount > 0 && personalCount > 0) {
      floCatInsights.push(`📅 **Today's Schedule:** ${workCount} work event${workCount > 1 ? 's' : ''} and ${personalCount} personal event${personalCount > 1 ? 's' : ''} on your plate.`);
    } else if (workCount > 0) {
      floCatInsights.push(`💼 **Work Mode:** ${workCount} work event${workCount > 1 ? 's' : ''} scheduled for today.`);
    } else {
      floCatInsights.push(`🎉 **Personal Day:** ${personalCount} personal event${personalCount > 1 ? 's' : ''} to look forward to!`);
    }
  }

  if (nextMeeting) {
    let meetingTime;
    if (nextMeeting.start instanceof Date) {
      meetingTime = nextMeeting.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } else {
      meetingTime = new Date(nextMeeting.start?.dateTime || nextMeeting.start?.date || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
    floCatInsights.push(`⏰ **Next Meeting:** "${nextMeeting.summary}" at ${meetingTime}`);
  } else {
    // Add a fallback message if no next meeting found
    floCatInsights.push(`📅 **Schedule:** No upcoming meetings for today.`);
  }

  if (tomorrowEvents.length > 0) {
    floCatInsights.push(`🔮 **Tomorrow:** ${tomorrowEvents.length} event${tomorrowEvents.length > 1 ? 's' : ''} already lined up.`);
  }

  if (habits.length > 0) {
    const completionRate = Math.round((completedHabits.length / habits.length) * 100);
    if (completionRate >= 80) {
      floCatInsights.push(`🌟 **Habit Hero:** ${completionRate}% of your habits completed today! You're crushing it!`);
    } else if (completionRate >= 50) {
      floCatInsights.push(`📈 **Making Progress:** ${completionRate}% of your habits done. Keep up the momentum!`);
    } else {
      floCatInsights.push(`💪 **Habit Check:** ${completedHabits.length}/${habits.length} habits completed. You've got this!`);
    }
  }

  if (incompleteTasks.length > 0) {
    const taskCount = incompleteTasks.length;
    if (taskCount <= 3) {
      floCatInsights.push(`✅ **Task Status:** Only ${taskCount} task${taskCount > 1 ? 's' : ''} left. You're almost there!`);
    } else if (taskCount <= 7) {
      floCatInsights.push(`📝 **Task Update:** ${taskCount} tasks remaining. Let's tackle them one by one!`);
    } else {
      floCatInsights.push(`📋 **Task Overview:** ${taskCount} tasks on your list. Time to prioritize!`);
    }
  }

  // Only show relevant sections
  const hasTasks = incompleteTasks.length > 0;
  const hasEvents = todayEvents.length > 0 || tomorrowEvents.length > 0;
  const hasHabits = habits.length > 0;

  // Generate HTML with brand-compliant styling
  const html = `
    <div class="at-a-glance-widget bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
      <!-- Header with FloCat branding -->
      <div class="flex items-center mb-6">
        <div class="w-10 h-10 bg-gradient-to-br from-[${BRAND_STYLES.primary}] to-[${BRAND_STYLES.accent}] rounded-full flex items-center justify-center mr-3 overflow-hidden">
          <img src="/flohub_flocat.png" alt="FloCat" class="w-8 h-8 object-contain" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white" style="font-family: 'Poppins', sans-serif;">
            Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${preferredName}!
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400" style="font-family: 'Inter', sans-serif;">
            Here's what FloCat found for you today
          </p>
        </div>
      </div>

      <!-- Priority Level Indicator -->
      <div class="mb-4 p-3 rounded-xl ${priorityLevel === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}">
        <div class="flex items-center">
          <span class="text-lg mr-2">${priorityLevel === 'urgent' ? '🚨' : '😺'}</span>
          <span class="text-sm font-medium ${priorityLevel === 'urgent' ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}">
            ${priorityLevel === 'urgent' ? 'High Priority Day' : 'Smooth Sailing'}
          </span>
        </div>
      </div>

      <!-- FloCat Insights -->
      ${floCatInsights.length > 0 ? `
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3" style="font-family: 'Poppins', sans-serif;">
            FloCat's Insights
          </h3>
          <div class="space-y-2">
            ${floCatInsights.map(insight => `
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-700 dark:text-gray-300" style="font-family: 'Inter', sans-serif;">
                  ${insight}
                </p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Tasks Section (only if there are tasks) -->
      ${hasTasks ? `
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center" style="font-family: 'Poppins', sans-serif;">
            <span class="mr-2">📝</span>
            Tasks (${incompleteTasks.length})
          </h3>
          <div class="space-y-2">
            ${incompleteTasks.slice(0, 3).map(task => `
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p class="text-sm text-gray-700 dark:text-gray-300" style="font-family: 'Inter', sans-serif;">
                  ${task.text}
                </p>
                ${task.dueDate ? `
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Due: ${new Date(task.dueDate).toLocaleDateString()}
                  </p>
                ` : ''}
              </div>
            `).join('')}
            ${incompleteTasks.length > 3 ? `
              <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                +${incompleteTasks.length - 3} more tasks
              </p>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Calendar Events Section (only if there are events) -->
      ${hasEvents ? `
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center" style="font-family: 'Poppins', sans-serif;">
            <span class="mr-2">📅</span>
            Today's Events (${todayEvents.length})
          </h3>
          <div class="space-y-2">
            ${todayEvents.slice(0, 3).map(event => `
              <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300" style="font-family: 'Inter', sans-serif;">
                  ${event.summary}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ${event.start instanceof Date ? 
                    event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                    new Date(event.start?.dateTime || event.start?.date || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  }
                </p>
              </div>
            `).join('')}
            ${todayEvents.length > 3 ? `
              <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                +${todayEvents.length - 3} more events
              </p>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Habits Section (only if there are habits) -->
      ${hasHabits ? `
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center" style="font-family: 'Poppins', sans-serif;">
            <span class="mr-2">🌟</span>
            Habit Progress (${completedHabits.length}/${habits.length})
          </h3>
          <div class="space-y-2">
            ${habits.slice(0, 3).map(habit => {
              const isCompleted = completedHabits.some(h => h.id === habit.id);
              return `
                <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div class="flex items-center justify-between">
                    <p class="text-sm text-gray-700 dark:text-gray-300" style="font-family: 'Inter', sans-serif;">
                      ${habit.name}
                    </p>
                    <span class="text-lg">${isCompleted ? '✅' : '⭕'}</span>
                  </div>
                </div>
              `;
            }).join('')}
            ${habits.length > 3 ? `
              <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
                +${habits.length - 3} more habits
              </p>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Footer with FloCat signature -->
      <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 dark:text-gray-400 text-center" style="font-family: 'Inter', sans-serif;">
          Powered by FloCat 😺 • Your day, your way
        </p>
      </div>
    </div>
  `;

  return html;
}

const AtAGlanceWidget = () => {
  const { user } = useUser();
  const { trackInteraction } = useWidgetTracking('ataglance');
  
  const [formattedHtml, setFormattedHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use SWR for efficient data fetching with caching
  const { data: userSettings } = useSWR(
    user ? `/api/userSettings?userId=${user.primaryEmail}` : null,
    fetcher,
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  );

  const { data: calendarData } = useSWR(
    user ? `${CACHE_KEYS.CALENDAR}-${user.primaryEmail}` : null,
    async () => {
      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneWeekFromNow = new Date(startOfToday);
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      oneWeekFromNow.setHours(23, 59, 59, 999);

      const timeMin = startOfToday.toISOString();
      const timeMax = oneWeekFromNow.toISOString();
      const apiUrlParams = `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true&userTimezone=${encodeURIComponent(userTimezone)}`;

      try {
        const eventsResponse = await fetchCalendarEvents(`/api/calendar?${apiUrlParams}`);
        return eventsResponse || [];
      } catch (error) {
        console.error('Calendar fetch error:', error);
        return [];
      }
    },
    {
      dedupingInterval: 120000, // 2 minutes
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );

  const { data: tasksData } = useSWR(
    user ? CACHE_KEYS.TASKS : null,
    () => fetchTasks(),
    {
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  );

  const { data: habitsData } = useSWR(
    user ? CACHE_KEYS.HABITS : null,
    () => fetchHabits(),
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  );

  const { data: habitCompletionsData } = useSWR(
    user ? CACHE_KEYS.HABIT_COMPLETIONS : null,
    async () => {
      const today = new Date();
      return fetchHabitCompletions(today.getFullYear(), today.getMonth());
    },
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      errorRetryCount: 2,
    }
  );

  // Memoized data processing
  const processedData = useMemo(() => {
    if (!user || !calendarData || !tasksData || !habitsData || !habitCompletionsData) {
      return null;
    }

    const now = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Process calendar events
    const eventsInUserTimezone = (calendarData || []).map((event: CalendarEvent) => {
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
    const upcomingEventsForPrompt = eventsInUserTimezone.filter((ev: CalendarEvent) => {
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
          const eventDate = toZonedTime(ev.start.date, userTimezone);
          return eventDate.getTime() >= nowInUserTimezone.getTime() &&
                 eventDate.getTime() <= oneWeekFromNow.getTime();
        }
      }
      return false;
    });

    return {
      events: upcomingEventsForPrompt,
      tasks: tasksData.tasks || tasksData || [],
      habits: habitsData || [],
      habitCompletions: habitCompletionsData || [],
    };
  }, [user, calendarData, tasksData, habitsData, habitCompletionsData]);

  // Generate widget content when data is ready
  useEffect(() => {
    if (!processedData || !user) {
      setLoading(true);
      return;
    }

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const preferredName = userSettings?.preferredName || user.primaryEmail?.split('@')[0] || 'User';
      
      // Debug: Log the data being processed
      console.log('[AtAGlanceWidget] Processing data:', {
        tasks: processedData.tasks?.length || 0,
        events: processedData.events?.length || 0,
        habits: processedData.habits?.length || 0,
        habitCompletions: processedData.habitCompletions?.length || 0
      });
      
      const dashboardContent = generateDashboardWidget(
        processedData.tasks,
        processedData.events,
        processedData.habits,
        processedData.habitCompletions,
        preferredName,
        userTimezone
      );
      
      setFormattedHtml(dashboardContent);
      setLoading(false);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error generating dashboard widget:", err);
      setLoading(false);
    }
  }, [processedData, user, userSettings]);

  if (error) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <div className="text-amber-600 dark:text-amber-400 mb-3">
          <h3 className="font-medium">FloCat is Taking a Quick Nap 😴</h3>
          <p className="text-sm mt-1">
            I'm having trouble gathering all your information right now, but I'll keep trying in the background!
          </p>
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          In the meantime, you can still access your:
          <ul className="mt-2 ml-4 list-disc">
            <li>Tasks and todo items</li>
            <li>Calendar events</li> 
            <li>Notes and meetings</li>
            <li>Habit tracking</li>
          </ul>
        </div>
        <p className="text-sm mt-3 text-right">- FloCat 😼</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-3"></div>
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
        </div>
        <p className="text-center text-gray-500 mt-4">FloCat is preparing your dashboard...</p>
      </div>
    );
  }

  return (
    <div 
      className="at-a-glance-widget h-full w-full flex flex-col overflow-hidden"
      onClick={() => trackInteraction('view_summary')}
    >
      <div 
        className="flex-1 overflow-auto p-4"
        dangerouslySetInnerHTML={{ __html: formattedHtml }} 
      />
    </div>
  );
};

export default memo(AtAGlanceWidget);