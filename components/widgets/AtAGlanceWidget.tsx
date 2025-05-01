'use client'

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { marked } from 'marked'; // Import marked
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone

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
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>(""); // State for PowerAutomate URL

  // Load calendar settings on mount to get PowerAutomate URL
  useEffect(() => {
    const raw = localStorage.getItem('flohub.calendarSettings');
    if (raw) {
      try {
        const settings = JSON.parse(raw);
        if (typeof settings.powerAutomateUrl === "string") {
          setPowerAutomateUrl(settings.powerAutomateUrl);
        }
      } catch (e) {
        console.error('Failed to parse calendar settings:', e);
      }
    }
  }, []);


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch upcoming events for today, including o365Url
        const now = new Date();
        const userTimezone = "Australia/Sydney"; // Using a standard IANA timezone name for AEST/AEDT

        // Calculate start and end of day in the user's timezone, including the timezone offset
        const startOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'00:00:00XXX');
        const endOfTodayInTimezone = formatInTimeZone(now, userTimezone, 'yyyy-MM-dd\'T\'23:59:59XXX');

        // Create Date objects from the timezone-aware strings and convert them to UTC ISO strings for the API
        const startOfTodayUTC = new Date(startOfTodayInTimezone).toISOString();
        const endOfTodayUTC = new Date(endOfTodayInTimezone).toISOString();

        const eventsApiUrl = `/api/calendar?timeMin=${encodeURIComponent(startOfTodayUTC)}&timeMax=${encodeURIComponent(endOfTodayUTC)}&timezone=${encodeURIComponent(userTimezone)}${
          powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
        }`;

        const eventsRes = await fetch(eventsApiUrl);
        if (!eventsRes.ok) {
          throw new Error(`Error fetching events: ${eventsRes.statusText}`);
        }
        const eventsData: CalendarEvent[] = await eventsRes.json();
        console.log("AtAGlanceWidget: Fetched eventsData:", eventsData); // Add this log
        setUpcomingEvents(eventsData);

        // Fetch tasks
        const tasksRes = await fetch('/api/tasks');
        if (!tasksRes.ok) {
          throw new Error(`Error fetching tasks: ${tasksRes.statusText}`);
        }
        const tasksData: Task[] = await tasksRes.json();
        setTasks(tasksData);

        // Filter out completed tasks for the AI prompt
        const incompleteTasks = tasksData.filter(task => !task.done);


        // Filter out past events for the AI prompt
        const upcomingEventsForPrompt = eventsData.filter(ev => {
          if (ev.start.dateTime) {
            // Timed event
            const startTime = new Date(ev.start.dateTime);
            const endTime = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
            // Keep if start is in future OR (if end exists and end is in future)
            return startTime.getTime() >= now.getTime() || (endTime && endTime.getTime() > now.getTime());
          } else if (ev.start.date) {
            // All-day event
            const eventDate = new Date(ev.start.date);
            // Set time to end of day for comparison to include today's all-day events
            eventDate.setHours(23, 59, 59, 999);
            // Keep if the date is today or in the future
            return eventDate.getTime() >= now.getTime();
          }
          // Should not happen if data is well-formed, but filter out if no start time/date
          return false;
        });
        console.log("AtAGlanceWidget: upcomingEventsForPrompt:", upcomingEventsForPrompt); // Add this log

        // Generate AI message
        const prompt = `You are FloCat, an AI assistant with a friendly, sarcastic, and slightly quirky cat personality 🐾.\n\nGenerate a personalized "At A Glance" daily message for the user **${userName}**, based on the following information:\n\n### 🗓️ Upcoming Events Today:\n${upcomingEventsForPrompt.map(event => `- ${event.summary} at ${event.start.dateTime || event.start.date} (${event.source || 'personal'})`).join('\n') || 'None'}\n\n### ✅ Incomplete Tasks:\n${incompleteTasks.map(task => `- ${task.text} (${task.source || 'personal'})`).join('\n') || 'None'}\n\n**Guidelines:**\n- The tone must be friendly, sarcastic, and a little mischievous (you're a cat, after all 😼).\n- Start with a warm and cheeky welcome to the user's day.\n- Summarize the "upcoming" schedule — **ONLY include events that haven't passed yet** (based on current time).\n- Separate **work** and **personal** tasks clearly under different headings.\n- Suggest a "Focus Task" for the user — ideally picking a high-priority incomplete task.\n- Use **Markdown** for formatting:\n  - **Bold** for section titles\n  - Bulleted lists for events and tasks\n- Include the event/task **source tag** in parentheses (e.g., "(work)" or "(personal)").\n- Add appropriate emojis throughout to keep it light-hearted.\n- Consider the **time of day** (e.g., morning greeting vs afternoon pep talk).\n\n**Tone examples:**\n- "Rise and shine, ${userName} 🐱☀️ — here's what the universe (and your calendar) have in store for you."\n- "Not to be dramatic, but you've got things to do, hooman. Here's your 'don't mess this up' list:"\n\nMake the message feel alive and *FloCat-like* while staying useful and clear!`;


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

      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching data or generating AI message for At A Glance widget:", err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch data when session or powerAutomateUrl changes
    if (session) {
       fetchData();
    }
  }, [session, powerAutomateUrl]); // Refetch when session or powerAutomateUrl changes

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