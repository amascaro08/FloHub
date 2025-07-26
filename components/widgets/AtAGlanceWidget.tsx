'use client'

import React, { useState, useEffect, memo, useCallback } from 'react';
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
import useSWR from 'swr';
import type { CalendarEvent, Task, Note } from '../../types/calendar';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';

// Function to generate dashboard widget with FloCat suggestions
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
    // Check if event starts on tomorrow (between start of tomorrow and end of tomorrow)
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
    
    return eventDate >= tomorrow && eventDate < endOfTomorrow;
  });

  // Log recurring events for debugging
  const recurringEvents = events.filter(event => event.isRecurring);
  if (recurringEvents.length > 0) {
    console.log('AtAGlanceWidget: Found recurring events:', recurringEvents.map(e => ({
      summary: e.summary,
      isRecurring: e.isRecurring,
      seriesMasterId: e.seriesMasterId
    })));
  }

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

  return `<div class="dashboard-widget">
  <div class="flocat-header">
    <div class="flocat-avatar">😺</div>
    <div class="flocat-greeting">
      <h3>${randomGreeting}</h3>
      ${floCatInsights.length > 0 ? `<div class="flocat-insights">${floCatInsights.slice(0, 2).join('<br>')}</div>` : ''}
    </div>
  </div>
  
  <div class="dashboard-grid">
    <div class="dashboard-section">
      <h4>📋 Tasks (${incompleteTasks.length})</h4>
      <div class="items-list">
        ${incompleteTasks.length > 0 ? 
          incompleteTasks.slice(0, 4).map(task => 
            `<div class="item ${urgentTasks.includes(task) ? 'urgent' : ''}">
              <span class="item-text">${task.text || 'Untitled task'}</span>
              ${urgentTasks.includes(task) ? '<span class="urgent-badge">⚠️</span>' : ''}
            </div>`
          ).join('') 
          : '<div class="empty-state">No tasks 🎉</div>'
        }
      </div>
    </div>

    <div class="dashboard-section">
      <h4>📅 Today (${todayEvents.length})</h4>
      <div class="items-list">
        ${todayEvents.length > 0 ?
          todayEvents.slice(0, 4).map(event => {
            let time;
            if (event.start instanceof Date) {
              time = formatInTimeZone(event.start, userTimezone, 'h:mm a');
            } else {
              time = event.start?.dateTime ? 
                formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a') : 
                'All day';
            }
            const isWork = workEvents.includes(event);
            const recurringIcon = event.isRecurring ? '🔄' : '';
            return `<div class="item">
              <span class="item-time">${time}</span>
              <span class="item-text">${event.summary}</span>
              <span class="event-type">${isWork ? '💼' : '👤'}${recurringIcon}</span>
            </div>`;
          }).join('')
          : '<div class="empty-state">Free day! 🌅</div>'
        }
      </div>
    </div>

    <div class="dashboard-section">
      <h4>🎯 Habits (${completedHabits.length}/${habits.length})</h4>
      <div class="habits-progress">
        ${habits.length > 0 ? 
          `<div class="progress-bar">
            <div class="progress-fill" style="width: ${habits.length > 0 ? (completedHabits.length / habits.length) * 100 : 0}%"></div>
          </div>
          <div class="habits-list">
            ${habits.slice(0, 3).map(habit => {
              const isCompleted = completedHabits.some(h => h.id === habit.id);
              return `<div class="habit-item ${isCompleted ? 'completed' : ''}">
                <span class="habit-icon">${isCompleted ? '✅' : '⭕'}</span>
                <span class="habit-name">${habit.name}</span>
              </div>`;
            }).join('')}
          </div>` 
          : '<div class="empty-state">No habits tracked</div>'
        }
      </div>
    </div>

    <div class="dashboard-section">
      <h4>📈 Tomorrow (${tomorrowEvents.length})</h4>
      <div class="items-list">
        ${tomorrowEvents.length > 0 ?
          tomorrowEvents.slice(0, 3).map(event => {
            let time;
            if (event.start instanceof Date) {
              time = formatInTimeZone(event.start, userTimezone, 'h:mm a');
            } else {
              time = event.start?.dateTime ? 
                formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a') : 
                'All day';
            }
            const recurringIcon = event.isRecurring ? '🔄' : '';
            return `<div class="item preview">
              <span class="item-time">${time}</span>
              <span class="item-text">${event.summary}</span>
              <span class="event-type">${recurringIcon}</span>
            </div>`;
          }).join('')
          : '<div class="empty-state">Open schedule 📅</div>'
        }
      </div>
    </div>
  </div>

  <div class="flocat-footer">
    <span class="motivational-quote">
      ${priorityLevel === "urgent" ? "Remember: One paw at a time! 🐾" : 
        priorityLevel === "busy" ? "You're paw-sitively capable of handling this! 💪" :
        priorityLevel === "focus" ? "Time to show those tasks who's the cat! 😼" :
        "Purr-fect balance makes for a great day! ✨"}
    </span>
  </div>
</div>

<style>
.dashboard-widget {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 100%;
  margin: 0 auto;
}

.flocat-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.flocat-avatar {
  font-size: 2rem;
  margin-right: 12px;
}

.flocat-greeting h3 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.flocat-insights {
  font-size: 0.9rem;
  opacity: 0.95;
  line-height: 1.4;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.dashboard-section {
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px;
  padding: 16px;
}

.dashboard-section h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 6px;
  font-size: 0.85rem;
  position: relative;
}

.item.urgent {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.item.preview {
  opacity: 0.7;
}

.item-time {
  font-weight: 500;
  color: var(--text-secondary, #6b7280);
  margin-right: 8px;
  min-width: 60px;
}

.item-text {
  flex: 1;
  color: var(--text-primary, #1f2937);
}

.urgent-badge {
  margin-left: 8px;
}

.event-type {
  margin-left: 8px;
}

.empty-state {
  text-align: center;
  color: var(--text-secondary, #6b7280);
  font-style: italic;
  padding: 20px;
}

.habits-progress {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-bar {
  height: 8px;
  background: var(--bg-secondary, #f3f4f6);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.3s ease;
}

.habits-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.habit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
}

.habit-item.completed .habit-name {
  text-decoration: line-through;
  opacity: 0.7;
}

.flocat-footer {
  text-align: center;
  padding: 16px;
  background: var(--bg-secondary, #f9fafb);
  border-radius: 8px;
  font-style: italic;
  color: var(--text-secondary, #6b7280);
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .flocat-header {
    flex-direction: column;
    text-align: center;
  }
  
  .flocat-avatar {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>`;
}

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

const AtAGlanceWidget = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetData, setWidgetData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  const trackingHook = isClient ? useWidgetTracking('AtAGlanceWidget') : { trackInteraction: () => {} };

  // Use shared calendar context instead of individual hook
  const {
    events: calendarEvents,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCalendarContext();

  // Optimized data fetching with parallel requests and better error handling
  const fetchDataOptimized = useCallback(async () => {
    if (!user?.email) return;

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Create all fetch promises with individual timeout protection (excluding calendar events)
      const fetchPromises = [
        fetchTasks().catch(() => ({ tasks: [] })),
        fetchNotes().catch(() => ({ notes: [] })),
        fetchMeetings().catch(() => ({ meetings: [] })),
        fetchHabits().catch(() => ({ habits: [] })),
        fetchHabitCompletions(now.getFullYear(), now.getMonth() + 1).catch(() => ({ completions: [] }))
      ];

      // Execute all requests in parallel with timeout
      const [tasksData, notesData, meetingsData, habitsData, habitCompletionsData] = await Promise.allSettled(fetchPromises);

      // Process results with fallbacks
      const tasks = tasksData.status === 'fulfilled' ? tasksData.value || [] : [];
      const notes = notesData.status === 'fulfilled' ? notesData.value.notes || [] : [];
      const meetings = meetingsData.status === 'fulfilled' ? meetingsData.value.meetingNotes || [] : [];
      const habits = habitsData.status === 'fulfilled' ? habitsData.value || [] : [];
      const habitCompletions = habitCompletionsData.status === 'fulfilled' ? habitCompletionsData.value || [] : [];

      // Process events data with timezone conversion (using shared calendar events)
      const eventsInUserTimezone = calendarEvents.map((event: CalendarEvent) => {
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
            const eventDate = new Date(ev.start.date);
            const endOfWeek = new Date(oneWeekFromNow);
            endOfWeek.setDate(endOfWeek.getDate() + 1);
            
            return eventDate >= nowInUserTimezone && eventDate <= endOfWeek;
          }
        }
        return false;
      });

      // Generate widget content
      const widgetContent = generateDashboardWidget(
        tasks || [],
        upcomingEventsForPrompt,
                  habits || [],
          habitCompletions || [],
        user.name || user.email,
        userTimezone
      );

      setWidgetData({
        content: widgetContent,
        events: upcomingEventsForPrompt,
        tasks: tasks || [],
                  notes: notes || [],
          meetings: meetings || [],
          habits: habits || [],
                  habitCompletions: habitCompletions || [],
        lastUpdated: new Date()
      });

      setLastRefresh(new Date());
      setLoading(false);

    } catch (err) {
      console.error('Error fetching AtAGlance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  }, [user, calendarEvents]);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user?.email && !eventsLoading) {
      fetchDataOptimized();
    }
  }, [user, fetchDataOptimized, eventsLoading]);

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
    invalidateCache('tasks');
    invalidateCache('notes');
    invalidateCache('meetings');
    invalidateCache('habits');
    fetchDataOptimized();
  }, [fetchDataOptimized]);

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

  if (loading || eventsLoading) {
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
      className="at-a-glance-widget"
      onClick={() => trackingHook.trackInteraction('view_summary')}
    >
      <div dangerouslySetInnerHTML={{ __html: widgetData?.content }} />
    </div>
  );
};

export default memo(AtAGlanceWidget);