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
  fetchHabits,
  fetchHabitCompletions
} from '@/lib/widgetFetcher';
// Initialize marked with GFM options and ensure it doesn't return promises
marked.setOptions({
  gfm: true,
  async: false
});
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { isSameDay } from 'date-fns';
import useSWR from 'swr';
import type { UserSettings } from '../../types/app';
import type { CalendarEvent, Task, Note, Habit, HabitCompletion } from '../../types/calendar';

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
  const userName = useUser() || "User";
  
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
    if (!user || !loadedSettings || !dataFetchStarted) return;
    
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
          fetchCalendarEvents(`/api/calendar?${apiUrlParams}`, `flohub:calendar:${apiUrlParams}`),
          
          // Fetch tasks with enhanced fetcher
          fetchTasks(),
          
          // Fetch notes with enhanced fetcher
          fetchNotes(),
          
          // Fetch meetings with enhanced fetcher
          fetchMeetings()
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
          setTasks(tasksData.tasks || []);
          setNotes(notesData.notes || []);
          setMeetings(meetingsData.meetings || []);
        }

        // Fetch habits in a separate non-blocking call with enhanced fetcher
        try {
          // Use enhanced fetcher for habits
          const habitsData = await fetchHabits();
          if (isMounted) setHabits(habitsData.habits || []);
          
          // Fetch habit completions for the current month
          const today = new Date();
          const completionsData = await fetchHabitCompletions(
            today.getFullYear(),
            today.getMonth()
          );
          if (isMounted) setHabitCompletions(completionsData.completions || []);
        } catch (err) {
          console.log("Error fetching habits:", err);
          // Don't fail the whole widget if habits can't be fetched
        }

        // Filter out completed tasks for the AI prompt
        const incompleteTasks = tasksData.tasks ? tasksData.tasks.filter((task: Task) => !task.completed) : [];
        console.log("Incomplete tasks found:", incompleteTasks.length);

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
            
            // Generate AI message with a more compact prompt
            const prompt = `${styleInstruction}
Generate a short "At A Glance" message for ${preferredName} with:

EVENTS: ${limitedEvents.map((event: CalendarEvent) => {
  // Check if event has the required properties
  if (!event || !(event.summary || event.title) || !event.start) {
    console.warn("Invalid event format:", event);
    return null; // Skip this event
  }

  let eventTime;
  if (event.start instanceof Date) {
    eventTime = formatInTimeZone(event.start, userTimezone, 'h:mm a');
  } else {
    eventTime = event.start.dateTime
      ? formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a')
      : event.start.date;
  }
  
  const eventTitle = event.summary || event.title || 'Untitled Event';
  const calendarType = event.source === "work" ? "work" : "personal";
  const calendarTags = event.tags && event.tags.length > 0 ? ` (${event.tags.join(', ')})` : '';
  return `${eventTitle} at ${eventTime} [${calendarType}${calendarTags}]`;
}).filter(item => item !== null).join(', ') || 'None'}

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
${upcomingEventsForPrompt.slice(0, 5).map((event: CalendarEvent) => {
  let eventTime;
  if (event.start instanceof Date) {
    eventTime = formatInTimeZone(event.start, userTimezone, 'h:mm a');
  } else {
    eventTime = event.start.dateTime
      ? formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a')
      : event.start.date;
  }
  
  const eventTitle = event.summary || event.title || 'Untitled Event';
  const calendarName = event.calendarName || (event.source === "work" ? "Work Calendar" : "Personal Calendar");
  const calendarTags = event.tags && event.tags.length > 0 ? ` (${event.tags.join(', ')})` : '';
  return `- ${eventTitle} at ${eventTime} - ${calendarName}${calendarTags}`;
}).join('\n')}
` : ''}

${incompleteTasks.length > 0 ? `
**Tasks to Complete:**
${incompleteTasks.slice(0, 5).map((task: Task) => `- ${task.text}`).join('\n')}
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