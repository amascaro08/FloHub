'use client'

import React, { useState, useEffect, memo, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { marked } from 'marked';
// Initialize marked with GFM options and ensure it doesn't return promises
marked.setOptions({
  gfm: true,
  async: false
});
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { isSameDay } from 'date-fns';
import useSWR from 'swr';
import type { UserSettings } from '../../types/app';
import type { Note } from '../../types/app';
import type { Habit, HabitCompletion } from '../../types/habit-tracker';


interface CalendarEvent {
  id: string;
  calendarId: string; // Calendar ID field
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work"; // "personal" = Google, "work" = O365
  description?: string; // Description field
  calendarName?: string; // Calendar name field
  tags?: string[]; // Tags field
}

interface Task {
  id: string;
  text: string;
  done: boolean;
  source?: "personal" | "work"; // Add source tag
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

// Memoized fetcher function
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const AtAGlanceWidget = () => {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";

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
  const { data: loadedSettings, error: settingsError } = useSWR<UserSettings>(
    session ? "/api/userSettings" : null, 
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
        setCalendarSources(loadedSettings.calendarSources.filter(source => source.isEnabled));
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

  // Check for cached message first before any data fetching
  useEffect(() => {
    if (!session || dataFetchStarted) return;
    
    try {
      const now = new Date();
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const currentTimeInterval = getTimeInterval(now, userTimezone);
      
      const cachedMessage = localStorage.getItem('flohub.atAGlanceMessage');
      const cachedTimestamp = localStorage.getItem('flohub.atAGlanceTimestamp');
      const cachedInterval = localStorage.getItem('flohub.atAGlanceInterval');
      
      if (cachedMessage && cachedTimestamp && cachedInterval === currentTimeInterval) {
        // Use cached message if it's from the current time interval
        setAiMessage(cachedMessage);
        setFormattedHtml(parseMarkdown(cachedMessage));
        setLoading(false);
        console.log("AtAGlanceWidget: Using cached message for interval:", currentTimeInterval);
      } else {
        // Set flag to start data fetching
        setDataFetchStarted(true);
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
      setDataFetchStarted(true);
    }
  }, [session, parseMarkdown, dataFetchStarted]);

  // Main data fetching effect
  useEffect(() => {
    if (!session || !loadedSettings || !dataFetchStarted) return;
    
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
        
        // Fetch data in parallel using Promise.all
        const [eventsData, tasksData, notesData, meetingsData] = await Promise.all([
          // Fetch calendar events
          fetch(`/api/calendar?${apiUrlParams}`).then(res => {
            if (!res.ok) throw new Error(`Error fetching events: ${res.statusText}`);
            return res.json();
          }),
          
          // Fetch tasks
          fetch('/api/tasks').then(res => {
            if (!res.ok) throw new Error(`Error fetching tasks: ${res.statusText}`);
            return res.json();
          }),
          
          // Fetch notes
          fetch('/api/notes').then(res => {
            if (!res.ok) throw new Error(`Error fetching notes: ${res.statusText}`);
            return res.json();
          }),
          
          // Fetch meetings
          fetch('/api/meetings').then(res => {
            if (!res.ok) throw new Error(`Error fetching meetings: ${res.statusText}`);
            return res.json();
          })
        ]);

        // Process events data
        const eventsInUserTimezone = eventsData.map((event: CalendarEvent) => {
          const start = event.start.dateTime
            ? { dateTime: formatInTimeZone(toZonedTime(event.start.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') }
            : event.start.date
              ? { date: event.start.date } // All-day events don't need time conversion
              : {};
          const end = event.end?.dateTime
            ? { dateTime: formatInTimeZone(toZonedTime(event.end.dateTime, userTimezone), userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX') }
            : event.end?.date
              ? { date: event.end.date } // All-day events don't need time conversion
              : undefined;

          return {
            ...event,
            start,
            end,
          };
        });

        // Update state with fetched data
        if (isMounted) {
          setUpcomingEvents(eventsInUserTimezone);
          setTasks(tasksData);
          setNotes(notesData);
          setMeetings(meetingsData);
        }

        // Fetch habits in a separate non-blocking call
        try {
          const habitsRes = await fetch('/api/habits');
          if (habitsRes.ok) {
            const habitsData: Habit[] = await habitsRes.json();
            if (isMounted) setHabits(habitsData);
            
            // Fetch habit completions for the current month
            const today = new Date();
            const habitCompletionsRes = await fetch(`/api/habits/completions?year=${today.getFullYear()}&month=${today.getMonth()}`);
            if (habitCompletionsRes.ok) {
              const completionsData: HabitCompletion[] = await habitCompletionsRes.json();
              if (isMounted) setHabitCompletions(completionsData);
            }
          }
        } catch (err) {
          console.log("Error fetching habits:", err);
          // Don't fail the whole widget if habits can't be fetched
        }

        // Filter out completed tasks for the AI prompt
        const incompleteTasks = tasksData.filter((task: Task) => !task.done);

        // Filter out past events for the AI prompt
        const upcomingEventsForPrompt = eventsInUserTimezone.filter((ev: CalendarEvent) => {
          const nowInUserTimezone = toZonedTime(now, userTimezone);

          if (ev.start.dateTime) {
            // Timed event
            const startTime = toZonedTime(ev.start.dateTime, userTimezone);
            const endTime = ev.end?.dateTime ? toZonedTime(ev.end.dateTime, userTimezone) : null;

            // Include if the event starts today AND has not ended yet
            const isToday = isSameDay(startTime, nowInUserTimezone);
            const hasNotEnded = !endTime || endTime.getTime() > nowInUserTimezone.getTime();

            return isToday && hasNotEnded;
          } else if (ev.start.date) {
            // All-day event
            const eventDate = toZonedTime(ev.start.date, userTimezone);
            // Include if the event date is today
            return isSameDay(eventDate, nowInUserTimezone);
          }
          return false;
        });

        // Check for cached message again after fetching data
        try {
          const cachedMessage = localStorage.getItem('flohub.atAGlanceMessage');
          const cachedTimestamp = localStorage.getItem('flohub.atAGlanceTimestamp');
          const cachedInterval = localStorage.getItem('flohub.atAGlanceInterval');

          if (cachedMessage && cachedTimestamp && cachedInterval === currentTimeInterval && isMounted) {
            // Use cached message if it's from the current time interval
            setAiMessage(cachedMessage);
            setFormattedHtml(parseMarkdown(cachedMessage));
            console.log("AtAGlanceWidget: Using cached message for interval:", currentTimeInterval);
          } else if (isMounted) {
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
                  return habit.customDays?.includes(dayOfWeek) || false;
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
            
            // Limit the number of items in each category to reduce prompt size
            const limitedEvents = upcomingEventsForPrompt.slice(0, 3);
            const limitedTasks = incompleteTasks.slice(0, 3);
            
            // Generate AI message with a more compact prompt
            const prompt = `You are FloCat, an AI assistant with a friendly, sarcastic cat personality 🐾.
Generate a short "At A Glance" message for ${userName} with:

EVENTS: ${limitedEvents.map((event: CalendarEvent) => {
  const eventTime = event.start.dateTime
    ? formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a')
    : event.start.date;
  const calendarType = event.source === "work" ? "work" : "personal";
  const calendarTags = event.tags && event.tags.length > 0 ? ` (${event.tags.join(', ')})` : '';
  return `${event.summary} at ${eventTime} [${calendarType}${calendarTags}]`;
}).join(', ') || 'None'}

TASKS: ${limitedTasks.map((task: Task) => task.text).join(', ') || 'None'}

HABITS: ${completedHabits.length}/${todaysHabits.length} completed (${habitCompletionRate}%)
${todaysHabits.map(habit => {
  const isCompleted = completedHabits.some(h => h.id === habit.id);
  return `${isCompleted ? '✅' : '⬜'} ${habit.name}`;
}).join(', ') || 'None'}

Be witty and brief (under 200 words). Use markdown formatting. Consider the time (${currentTimeInterval}).`;


            const aiRes = await fetch('/api/assistant', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ history: [], prompt }),
            });

            if (!aiRes.ok) {
              // If we get a timeout or other error, generate a simple message instead
              if (aiRes.status === 504) {
                console.warn("AI request timed out, using fallback message");
                const fallbackMessage = `# Hello ${userName}! 😺

## Your Day at a Glance

${upcomingEventsForPrompt.length > 0 ? `
**Upcoming Events:**
${upcomingEventsForPrompt.slice(0, 3).map((event: CalendarEvent) => {
  const eventTime = event.start.dateTime
    ? formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a')
    : event.start.date;
  const calendarName = event.calendarName || (event.source === "work" ? "Work Calendar" : "Personal Calendar");
  const calendarTags = event.tags && event.tags.length > 0 ? ` (${event.tags.join(', ')})` : '';
  return `- ${event.summary} at ${eventTime} - ${calendarName}${calendarTags}`;
}).join('\n')}
` : ''}

${incompleteTasks.length > 0 ? `
**Tasks to Complete:**
${incompleteTasks.slice(0, 3).map((task: Task) => `- ${task.text}`).join('\n')}
` : ''}

${todaysHabits.length > 0 ? `
**Habits Progress:** ${completedHabits.length}/${todaysHabits.length} completed
${todaysHabits.slice(0, 3).map(habit => {
  const isCompleted = completedHabits.some(h => h.id === habit.id);
  return `- ${isCompleted ? '✅' : '⬜'} ${habit.name}`;
}).join('\n')}
` : ''}

Have a purr-fect day!`;

                setAiMessage(fallbackMessage);
                setFormattedHtml(parseMarkdown(fallbackMessage));
                
                // Store the fallback message in localStorage
                try {
                  localStorage.setItem('flohub.atAGlanceMessage', fallbackMessage);
                  localStorage.setItem('flohub.atAGlanceTimestamp', now.toISOString());
                  localStorage.setItem('flohub.atAGlanceInterval', currentTimeInterval);
                } catch (err) {
                  console.error("Error saving to localStorage:", err);
                }
                
                return;
              }
              throw new Error(`Error generating AI message: ${aiRes.statusText}`);
            }

            const aiData = await aiRes.json();
            if (aiData.reply && isMounted) {
              setAiMessage(aiData.reply);
              // Pre-parse the markdown
              setFormattedHtml(parseMarkdown(aiData.reply));
              
              // Store the new message and timestamp in localStorage
              try {
                localStorage.setItem('flohub.atAGlanceMessage', aiData.reply);
                localStorage.setItem('flohub.atAGlanceTimestamp', now.toISOString());
                localStorage.setItem('flohub.atAGlanceInterval', currentTimeInterval);
              } catch (err) {
                console.error("Error saving to localStorage:", err);
              }
            } else if (isMounted) {
              setError("AI assistant did not return a message.");
            }
          }
        } catch (err) {
          console.error("Error accessing localStorage:", err);
        }


      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          console.error("Error fetching data or generating AI message for At A Glance widget:", err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Fetch data when session and loadedSettings are available
    fetchData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [session, loadedSettings, parseMarkdown, dataFetchStarted]); 

  let loadingMessage = "Planning your day...";
  if (loading) {
    // Determine a more specific loading message based on what's being fetched
    if (!loadedSettings) {
      loadingMessage = "Loading settings...";
    } else if (session && loadedSettings && !upcomingEvents.length && !tasks.length && !notes.length && !meetings.length) {
       loadingMessage = "Gathering your day's information...";
    } else if (session && loadedSettings && upcomingEvents.length > 0 && tasks.length === 0 && notes.length === 0 && meetings.length === 0) {
        loadingMessage = "Checking for tasks, notes, and meetings...";
    } else if (session && loadedSettings && upcomingEvents.length === 0 && tasks.length > 0 && notes.length === 0 && meetings.length === 0) {
        loadingMessage = "Checking for events, notes, and meetings...";
    } else {
        loadingMessage = "Compiling your daily summary...";
    }

    return <div className="p-4 border rounded-lg shadow-sm">{loadingMessage}</div>;
  }

  if (error) {
     return <div className="p-4 border rounded-lg shadow-sm text-red-500">Error: {error}</div>;
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