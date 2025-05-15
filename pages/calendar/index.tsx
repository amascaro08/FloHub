import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';

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
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { data: settings, error: settingsError } = useSWR<Settings>(session ? '/api/userSettings' : null, fetcher);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all available calendars
  const { data: calendarList, error: calendarListError } = useSWR<any[]>(
    session ? '/api/calendar/list' : null,
    fetcher
  );

  // Log available calendars for debugging
  useEffect(() => {
    if (calendarList) {
      console.log('Available calendars:', calendarList);
    }
  }, [calendarList]);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      
      if (!session) {
        setIsLoading(false);
        return; // Don't fetch if not authenticated
      }
      
      if (!settings?.selectedCals) {
        setIsLoading(false);
        return; // Don't fetch if settings or selectedCals is missing
      }

      try {
        // First try to use the main calendar API which should include all sources
        const now = new Date();
        const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        // Use the main calendar API which should include all sources
        const response = await fetch(`/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Calendar data fetched:', data);
        
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
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        
        // Fallback to the events API if the main API fails
        try {
          const calendarIds = settings.selectedCals;
          const calendarIdParam = calendarIds.map(id => `calendarId=${encodeURIComponent(id)}`).join('&');
          const fallbackResponse = await fetch(`/api/calendar/events?${calendarIdParam}`);
          
          if (!fallbackResponse.ok) {
            throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
          }
          
          const fallbackData = await fallbackResponse.json();
          console.log('Fallback calendar data fetched:', fallbackData);
          
          // Check if data is an array or has an events property
          const eventsArray = Array.isArray(fallbackData) ? fallbackData : fallbackData.events || [];
          
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
          setIsLoading(false);
        } catch (fallbackError) {
          console.error('Error fetching events (fallback):', fallbackError);
          setIsLoading(false);
        }
      }
    };

    fetchEvents();
  }, [settings, session]);

  // Helper functions for date handling
  const getEventDate = (event: CalendarEvent): Date => {
    if (event.start instanceof Date) {
      return event.start;
    }
    
    if (typeof event.start === 'object') {
      const dateStr = event.start.dateTime || event.start.date;
      return dateStr ? parseISO(dateStr) : new Date();
    }
    
    return new Date();
  };

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

  // Calendar state
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar days based on current date and view
  const calendarDays = useMemo(() => {
    if (currentView === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else if (currentView === 'day') {
      return [currentDate];
    } else {
      // Year view - simplified for now, just show current month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
  }, [currentDate, currentView]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    if (!events) return [];
    
    return events.filter(event => {
      const eventDate = getEventDate(event);
      return isSameDay(eventDate, day);
    });
  };

  // Handle authentication and loading states
  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-5">Calendar</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p>Please sign in to view your calendar.</p>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-5">Calendar</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>Error loading settings: {settingsError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-5">Calendar</h1>
      
      {/* Calendar controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex space-x-2 w-full md:w-auto">
          <button
            onClick={() => setCurrentView('day')}
            className={`px-4 py-2 rounded-lg transition-all ${currentView === 'day'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)]'}`}
          >
            Day
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-4 py-2 rounded-lg transition-all ${currentView === 'week'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)]'}`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-4 py-2 rounded-lg transition-all ${currentView === 'month'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)]'}`}
          >
            Month
          </button>
          <button
            onClick={() => setCurrentView('year')}
            className={`px-4 py-2 rounded-lg transition-all ${currentView === 'year'
              ? 'bg-[var(--primary)] text-white shadow-md'
              : 'bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)]'}`}
          >
            Year
          </button>
        </div>
        
        <div className="text-xl font-semibold text-[var(--on-surface)]">
          {format(currentDate, 'MMMM yyyy')}
        </div>
        
        <div className="flex space-x-2 w-full md:w-auto justify-end">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)] transition-all"
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-lg bg-[var(--primary-container)] text-[var(--on-primary-container)] hover:bg-opacity-90 transition-all"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full bg-[var(--surface-variant)] hover:bg-opacity-80 text-[var(--on-surface-variant)] transition-all"
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="bg-[var(--surface)] rounded-xl shadow-md overflow-hidden border border-[var(--outline-variant)]">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[var(--outline-variant)]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-[var(--on-surface-variant)]">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar cells */}
        <div className={`grid grid-cols-7 ${currentView === 'month' ? 'grid-rows-6' : ''}`}>
          {calendarDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border-b border-r border-[var(--outline-variant)] transition-colors
                  ${!isCurrentMonth ? 'text-[var(--on-surface-variant)] bg-[var(--surface-variant)] bg-opacity-20' : 'bg-[var(--surface)]'}
                  ${isToday ? 'bg-[var(--primary-container)] bg-opacity-30' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-semibold ${isToday
                    ? 'bg-[var(--primary)] text-white rounded-full w-7 h-7 flex items-center justify-center'
                    : 'text-[var(--on-surface)]'}`}>
                    {format(day, 'd')}
                  </span>
                  {isCurrentMonth && dayEvents.length > 0 && (
                    <span className="text-xs text-[var(--on-surface-variant)] bg-[var(--surface-variant)] px-1.5 py-0.5 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`text-xs p-1.5 rounded-lg truncate cursor-pointer transition-transform hover:scale-[1.02] ${
                        event.source === 'work'
                          ? 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]'
                          : 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
                      }`}
                    >
                      {event.summary || event.title || "No Title"}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      className="text-xs text-[var(--on-surface-variant)] text-center py-1 cursor-pointer hover:underline"
                      onClick={() => {
                        // Find all events for this day and show them in a modal
                        setCurrentDate(day);
                        setCurrentView('day');
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[var(--surface)] rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-[var(--outline-variant)]">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-[var(--on-surface)]">
                {selectedEvent.summary || selectedEvent.title || "No Title"}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] p-2 rounded-full hover:bg-[var(--surface-variant)]"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mt-6 space-y-4 text-[var(--on-surface)]">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Start:</span>
                <span className="ml-2">{formatDateTime(selectedEvent.start)}</span>
              </div>
              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">End:</span>
                <span className="ml-2">{formatDateTime(selectedEvent.end)}</span>
              </div>
              
              {selectedEvent.calendarName && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span className="font-medium">Calendar:</span>
                  <span className="ml-2">{selectedEvent.calendarName}</span>
                </div>
              )}
              
              {selectedEvent.source && (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="font-medium">Source:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-sm ${
                    selectedEvent.source === 'work'
                      ? 'bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]'
                      : 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
                  }`}>
                    {selectedEvent.source === 'work' ? 'Work' : 'Personal'}
                  </span>
                </div>
              )}
              
              {selectedEvent.description && (
                <div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Description:</span>
                  </div>
                  <div className="mt-1 p-4 bg-[var(--surface-variant)] rounded-lg whitespace-pre-wrap text-[var(--on-surface-variant)]">
                    {selectedEvent.description}
                  </div>
                </div>
              )}
              
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[var(--primary)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedEvent.tags.map(tag => (
                      <span key={tag} className="bg-[var(--surface-variant)] text-[var(--on-surface-variant)] px-3 py-1 rounded-full text-sm">
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