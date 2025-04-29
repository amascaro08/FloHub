import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { marked } from 'marked'; // Import marked

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
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const userTimezone = "Australia/Sydney"; // Using a standard IANA timezone name for AEST/AEDT
        const eventsApiUrl = `/api/calendar?timeMin=${startOfDay}&timeMax=${endOfDay}&timezone=${encodeURIComponent(userTimezone)}${
          powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
        }`;

        const eventsRes = await fetch(eventsApiUrl);
        if (!eventsRes.ok) {
          throw new Error(`Error fetching events: ${eventsRes.statusText}`);
        }
        const eventsData: CalendarEvent[] = await eventsRes.json();
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

        console.log("[AtAGlanceWidget] eventsData:", eventsData); // Log events data
        console.log("[AtAGlanceWidget] incompleteTasks:", incompleteTasks); // Log incomplete tasks

        // Generate AI message
        const prompt = `Generate a personalized "At A Glance" message for the user "${userName}" based on the following information:\n\nUpcoming Events Today:\n${eventsData.map(event => `- ${event.summary} at ${event.start.dateTime || event.start.date} (${event.source || 'personal'})`).join('\n') || 'None'}\n\nIncomplete Tasks:\n${incompleteTasks.map(task => `- ${task.text} (${task.source || 'personal'})`).join('\n') || 'None'}\n\nThe message should be from FloCat, welcoming the user to their day, summarizing their schedule, suggesting a task focus (preferably an incomplete one), and have a friendly, sarcastic, slightly quirky personality with emojis, remember you are a cat. Please use markdown for lists and **bold** headings. Ensure that the source tag (e.g., "(personal)" or "(work)") is included for both events and tasks in the generated message. Be sure to seperate work and personal tasks, and take into account the time of day. `;

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