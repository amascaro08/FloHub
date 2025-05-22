import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarEvent, CalendarSettings } from '@/types/calendar';

// Generic fetcher for SWR with caching
const fetcher = async (url: string) => {
  // Check if we have a cached response that's less than 5 minutes old
  const cachedData = sessionStorage.getItem(url);
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (timestamp > fiveMinutesAgo) {
        console.log('Using cached data for:', url);
        return data;
      }
    } catch (e) {
      console.error('Error parsing cached data:', e);
    }
  }
  
  // If no valid cache, fetch from API
  console.log('Fetching fresh data for:', url);
  const res = await fetch(url);
  if (!res.ok) {
    const errorInfo = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorInfo}`);
  }
  
  const data = await res.json();
  
  // Cache the response
  try {
    sessionStorage.setItem(url, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Error caching data:', e);
  }
  
  return data;
};

// Memoized calendar component to prevent unnecessary re-renders
const CalendarPage = () => {
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data;
  const status = sessionHookResult?.status || "unauthenticated";
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const { data: settings, error: settingsError } = useSWR<CalendarSettings>(
    session ? '/api/userSettings' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // 5 minutes
  );

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

  // Memoize the API URL to prevent unnecessary re-fetching
  const calendarApiUrl = useMemo(() => {
    if (!session || !settings?.selectedCals) return null;
    
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    return `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true`;
  }, [session, settings?.selectedCals]);
  
  // Use SWR for calendar data with optimized settings
  const { data: calendarData, error: calendarError } = useSWR(
    calendarApiUrl,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      onSuccess: () => setFetchError(null)
    }
  );
  
  // Process events when calendar data changes
  useEffect(() => {
    setIsLoading(true);
    
    if (calendarError) {
      console.error('Error fetching events:', calendarError);
      setFetchError('Failed to load calendar events. Please try again later.');
      setIsLoading(false);
      return;
    }
    
    if (!calendarData) {
      // Still loading or no data
      return;
    }
    
    try {
      // Check if data is an array or has an events property
      const eventsArray = Array.isArray(calendarData) ? calendarData : calendarData.events || [];
      
      // Normalize the events to ensure consistent structure - use a more efficient approach
      const normalizedEvents = eventsArray.reduce((acc: CalendarEvent[], event: any) => {
        if (!event) return acc;
        
        acc.push({
          id: event.id || `event-${Math.random().toString(36).substr(2, 9)}`,
          summary: event.summary || event.title || "No Title",
          start: event.start,
          end: event.end || event.start,
          description: event.description || "",
          calendarId: event.calendarId,
          source: event.source || "personal",
          calendarName: event.calendarName || "Calendar",
          tags: event.tags || []
        });
        
        return acc;
      }, []);
      
      setEvents(normalizedEvents);
    } catch (error) {
      console.error('Error processing calendar data:', error);
      setFetchError('Error processing calendar data');
    } finally {
      setIsLoading(false);
    }
  }, [calendarData, calendarError]);

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
    }).sort((a, b) => {
      // Sort by start time
      const dateA = getEventDate(a);
      const dateB = getEventDate(b);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Get all events for the current view (used for day view)
  const getEventsForCurrentView = () => {
    if (!events) return [];
    
    if (currentView === 'day') {
      return getEventsForDay(currentDate);
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return events.filter(event => {
        const eventDate = getEventDate(event);
        return eventDate >= weekStart && eventDate <= weekEnd;
      }).sort((a, b) => {
        // Sort by date then time
        const dateA = getEventDate(a);
        const dateB = getEventDate(b);
        return dateA.getTime() - dateB.getTime();
      });
    }
    
    return [];
  };

  // Memoize the event handlers to prevent unnecessary re-renders
  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
    // Also update the currentDate for the calendar view
    if (date) {
      setCurrentDate(new Date(date));
    }
  }, []);

  const handleViewEvent = useCallback((event: CalendarEvent) => {
    if (session) {
      setSelectedEvent(event);
    }
  }, [session]);
  
  // Handle authentication and loading states with better UI
  if (!session || isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Calendar</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 animate-pulse">
          {/* Loading skeleton for calendar controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="flex space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
          
          {/* Loading skeleton for calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
            {/* Day headers */}
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="p-2 text-center bg-gray-100 dark:bg-gray-800">
                <div className="h-5 w-10 mx-auto bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
            
            {/* Calendar cells */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[100px] bg-white dark:bg-gray-800 p-2">
                <div className="flex justify-between items-center">
                  <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
                <div className="mt-2 space-y-1">
                  {Math.random() > 0.7 && (
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  )}
                  {Math.random() > 0.8 && (
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (settingsError || fetchError) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Calendar</h1>
        <div className="bg-red-100 dark:bg-red-900 dark:bg-opacity-20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded">
          <h3 className="font-bold">Error</h3>
          <p>{settingsError?.message || fetchError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-hidden px-2 sm:px-4 py-4 sm:py-6">
      <h1 className="text-2xl font-bold mb-4">Calendar</h1>
      
      {/* Calendar controls - Mobile optimized */}
      <div className="mb-6">
        {/* Month and navigation */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all"
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          
          <div className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all"
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* View selection and Today button */}
        <div className="flex flex-wrap gap-2 justify-center mb-4">
          <button
            onClick={() => setCurrentView('day')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${currentView === 'day'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            Day
          </button>
          <button
            onClick={() => setCurrentView('week')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${currentView === 'week'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            Week
          </button>
          <button
            onClick={() => setCurrentView('month')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${currentView === 'month'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            Month
          </button>
          <button
            onClick={() => setCurrentView('year')}
            className={`px-3 py-1 rounded-lg text-sm transition-all ${currentView === 'year'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'}`}
          >
            Year
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 rounded-lg text-sm bg-teal-500 text-white hover:bg-teal-600 transition-colors"
          >
            Today
          </button>
        </div>
      </div>
      
      {/* Calendar grid */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-elevate-md overflow-x-auto border border-neutral-200 dark:border-neutral-700">
        <div className="min-w-[600px]"> {/* Reduced minimum width for better mobile experience */}
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-medium text-neutral-600 dark:text-neutral-400">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar content based on view */}
        {currentView === 'day' ? (
          // Day view (agenda style)
          <div className="bg-white dark:bg-neutral-800 p-4 rounded-b-xl">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-100">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </h3>
            </div>
            
            <div className="space-y-2">
              {getEventsForCurrentView().length > 0 ? (
                getEventsForCurrentView().map(event => {
                  const startTime = formatDateTime(event.start);
                  const endTime = formatDateTime(event.end);
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-elevate-sm
                        ${event.source === 'work'
                          ? 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 text-blue-900 dark:text-blue-100'
                          : 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-900 dark:text-green-100'
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{event.summary || event.title || "No Title"}</h4>
                          <p className="text-sm mt-1 opacity-90">{startTime} - {endTime}</p>
                        </div>
                        <div className={`tag ${event.source === 'work' ? 'tag-work' : 'tag-personal'}`}>
                          {event.source === 'work' ? 'Work' : 'Personal'}
                        </div>
                      </div>
                      
                      {event.calendarName && (
                        <p className="text-xs mt-2 opacity-75">{event.calendarName}</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  <p>No events scheduled for this day</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Month view (calendar grid)
          <div className={`grid grid-cols-7 ${currentView === 'month' ? 'grid-rows-6' : ''}`}>
            {calendarDays.map(day => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border-b border-r border-neutral-200 dark:border-neutral-700 transition-colors
                    ${!isCurrentMonth ? 'text-neutral-500 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'}
                    ${isToday ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-semibold ${isToday
                      ? 'bg-primary-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
                      : 'text-neutral-800 dark:text-neutral-200'}`}>
                      {format(day, 'd')}
                    </span>
                    {isCurrentMonth && dayEvents.length > 0 && (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.slice(0, 3).map(event => {
                      // Determine color based on source (work/personal) and add a left border
                      const colorClass = event.source === 'work'
                        ? 'border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 text-blue-900 dark:text-blue-100'
                        : 'border-l-2 border-green-500 bg-green-50 dark:bg-green-900 dark:bg-opacity-30 text-green-900 dark:text-green-100';
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`text-xs p-1.5 rounded-lg truncate cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                        >
                          {event.summary || event.title || "No Title"}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div
                        className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-1 cursor-pointer hover:underline"
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
        )}
        </div>
      </div>
      
      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-elevate-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                {selectedEvent.summary || selectedEvent.title || "No Title"}
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            {/* Event details in a more structured format */}
            <div className="mt-6 space-y-4 text-neutral-800 dark:text-neutral-100">
              {/* Color-coded event type indicator */}
              <div className={`w-full h-2 rounded-full mb-4 ${
                selectedEvent.source === 'work'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              }`}></div>
              
              {/* Start time */}
              <div className="flex items-center p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">Start:</span>
                  <span className="ml-2 text-neutral-800 dark:text-neutral-100">{formatDateTime(selectedEvent.start)}</span>
                </div>
              </div>
              
              {/* End time */}
              <div className="flex items-center p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div>
                  <span className="font-medium text-neutral-600 dark:text-neutral-300">End:</span>
                  <span className="ml-2 text-neutral-800 dark:text-neutral-100">{formatDateTime(selectedEvent.end)}</span>
                </div>
              </div>
              
              {/* Calendar */}
              {selectedEvent.calendarName && (
                <div className="flex items-center p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">Calendar:</span>
                    <span className="ml-2 text-neutral-800 dark:text-neutral-100">{selectedEvent.calendarName}</span>
                  </div>
                </div>
              )}
              
              {/* Source */}
              {selectedEvent.source && (
                <div className="flex items-center p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-300">Source:</span>
                    <span className={`tag ${selectedEvent.source === 'work' ? 'tag-work' : 'tag-personal'}`}>
                      {selectedEvent.source === 'work' ? 'Work' : 'Personal'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Description */}
              {selectedEvent.description && (
                <div className="mt-6">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Description:</span>
                  </div>
                  <div className="mt-1 p-4 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg text-neutral-700 dark:text-neutral-300">
                    {/* Check if description contains HTML */}
                    {selectedEvent.description.includes('<html>') ||
                     selectedEvent.description.includes('<body>') ||
                     selectedEvent.description.includes('<div>') ||
                     selectedEvent.description.includes('<meta') ? (
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: selectedEvent.description }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{selectedEvent.description}</div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedEvent.tags.map(tag => (
                      <span key={tag} className="bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 px-3 py-1 rounded-full text-sm">
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