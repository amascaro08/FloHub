'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { marked } from 'marked'; // Import marked
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'; // Import formatInTimeZone and toZonedTime
import useSWR from 'swr'; // Import useSWR
import { Settings } from '../../pages/dashboard/settings'; // Import Settings type

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work"; // Add source tag
}

interface Task {
  id: string;
  text: string;
  done: boolean;
  source?: "personal" | "work"; // Add source tag
}

const AtAGlanceWidget: React.FC = () => {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";

  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user settings
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const { data: loadedSettings, error: settingsError } = useSWR<Settings>(session ? "/api/userSettings" : null, fetcher);

  // State for PowerAutomate URL, initialized from settings
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>("");

  // Update powerAutomateUrl when settings load
  useEffect(() => {
    if (loadedSettings?.powerAutomateUrl) {
      setPowerAutomateUrl(loadedSettings.powerAutomateUrl);
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

 useEffect(() => {
   const fetchData = async () => {
     setLoading(true);
     setError(null);

     const now = new Date();
     const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
     const currentTimeInterval = getTimeInterval(now, userTimezone);

     // Check for cached message
     const cachedMessage = localStorage.getItem('flohub.atAGlanceMessage');
     const cachedTimestamp = localStorage.getItem('flohub.atAGlanceTimestamp');
     const cachedInterval = localStorage.getItem('flohub.atAGlanceInterval');

     if (cachedMessage && cachedTimestamp && cachedInterval === currentTimeInterval) {
       // Use cached message if it's from the current time interval
       setAiMessage(cachedMessage);
       setLoading(false);
       console.log("AtAGlanceWidget: Using cached message for interval:", currentTimeInterval);
       return; // Exit fetchData, no need to refetch or regenerate
     }

     console.log("AtAGlanceWidget: Generating new message for interval:", currentTimeInterval);

     try {
       // Fetch upcoming events for today, including o365Url
       // Calculate start and end of day in the user's timezone, including the timezone offset

        // Calculate start and end of day in the user's timezone, including the timezone offset
        const startOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'00:00:00XXX');
        const endOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'23:59:59XXX');

        // Create Date objects from the timezone-aware strings and convert them to UTC ISO strings for the API
        const startOfTodayUTC = new Date(startOfTodayInTimezone).toISOString();
        const endOfTodayUTC = new Date(endOfTodayInTimezone).toISOString();

        // Construct calendarId query parameter from selectedCals
        const calendarIdQuery = loadedSettings?.selectedCals && loadedSettings.selectedCals.length > 0
          ? `&calendarId=${loadedSettings.selectedCals.map(id => encodeURIComponent(id)).join('&calendarId=')}`
          : ''; // If no calendars selected, don't add calendarId param (API defaults to primary)

        const eventsApiUrl = `/api/calendar?timeMin=${encodeURIComponent(startOfTodayUTC)}&timeMax=${encodeURIComponent(endOfTodayUTC)}&timezone=${encodeURIComponent(userTimezone)}${calendarIdQuery}${
          powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
        }`;

        const eventsRes = await fetch(eventsApiUrl);
        if (!eventsRes.ok) {
          throw new Error(`Error fetching events: ${eventsRes.statusText}`);
        }
       const eventsData: CalendarEvent[] = await eventsRes.json();
       console.log("AtAGlanceWidget: Fetched eventsData:", eventsData); // Add this log

       // Convert event times to user's timezone
       const eventsInUserTimezone = eventsData.map(event => {
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

       setUpcomingEvents(eventsInUserTimezone);

        // Fetch tasks
        const tasksRes = await fetch('/api/tasks');
        if (!tasksRes.ok) {
          throw new Error(`Error fetching tasks: ${tasksRes.statusText}`);
        }
        const tasksData: Task[] = await tasksRes.json();
        setTasks(tasksData);

        // Filter out completed tasks for the AI prompt
        const incompleteTasks = tasksData.filter(task => !task.done);


       // Filter out past events for the AI prompt, using times already converted to user's timezone
       const upcomingEventsForPrompt = eventsInUserTimezone.filter(ev => {
         if (ev.start.dateTime) {
           // Timed event - compare with current time in user's timezone
           const startTime = new Date(ev.start.dateTime);
           const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
           const nowInUserTimezone = new Date(formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX'));

           // Keep if start time is after or equal to the current time (both in user's timezone)
           // OR if end time exists and is after the current time (both in user's timezone)
           return startTime.getTime() >= nowInUserTimezone.getTime() || (endTime && endTime.getTime() > nowInUserTimezone.getTime());

         } else if (ev.start.date) {
           // All-day event - compare date with current date in user's timezone
           const eventDate = new Date(ev.start.date);
           // Set time to end of day in user's timezone for comparison to include today's all-day events
           const endOfEventDayInTimezone = new Date(formatInTimeZone(eventDate, userTimezone, 'yyyy-MM-dd\'T\'23:59:59XXX'));
           const nowInUserTimezone = new Date(formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX'));

           // Keep if the event date (end of day in user's timezone) is today or in the future compared to now (in user's timezone)
           return endOfEventDayInTimezone.getTime() >= nowInUserTimezone.getTime();
         }
         // Should not happen if data is well-formed, but filter out if no start time/date
         return false;
       });
        console.log("AtAGlanceWidget: upcomingEventsForPrompt:", upcomingEventsForPrompt); // Add this log

       // Generate AI message
       const prompt = `You are FloCat, an AI assistant with a friendly, sarcastic, and slightly quirky cat personality 🐾.\n\nGenerate a personalized "At A Glance" daily message for the user **${userName}**, based on the following information:\n\n### 🗓️ Upcoming Events Today:\n${upcomingEventsForPrompt.map(event => {
         // Format the time for display in the user's timezone
         const eventTime = event.start.dateTime
           ? formatInTimeZone(new Date(event.start.dateTime), userTimezone, 'h:mm a')
           : event.start.date; // All-day events use the date

         return `- ${event.summary} at ${eventTime} (${event.source || 'personal'})`;
       }).join('\n') || 'None'}\n\n### ✅ Incomplete Tasks:\n${incompleteTasks.map(task => `- ${task.text} (${task.source || 'personal'})`).join('\n') || 'None'}\n\n**Guidelines:**\n- The tone must be friendly, sarcastic, and a little mischievous (you're a cat, after all 😼).\n- Start with a warm and cheeky welcome to the user's day.\n- Summarize the "upcoming" schedule — **ONLY include events that haven't passed yet** (based on current time).\n- Separate **work** and **personal** tasks clearly under different headings.\n- Suggest a "Focus Task" for the user — ideally picking a high-priority incomplete task.\n- Use **Markdown** for formatting:\n  - **Bold** for section titles\n  - Bulleted lists for events and tasks\n- Include the event/task **source tag** in parentheses (e.g., "(work)" or "(personal)").\n- Add appropriate emojis throughout to keep it light-hearted.\n- Consider the **time of day** (e.g., morning greeting vs afternoon pep talk).\n\n**Tone examples:**\n- "Rise and shine, ${userName} 🐱☀️ — here's what the universe (and your calendar) have in store for you."\n- "Not to be dramatic, but you've got things to do, hooman. Here's your 'don't mess this up' list:"\n\nMake the message feel alive and *FloCat-like* while staying useful and clear!`;


        const aiRes = await fetch('/api/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ history: [], prompt }),
        });

        if (!aiRes.ok) {
          throw new Error(`Error generating AI message: ${aiRes.statusText}`);
        }

        const aiData = await aiRes.json();
        if (aiData.reply) {
          setAiMessage(aiData.reply);
        } else {
          setError("AI assistant did not return a message.");
        }

       // Store the new message and timestamp in localStorage
       localStorage.setItem('flohub.atAGlanceMessage', aiData.reply);
       localStorage.setItem('flohub.atAGlanceTimestamp', now.toISOString());
       localStorage.setItem('flohub.atAGlanceInterval', currentTimeInterval);

     } catch (err: any) {
       setError(err.message);
       console.error("Error fetching data or generating AI message for At A Glance widget:", err);
     } finally {
       setLoading(false);
     }
   };

    // Fetch data when session or powerAutomateUrl changes
   // Fetch data when session or loadedSettings changes, or when the time interval changes
   // We don't need powerAutomateUrl in dependencies anymore as it's handled by loadedSettings
   if (session && loadedSettings) { // Only fetch data if session and settings are loaded
      fetchData();
   }
 }, [session, loadedSettings]); // Refetch when session or loadedSettings changes

  if (loading) {
    return <div className="p-4 border rounded-lg shadow-sm">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 border rounded-lg shadow-sm text-red-500">Error: {error}</div>;
  }

  // Convert markdown to HTML
  const formattedMessage = aiMessage ? marked(aiMessage) : "FloCat is thinking...";

  return (
    <div className="p-4 border rounded-lg shadow-sm flex flex-col h-full justify-between">
      <div className="text-lg prose flex-1 overflow-auto" dangerouslySetInnerHTML={{ __html: formattedMessage }}>
        {/* Message will be rendered here by dangerouslySetInnerHTML */}
      </div>
      <p className="text-sm mt-2 self-end">- FloCat 😼</p>
    </div>
  );
};

export default AtAGlanceWidget;