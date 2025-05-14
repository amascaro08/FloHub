import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

interface LinkedMomentsProps {
  date?: string; // Optional date to show moments for a specific day
}

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LinkedMoments: React.FC<LinkedMomentsProps> = ({ date }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { data: session, status } = useSession();
  
  // Use the provided date or default to today
  const targetDate = date || new Date().toISOString().split('T')[0];

  // Fetch tasks
  const { data: tasksData } = useSWR(
    status === 'authenticated' ? '/api/tasks' : null,
    fetcher
  );

  // Fetch calendar events
  const { data: eventsData } = useSWR(
    status === 'authenticated' ? '/api/calendar/events?calendarId=primary' : null,
    fetcher
  );

  useEffect(() => {
    if (tasksData) {
      // Filter tasks for the target date
      const filteredTasks = tasksData.filter((task: Task) => {
        if (!task.dueDate) return false;
        return task.dueDate.split('T')[0] === targetDate;
      });
      setTasks(filteredTasks);
    }
  }, [tasksData, targetDate]);

  useEffect(() => {
    if (eventsData && eventsData.events && Array.isArray(eventsData.events)) {
      // Filter events for the target date
      const filteredEvents = eventsData.events.filter((event: CalendarEvent) => {
        if (!event.start) return false;
        const eventDate = new Date(event.start).toISOString().split('T')[0];
        return eventDate === targetDate;
      });
      setEvents(filteredEvents);
    } else {
      // Handle case when events data is not available or is not an array
      setEvents([]);
    }
  }, [eventsData, targetDate]);

  const formatTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Linked Moments</h2>
      
      <div className="mb-4">
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Calendar Events
        </h3>
        
        {events.length > 0 ? (
          <ul className="space-y-2">
            {events.map(event => (
              <li key={event.id} className="flex items-start p-2 rounded-lg bg-slate-50 dark:bg-slate-700">
                <div className="flex-shrink-0 w-10 text-center text-teal-600 dark:text-teal-400 font-medium">
                  {formatTime(event.start.toISOString())}
                </div>
                <div className="ml-3">
                  <p className="text-slate-800 dark:text-slate-200">{event.title}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">
            No calendar events for this day
          </p>
        )}
      </div>
      
      <div>
        <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Tasks
        </h3>
        
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map(task => (
              <li key={task.id} className="flex items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700">
                <div className="flex-shrink-0">
                  <div className={`w-5 h-5 rounded-full border ${
                    task.completed 
                      ? 'bg-teal-500 border-teal-500' 
                      : 'border-slate-400 dark:border-slate-500'
                  } flex items-center justify-center`}>
                    {task.completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="ml-3">
                  <p className={`${
                    task.completed 
                      ? 'line-through text-slate-500 dark:text-slate-400' 
                      : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {task.title}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic">
            No tasks due for this day
          </p>
        )}
      </div>
    </div>
  );
};

export default LinkedMoments;