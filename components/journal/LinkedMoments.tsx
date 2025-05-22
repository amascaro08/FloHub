import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { getCurrentDate } from '@/lib/dateUtils';

interface LinkedMomentsProps {
  date?: string; // Optional date to show moments for a specific day 
  timezone?: string; // User's timezone
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
  start: Date | string | { dateTime?: string; date?: string }; // Can be Date, string, or object with dateTime/date
  end: Date | string | { dateTime?: string; date?: string };
  description?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const LinkedMoments: React.FC<LinkedMomentsProps> = ({ date, timezone }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { data: session, status } = useSession();
  const sessionData = session ? session : null;

  if (!session) {
    return <div>Loading...</div>; // Or any other fallback UI
  }
  
  // Use the provided date or default to today in user's timezone
  const targetDate = date || getCurrentDate(timezone);

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
        
        try {
          // Safely convert to a Date object first
          let eventDate;
          if (typeof event.start === 'string') {
            eventDate = new Date(event.start);
          } else if (event.start instanceof Date) {
            eventDate = event.start;
          } else if (typeof event.start === 'object' && event.start !== null) {
            // Handle case where start might be an object with dateTime or date property
            const dateStr = event.start.dateTime || event.start.date;
            if (dateStr) {
              eventDate = new Date(dateStr);
            } else {
              return false; // Skip if we can't get a valid date
            }
          } else {
            return false; // Skip if we can't get a valid date
          }
          
          // Now we have a proper Date object, extract the date part
          const dateStr = eventDate.toISOString().split('T')[0];
          return dateStr === targetDate;
        } catch (error) {
          console.error("Error processing event date:", error, event);
          return false; // Skip this event if there's an error
        }
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
      minute: '2-digit',
      timeZone: timezone
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
                  {(() => {
                    try {
                      let dateStr;
                      if (typeof event.start === 'string') {
                        dateStr = event.start;
                      } else if (event.start instanceof Date) {
                        dateStr = event.start.toISOString();
                      } else if (typeof event.start === 'object' && event.start !== null) {
                        dateStr = event.start.dateTime || event.start.date || '';
                      } else {
                        return 'N/A';
                      }
                      return formatTime(dateStr);
                    } catch (error) {
                      console.error("Error formatting event time:", error);
                      return 'N/A';
                    }
                  })()}
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