import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch upcoming events for today
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const eventsRes = await fetch(`/api/calendar?timeMin=${startOfDay}&timeMax=${endOfDay}`);
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

        // Generate AI message
        const prompt = `Generate a personalized "At A Glance" message for the user "${userName}" based on the following information:\n\nUpcoming Events Today:\n${upcomingEvents.map(event => `- ${event.summary} at ${event.start.dateTime || event.start.date}`).join('\n') || 'None'}\n\nTasks:\n${tasks.map(task => `- ${task.text} (Done: ${task.done})`).join('\n') || 'None'}\n\nThe message should be from FloCat, welcoming the user to their day, summarizing their schedule, suggesting a task focus (preferably an incomplete one), and have a friendly, slightly quirky personality with emojis. Please use markdown for lists and include line breaks for readability.`;

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

    fetchData();
  }, [session]); // Refetch when session changes

  if (loading) {
    return <div className="p-4 border rounded-lg shadow-sm">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 border rounded-lg shadow-sm text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 border rounded-lg shadow-sm flex flex-col h-full justify-between">
      <div className="text-lg">
        {/* Render message with line breaks */}
        {aiMessage ? aiMessage.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < aiMessage.split('\n').length - 1 && <br />}
          </React.Fragment>
        )) : "FloCat is thinking..."}
      </div>
      <p className="text-sm mt-2 self-end">- FloCat 😼</p>
    </div>
  );
};

export default AtAGlanceWidget;