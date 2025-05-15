import React, { useState, useEffect } from 'react';
import useSWR from 'swr';

// Define Settings type (can be moved to a shared types file)
type Settings = {
  selectedCals: string[];
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  customRange: { start: string; end: string };
  powerAutomateUrl?: string;
};

export type CalendarEvent = {
  id: string;
  summary?: string;
  title?: string; // Some APIs return title instead of summary
  start: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | Date;
  end?: { dateTime?: string | null; date?: string | null; timeZone?: string | null } | Date;
  description?: string;
  calendarId?: string;
  source?: "personal" | "work";
  calendarName?: string;
  tags?: string[];
};

// Generic fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorInfo = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorInfo}`);
  }
  return res.json();
};

const CalendarPage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { data: settings, error: settingsError } = useSWR<Settings>('/api/userSettings', fetcher);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!settings?.selectedCals) {
        return; // Don't fetch if settings or selectedCals is missing
      }

      try {
        const calendarIds = settings.selectedCals;
        const calendarIdParam = calendarIds.map(id => `calendarId=${encodeURIComponent(id)}`).join('&');
        const response = await fetch(`/api/calendar/events?${calendarIdParam}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if data is an array or has an events property
        const eventsArray = Array.isArray(data) ? data : data.events || [];
        
        // Normalize the events to ensure consistent structure
        const normalizedEvents = eventsArray.map((event: any) => ({
          id: event.id,
          summary: event.summary || event.title || "No Title",
          start: event.start,
          end: event.end || event.start,
          description: event.description || "",
          calendarId: event.calendarId,
          source: event.source,
          calendarName: event.calendarName,
          tags: event.tags
        }));
        
        setEvents(normalizedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [settings]);

  // Helper function to format date/time
  const formatDateTime = (dateTime: any): string => {
    if (!dateTime) return 'N/A';
    
    if (dateTime instanceof Date) {
      return dateTime.toLocaleString();
    }
    
    if (typeof dateTime === 'object') {
      const dateStr = dateTime.dateTime || dateTime.date;
      return dateStr ? new Date(dateStr).toLocaleString() : 'N/A';
    }
    
    if (typeof dateTime === 'string') {
      return new Date(dateTime).toLocaleString();
    }
    
    return 'N/A';
  };

  // View state
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Calendar</h1>
      
      {/* View selector */}
      <div className="flex space-x-2 mb-5">
        <button
          onClick={() => setCurrentView('day')}
          className={`px-4 py-2 rounded ${currentView === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Day
        </button>
        <button
          onClick={() => setCurrentView('week')}
          className={`px-4 py-2 rounded ${currentView === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Week
        </button>
        <button
          onClick={() => setCurrentView('month')}
          className={`px-4 py-2 rounded ${currentView === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Month
        </button>
        <button
          onClick={() => setCurrentView('year')}
          className={`px-4 py-2 rounded ${currentView === 'year' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Year
        </button>
      </div>
      
      {/* Event list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events && events.length > 0 ? (
          events.map(event => (
            <div
              key={event.id}
              className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedEvent(event)}
            >
              <h2 className="text-lg font-semibold">{event.summary || event.title || "No Title"}</h2>
              <p className="text-sm text-gray-600">
                {event.calendarName && <span className="mr-2">{event.calendarName}</span>}
                {event.source && (
                  <span className={`px-2 py-1 rounded-full text-xs ${event.source === 'work' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {event.source}
                  </span>
                )}
              </p>
              <p className="mt-2"><span className="font-medium">Start:</span> {formatDateTime(event.start)}</p>
              <p><span className="font-medium">End:</span> {formatDateTime(event.end)}</p>
              {event.tags && event.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-10 text-gray-500">
            No events found. Try selecting different calendars in settings.
          </div>
        )}
      </div>
      
      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold">{selectedEvent.summary || selectedEvent.title || "No Title"}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mt-4 space-y-3">
              <p><span className="font-medium">Start:</span> {formatDateTime(selectedEvent.start)}</p>
              <p><span className="font-medium">End:</span> {formatDateTime(selectedEvent.end)}</p>
              
              {selectedEvent.calendarName && (
                <p><span className="font-medium">Calendar:</span> {selectedEvent.calendarName}</p>
              )}
              
              {selectedEvent.description && (
                <div>
                  <p className="font-medium">Description:</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedEvent.description}
                  </div>
                </div>
              )}
              
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <p className="font-medium">Tags:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedEvent.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 px-2 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;