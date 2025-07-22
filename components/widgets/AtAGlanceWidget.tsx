'use client'

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { marked } from 'marked';
import { useWidgetTracking } from '@/lib/analyticsTracker';
import {
  fetchUserSettings,
  fetchCalendarEvents,
  fetchTasks,
  fetchNotes,
  fetchMeetings,
} from '@/lib/widgetFetcher';
import {
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/habitServiceAPI';
// Initialize marked with GFM options and ensure it doesn't return promises
marked.setOptions({
  gfm: true,
  async: false
});
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { isSameDay } from 'date-fns';
import useSWR from 'swr';
import type { UserSettings } from '../../types/app';
import type { CalendarEvent, Task, Note } from '../../types/calendar';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';

// Function to generate dashboard widget with FloCat suggestions
function generateDashboardWidget(
  tasks: any[], // Use any[] since the actual task structure differs from the type
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
    return eventDate >= tomorrow && eventDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
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
            return `<div class="item">
              <span class="item-time">${time}</span>
              <span class="item-text">${event.summary}</span>
              <span class="event-type">${isWork ? '💼' : '👤'}</span>
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
            <div class="progress-fill" style="width: ${(completedHabits.length / habits.length) * 100}%"></div>
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
            return `<div class="item preview">
              <span class="item-time">${time}</span>
              <span class="item-text">${event.summary}</span>
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

// Create a memoized markdown parser
const createMarkdownParser = () => {
  const parseMarkdown = (text: string): string => {
    try {
      const result = marked(text);
      return typeof result === 'string' ? result : '';
    } catch (err) {
      console.error("Error parsing markdown:", err);
      return text;
    }
  };
  return parseMarkdown;
};

// Memoized fetcher function for SWR
const fetcher = async (url: string) => {
  return fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) {
      throw new Error('Not authorized');
    }
    return res.json();
  });
};

const AtAGlanceWidget = () => {
const { user, isLoading } = useUser()
  
  if (isLoading) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  const userName = user?.name || "User";
  
  // Check if we're on the client side
  const isClient = typeof window !== 'undefined';
  
  // Track widget usage (client-side only)
  const trackingHook = isClient ? useWidgetTracking('AtAGlanceWidget') : { trackInteraction: () => {} };
  const { trackInteraction } = trackingHook;

  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]); 
  const [meetings, setMeetings] = useState<Note[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formattedHtml, setFormattedHtml] = useState<string>("FloCat is thinking...");
  const [dataFetchStarted, setDataFetchStarted] = useState(false);

  // Fetch user settings with SWR for caching
  const { data: loadedSettings, error: settingsError } = useSWR(
    user ? "/api/userSettings" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 } // Cache for 1 minute
  );

  // State for calendar sources, initialized from settings
  const [calendarSources, setCalendarSources] = useState<any[]>([]);
  const [selectedCals, setSelectedCals] = useState<string[]>([]);
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>("");

  // Memoize the markdown parser
  const parseMarkdown = useMemo(() => createMarkdownParser(), []);

  // Update calendar settings when settings load
  useEffect(() => {
    if (loadedSettings) {
      // Set PowerAutomate URL for backward compatibility
      if (loadedSettings.powerAutomateUrl) {
        setPowerAutomateUrl(loadedSettings.powerAutomateUrl);
      }
      
      // Set selected calendars for backward compatibility
      if (loadedSettings.selectedCals && loadedSettings.selectedCals.length > 0) {
        setSelectedCals(loadedSettings.selectedCals);
      }
      
      // Set calendar sources if available
      if (loadedSettings.calendarSources && loadedSettings.calendarSources.length > 0) {
        setCalendarSources(loadedSettings.calendarSources.filter((source: any) => source.isEnabled));
      }
    }
  }, [loadedSettings]);

  // Function to determine the current time interval (morning, lunch, evening)
  const getTimeInterval = (date: Date, timezone: string): 'morning' | 'lunch' | 'evening' | 'other' => {
    const hour = parseInt(formatInTimeZone(date, timezone, 'HH'), 10);
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'lunch';
    if (hour >= 17 || hour < 5) return 'evening';
    return 'other'; // Should not happen with the current logic, but as a fallback
  };

  // Skip cache and always fetch fresh data
  useEffect(() => {
    if (!user || dataFetchStarted) return;
    
    try {
      // Clear any existing cache
      localStorage.removeItem('flohub.atAGlanceMessage');
      localStorage.removeItem('flohub.atAGlanceTimestamp');
      localStorage.removeItem('flohub.atAGlanceInterval');
      
      // Always set flag to start data fetching
      setDataFetchStarted(true);
      console.log("AtAGlanceWidget: Starting fresh data fetch");
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      setDataFetchStarted(true);
    }
  }, [user, dataFetchStarted]);

  // Main data fetching effect
  useEffect(() => {
    if (!user || !user.email || !loadedSettings || !dataFetchStarted) {
      console.log("AtAGlanceWidget: Waiting for user and settings", { 
        hasUser: !!user, 
        hasEmail: !!user?.email, 
        hasSettings: !!loadedSettings, 
        dataFetchStarted 
      });
      return;
    }
    
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      setAiMessage(null); // Clear previous message while loading

      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentTimeInterval = getTimeInterval(now, userTimezone);

      console.log("AtAGlanceWidget: Fetching data for interval:", currentTimeInterval);

      try {
        // Calculate start and end of day in the user's timezone
        const startOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'00:00:00XXX');
        const endOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'23:59:59XXX');

        // Convert to UTC ISO strings for the API
        const startOfTodayUTC = new Date(startOfTodayInTimezone).toISOString();
        const endOfTodayUTC = new Date(endOfTodayInTimezone).toISOString();

        // Determine whether to use new calendar sources or legacy settings
        let apiUrlParams = `timeMin=${encodeURIComponent(startOfTodayUTC)}&timeMax=${encodeURIComponent(endOfTodayUTC)}&timezone=${encodeURIComponent(userTimezone)}`;
        
        // If we have calendar sources, use them
        if (calendarSources && calendarSources.length > 0) {
          apiUrlParams += `&useCalendarSources=true`;
        } else {
          // Otherwise fall back to legacy settings
          const calendarIdQuery = loadedSettings?.selectedCals && loadedSettings.selectedCals.length > 0
            ? `&calendarId=${loadedSettings.selectedCals.map((id: string) => encodeURIComponent(id)).join('&calendarId=')}`
            : '';
          
          apiUrlParams += calendarIdQuery;
          
          // Add PowerAutomate URL if available
          if (loadedSettings?.powerAutomateUrl) {
            apiUrlParams += `&o365Url=${encodeURIComponent(loadedSettings.powerAutomateUrl)}`;
          }
        }
        
        // Fetch data in parallel using Promise.all with enhanced fetcher
        const [eventsResponse, tasksData, notesData, meetingsData] = await Promise.all([
          // Fetch calendar events with enhanced fetcher
          fetchCalendarEvents(`/api/calendar?${apiUrlParams}`, `flohub:calendar:${apiUrlParams}`).catch(() => []),
          
          // Fetch tasks with enhanced fetcher
          fetchTasks().catch(() => ({ tasks: [] })),
          
          // Fetch notes with enhanced fetcher
          fetchNotes().catch(() => ({ notes: [] })),
          
          // Fetch meetings with enhanced fetcher
          fetchMeetings().catch(() => ({ meetings: [] }))
        ]);

        // Handle both response formats: direct array or {events: [...]} object
        // Extract events array from response
        const eventsData = eventsResponse || [];
        
        console.log("Events data retrieved:", eventsData.length, "events");

        // Process events data
        const eventsInUserTimezone = eventsData.map((event: CalendarEvent) => {
          // Handle start date/time based on type
          let start: any = {};
          if (event.start instanceof Date) {
            start = { dateTime: formatInTimeZone(event.start, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
          } else {
            // It's a CalendarEventDateTime
            if (event.start.dateTime) {
              start = { dateTime: formatInTimeZone(toZonedTime(event.start.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
            } else if (event.start.date) {
              start = { date: event.start.date }; // All-day events don't need time conversion
            }
          }
          
          // Handle end date/time based on type
          let end: any = undefined;
          if (event.end) {
            if (event.end instanceof Date) {
              end = { dateTime: formatInTimeZone(event.end, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
            } else {
              // It's a CalendarEventDateTime
              if (event.end.dateTime) {
                end = { dateTime: formatInTimeZone(toZonedTime(event.end.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') };
              } else if (event.end.date) {
                end = { date: event.end.date }; // All-day events don't need time conversion
              }
            }
          }

          return {
            ...event,
            start,
            end,
          };
        });

                    // Update state with fetched data
        if (isMounted) {
          setUpcomingEvents(eventsInUserTimezone);
          const allTasks = tasksData.tasks || tasksData || [];
          setTasks(Array.isArray(allTasks) ? allTasks : []);
          setNotes(notesData.notes || notesData || []);
          setMeetings(meetingsData.meetings || meetingsData || []);
          console.log("AtAGlanceWidget: State updated - tasks:", allTasks.length);
        }

        // Fetch habits in a separate non-blocking call with enhanced fetcher
        try {
          // Use enhanced fetcher for habits
          const habitsData = await fetchHabits();
          if (isMounted) setHabits(habitsData || []);
          
          // Fetch habit completions for the current month
          const today = new Date();
          const completionsData = await fetchHabitCompletions(
            today.getFullYear(),
            today.getMonth()
          );
          if (isMounted) setHabitCompletions(completionsData || []);
        } catch (err) {
          console.log("Error fetching habits:", err);
          // Don't fail the whole widget if habits can't be fetched
        }

        // Filter out completed tasks for the AI prompt
        const allTasks = tasksData.tasks || tasksData || [];
        const incompleteTasks = Array.isArray(allTasks) ? allTasks.filter((task: Task) => !task.completed) : [];
        console.log("AtAGlanceWidget: All tasks:", allTasks.length, "Incomplete tasks:", incompleteTasks.length);
        console.log("AtAGlanceWidget: Tasks data structure:", tasksData);

        // Filter out past events for the AI prompt - include events for the next 7 days
        const upcomingEventsForPrompt = eventsInUserTimezone.filter((ev: CalendarEvent) => {
          const nowInUserTimezone = toZonedTime(now, userTimezone);
          
          // Create a date 7 days from now for the filter window
          const oneWeekFromNow = new Date(nowInUserTimezone);
          oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

          // Handle Date or CalendarEventDateTime
          if (ev.start instanceof Date) {
            // It's a Date object
            return ev.start.getTime() >= nowInUserTimezone.getTime() &&
                   ev.start.getTime() <= oneWeekFromNow.getTime();
          } else {
            // It's a CalendarEventDateTime
            if (ev.start.dateTime) {
              // Timed event
              const startTime = toZonedTime(ev.start.dateTime, userTimezone);
              let endTime = null;
              
              if (ev.end) {
                if (ev.end instanceof Date) {
                  endTime = ev.end;
                } else if (ev.end.dateTime) {
                  endTime = toZonedTime(ev.end.dateTime, userTimezone);
                }
              }

              // Include if the event hasn't ended yet and starts within the next 7 days
              const hasNotEnded = !endTime || endTime.getTime() > nowInUserTimezone.getTime();
              const startsWithinNextWeek = startTime.getTime() <= oneWeekFromNow.getTime();
              const startsAfterNow = startTime.getTime() >= nowInUserTimezone.getTime();

              return hasNotEnded && startsWithinNextWeek && startsAfterNow;
            } else if (ev.start.date) {
              // All-day event
              const eventDate = toZonedTime(ev.start.date, userTimezone);
              
              // Include if the event date is within the next 7 days
              return eventDate.getTime() >= nowInUserTimezone.getTime() &&
                     eventDate.getTime() <= oneWeekFromNow.getTime();
            }
          }
          return false;
        });
        
        console.log("Upcoming events for prompt:", upcomingEventsForPrompt.length, "events found");

        // Clear any cached message to force a new one to be generated
        try {
          localStorage.removeItem('flohub.atAGlanceMessage');
          localStorage.removeItem('flohub.atAGlanceTimestamp');
          localStorage.removeItem('flohub.atAGlanceInterval');
          
          // Always generate a new message
          if (isMounted) {
            console.log("AtAGlanceWidget: Generating new message for interval:", currentTimeInterval);
            
            // Get today's date in YYYY-MM-DD format for habit completions
            const todayFormatted = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd');
            
            // Filter habits that should be completed today (limit to 5 for performance)
            const todaysHabits = habits.filter(habit => {
              const dayOfWeek = now.getDay(); // 0-6, Sunday-Saturday
              
              switch (habit.frequency) {
                case 'daily':
                  return true;
                case 'weekly':
                  return dayOfWeek === 0; // Sunday
                case 'custom':
                  // Check for customDays property, which might not be in the type definition
                  return (habit as any).customDays?.includes(dayOfWeek) || false;
                default:
                  return false;
              }
            }).slice(0, 5); // Limit to 5 habits to reduce prompt size
            
            // Check which habits are completed today
            const completedHabits = todaysHabits.filter(habit =>
              habitCompletions.some(c =>
                c.habitId === habit.id &&
                c.date === todayFormatted &&
                c.completed
              )
            );
            
            // Calculate habit completion rate
            const habitCompletionRate = todaysHabits.length > 0
              ? Math.round((completedHabits.length / todaysHabits.length) * 100)
              : 0;
            
            // Include more items in each category
            const limitedEvents = upcomingEventsForPrompt.slice(0, 5);
            const limitedTasks = incompleteTasks.slice(0, 5);
            
            console.log("Events for AI message:", limitedEvents.length);
            console.log("Tasks for AI message:", limitedTasks.length);
            
            // Get the user's FloCat style and personality preferences from settings
            const floCatStyle = loadedSettings?.floCatStyle || "default";
            const floCatPersonality = loadedSettings?.floCatPersonality || [];
            const preferredName = loadedSettings?.preferredName || userName;
            
            // Build personality traits string from keywords
            const personalityTraits = Array.isArray(floCatPersonality) && floCatPersonality.length > 0
              ? `Your personality traits include: ${floCatPersonality.join(", ")}.`
              : "";
            
            // Generate the appropriate prompt based on the FloCat style
            let styleInstruction = "";
            
            switch(floCatStyle) {
              case "more_catty":
                styleInstruction = `You are FloCat, an extremely playful and cat-like AI assistant. Use LOTS of cat puns, cat emojis (😺 😻 🐱), and cat-like expressions (like 'purr-fect', 'meow', 'paw-some'). Be enthusiastic and playful in your summary. ${personalityTraits}`;
                break;
              case "less_catty":
                styleInstruction = `You are FloCat, a helpful and friendly AI assistant. While you have a cat mascot, you should minimize cat puns and references. Focus on being helpful and friendly while only occasionally using a cat emoji (😺). ${personalityTraits}`;
                break;
              case "professional":
                styleInstruction = `You are FloCat, a professional and efficient AI assistant. Provide a concise, business-like summary with no cat puns, emojis, or playful language. Focus on delivering information clearly and efficiently. Use formal language. ${personalityTraits}`;
                break;
              default: // default style
                styleInstruction = `You are FloCat, an AI assistant with a friendly, sarcastic cat personality 🐾. ${personalityTraits}`;
            }
            


            // Generate dashboard widget with FloCat suggestions
            const dashboardContent = generateDashboardWidget(
              allTasks, // Pass all tasks, function will filter out completed ones
              upcomingEventsForPrompt,
              todaysHabits,
              habitCompletions,
              preferredName || userName,
              userTimezone
            );
            
            if (isMounted) {
              setFormattedHtml(dashboardContent);
              setLoading(false);
            }
        } catch (err) {
          console.error("Error accessing localStorage:", err);
          // Generate fallback content on localStorage error
          const fallbackContent = generateDashboardWidget(
            allTasks,
            upcomingEventsForPrompt,
            todaysHabits,
            habitCompletions,
            preferredName || userName,
            userTimezone
          );
          if (isMounted) {
            setFormattedHtml(fallbackContent);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          console.error("Error fetching data or generating dashboard widget:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch data when user and loadedSettings are available
    fetchData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user, loadedSettings, parseMarkdown, dataFetchStarted]); 

  let loadingMessage = "Planning your day...";
  if (loading) {
    // Determine a more specific loading message based on what's being fetched
    if (!loadedSettings) {
      loadingMessage = "Loading settings...";
    } else if (user && loadedSettings && !upcomingEvents.length && !tasks.length && !notes.length && !meetings.length) {
       loadingMessage = "Gathering your day's information...";
    } else if (user && loadedSettings && upcomingEvents.length > 0 && tasks.length === 0 && notes.length === 0 && meetings.length === 0) {
        loadingMessage = "Checking for tasks, notes, and meetings...";
    } else if (user && loadedSettings && upcomingEvents.length === 0 && tasks.length > 0 && notes.length === 0 && meetings.length === 0) {
        loadingMessage = "Checking for events, notes, and meetings...";
    } else {
        loadingMessage = "Compiling your daily summary...";
    }

    return <div className="p-4 border rounded-lg shadow-sm">{loadingMessage}</div>;
  }

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

   return (
     <div className="p-4 border rounded-lg shadow-sm flex flex-col h-full justify-between">
       <div className="text-lg flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: formattedHtml }}>
         {/* Message will be rendered here by dangerouslySetInnerHTML */}
       </div>
       <p className="text-sm mt-2 self-end">- FloCat 😼</p>
     </div>
   );
};

export default memo(AtAGlanceWidget);