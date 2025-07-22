import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useUser } from "@/lib/hooks/useUser";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addDays, isToday, isSameMonth } from 'date-fns';
import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';

// Generic fetcher for SWR with caching
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const errorInfo = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorInfo}`);
  }
  return res.json();
};

// Function to extract Microsoft Teams meeting link from event description
const extractTeamsLink = (description: string): string | null => {
  if (!description) return null;
  
  // Common patterns for Teams meeting links
  const patterns = [
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"'\s]+/gi,
    /https:\/\/teams\.live\.com\/meet\/[^"'\s]+/gi,
    /<a[^>]+href="(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^"]+)"/gi,
    /<a[^>]+href="(https:\/\/teams\.live\.com\/meet\/[^"]+)"/gi
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(description);
    if (match) {
      // Return the full URL, cleaning up any HTML encoding
      const url = match[1] || match[0];
      return url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    }
  }
  
  return null;
};

const CalendarPage = () => {
  const { user } = useUser();
  const status = user ? "authenticated" : "unauthenticated";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const { data: settings, error: settingsError } = useSWR<CalendarSettings>(
    user ? '/api/userSettings' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // 5 minutes
  );

  // Fetch all available calendars
  const { data: calendarList, error: calendarListError } = useSWR<Array<{ id: string; summary: string }>>(
    user ? '/api/calendar/list' : null,
    fetcher
  );

  // Log available calendars for debugging
  useEffect(() => {
    if (calendarList) {
      console.log('Available calendars:', calendarList);
      console.log('Calendar list length:', calendarList.length);
      if (calendarList.length > 0) {
        console.log('First calendar:', calendarList[0]);
      }
    } else if (calendarListError) {
      console.error('Calendar list error:', calendarListError);
    }
  }, [calendarList, calendarListError]);

  // Memoize the API URL to prevent unnecessary re-fetching
  const calendarApiUrl = useMemo(() => {
    if (!user || !settings?.selectedCals) return null;
    
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    return `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true`;
  }, [user, settings?.selectedCals]);
  
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

    if (calendarData?.events) {
      setEvents(calendarData.events);
    } else {
      setEvents([]);
    }
    
    setIsLoading(false);
  }, [calendarData, calendarError]);

  const getEventDate = (event: CalendarEvent): Date => {
    if (event.start instanceof Date) {
      return event.start;
    }
    if (event.start.dateTime) {
      return parseISO(event.start.dateTime);
    }
    if (event.start.date) {
      return parseISO(event.start.date);
    }
    return new Date();
  };

  const formatDateTime = (dateTime: any): string => {
    if (!dateTime) return '';
    
    let date: Date;
    if (dateTime instanceof Date) {
      date = dateTime;
    } else if (dateTime.dateTime) {
      date = parseISO(dateTime.dateTime);
    } else if (dateTime.date) {
      date = parseISO(dateTime.date);
    } else {
      return '';
    }
    
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const goToPrevious = () => {
    if (currentView === 'month') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (currentView === 'week') {
      setCurrentDate(prev => addDays(prev, -7));
    } else if (currentView === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    }
  };

  const goToNext = () => {
    if (currentView === 'month') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else if (currentView === 'week') {
      setCurrentDate(prev => addDays(prev, 7));
    } else if (currentView === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = getEventDate(event);
      return isSameDay(eventDate, day);
    }).sort((a, b) => {
      const aDate = getEventDate(a);
      const bDate = getEventDate(b);
      return aDate.getTime() - bDate.getTime();
    });
  };

  const getEventsForCurrentView = () => {
    if (currentView === 'day') {
      return getEventsForDay(currentDate);
    }
    return events;
  };

  // Calculate calendar days for the current month
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Handle event form submission
  const handleEventSubmit = async (eventData: any) => {
    try {
      console.log('Calendar page received event data:', eventData);
      
      const url = editingEvent 
        ? `/api/calendar/event?id=${editingEvent.id}`
        : '/api/calendar/event';
      
      const method = editingEvent ? 'PUT' : 'POST';
      
      console.log('Making request to:', url, 'with method:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorJson = await response.json();
          errorText = errorJson.error || JSON.stringify(errorJson);
        } catch (e) {
          errorText = await response.text();
        }
        console.error('Response error text:', errorText);
        throw new Error(errorText || `Failed to save event: ${response.status}`);
      }

      const result = await response.json();
      console.log('Event saved successfully:', result);

      // Refresh calendar data
      window.location.reload();
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  };

  // Handle event deletion
  const handleEventDelete = async (event: CalendarEvent) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/event?id=${event.id}&calendarId=${event.calendarId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh calendar data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  // Handle authentication and loading states with better UI
  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Calendar</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your events and schedule</p>
            </div>
            
            {/* Loading skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-pulse">
              {/* Calendar controls skeleton */}
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
              
              {/* Calendar grid skeleton */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                {/* Day headers */}
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="p-2 text-center bg-gray-100 dark:bg-gray-800">
                    <div className="h-5 w-10 mx-auto bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                ))}
                
                {/* Calendar cells */}
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="min-h-[120px] bg-white dark:bg-gray-800 p-2">
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
        </div>
      </div>
    );
  }

  if (settingsError || fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-6 rounded-lg">
              <h3 className="font-bold text-lg mb-3">Calendar Load Error</h3>
              <p className="mb-4">{settingsError?.message || fetchError}</p>
              
              <div className="text-sm mb-4 space-y-2">
                <p><strong>Common Solutions:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Verify your Google Calendar is connected in Settings</li>
                  <li>Ensure Power Automate URLs are working correctly</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard/settings?tab=calendar'}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Check Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Calendar</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your events and schedule</p>
              </div>
              <button
                onClick={() => {
                  setEditingEvent(null);
                  setIsEventFormOpen(true);
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Event</span>
              </button>
            </div>
          </div>

          {/* Calendar Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={goToPrevious}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  aria-label={`Previous ${currentView}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentView === 'day' 
                    ? format(currentDate, 'MMMM d, yyyy')
                    : currentView === 'week'
                    ? `Week of ${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                    : format(currentDate, 'MMMM yyyy')
                  }
                </h2>
                
                <button
                  onClick={goToNext}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                  aria-label={`Next ${currentView}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* View Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView('day')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'day'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setCurrentView('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'week'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCurrentView('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'month'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                >
                  Today
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {currentView === 'month' && (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-4 text-center font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[120px] p-3 border-b border-r border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                          !isCurrentMonth ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-sm font-medium ${
                            isTodayDate
                              ? 'bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {format(day, 'd')}
                          </span>
                          {isCurrentMonth && dayEvents.length > 0 && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(event => {
                            const colorClass = event.source === 'work'
                              ? 'border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                              : 'border-l-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100';
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`text-xs p-2 rounded cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                              >
                                <div className="font-medium truncate">
                                  {event.summary || event.title || "No Title"}
                                </div>
                                {event.start && (
                                  <div className="text-xs opacity-75">
                                    {formatDateTime(event.start)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div
                              className="text-xs text-gray-500 dark:text-gray-400 text-center py-1 cursor-pointer hover:underline"
                              onClick={() => {
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
              </>
            )}

            {currentView === 'week' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Week of {format(startOfWeek(currentDate), 'MMM d')} - {format(endOfWeek(currentDate), 'MMM d, yyyy')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isTodayDate = isToday(day);
                    
                    return (
                      <div key={day.toISOString()} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                        <div className="flex items-center mb-3">
                          <span className={`text-lg font-semibold mr-4 ${
                            isTodayDate
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {format(day, 'EEEE, MMM d')}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {dayEvents.length} events
                            </span>
                          )}
                        </div>
                        
                        {dayEvents.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400 text-sm italic">No events scheduled</p>
                        ) : (
                          <div className="space-y-2">
                            {dayEvents.map(event => {
                              const colorClass = event.source === 'work'
                                ? 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20';
                              
                              return (
                                <div
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className={`p-3 rounded-lg cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {event.summary || event.title || "No Title"}
                                      </div>
                                      {event.start && (
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                          {formatDateTime(event.start)}
                                          {event.end && (
                                            <span> - {formatDateTime(event.end)}</span>
                                          )}
                                        </div>
                                      )}
                                      {event.location && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          📍 {event.location}
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        event.source === 'work'
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      }`}>
                                        {event.source === 'work' ? 'Work' : 'Personal'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentView === 'day' && (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {format(currentDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                <div className="space-y-4">
                  {getEventsForDay(currentDate).length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 dark:text-gray-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">No events scheduled for today</p>
                      <button
                        onClick={() => {
                          setEditingEvent(null);
                          setIsEventFormOpen(true);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Add Event
                      </button>
                    </div>
                  ) : (
                    getEventsForDay(currentDate).map(event => {
                      const colorClass = event.source === 'work'
                        ? 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20';
                      
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`p-4 rounded-lg cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {event.summary || event.title || "No Title"}
                              </div>
                              {event.start && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {formatDateTime(event.start)}
                                    {event.end && (
                                      <span> - {formatDateTime(event.end)}</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {event.location && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  <div className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {event.location}
                                  </div>
                                </div>
                              )}
                              {event.description && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  <div className="prose prose-sm max-w-none dark:prose-invert">
                                    {event.description.length > 200 
                                      ? `${event.description.substring(0, 200)}...` 
                                      : event.description}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                event.source === 'work'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {event.source === 'work' ? 'Work' : 'Personal'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedEvent.summary || selectedEvent.title || "No Title"}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingEvent(selectedEvent);
                    setIsEventFormOpen(true);
                    setSelectedEvent(null);
                  }}
                  className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  aria-label="Edit"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleEventDelete(selectedEvent)}
                  className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  aria-label="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Event details */}
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              {/* Color indicator */}
              <div className={`w-full h-2 rounded-full mb-4 ${
                selectedEvent.source === 'work' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              
              {/* Time details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Start:</span>
                    <span className="ml-2">{formatDateTime(selectedEvent.start)}</span>
                  </div>
                </div>
                
                {selectedEvent.end && (
                  <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                    <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">End:</span>
                      <span className="ml-2">{formatDateTime(selectedEvent.end)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Calendar */}
              {selectedEvent.calendarName && (
                <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Calendar:</span>
                    <span className="ml-2">{selectedEvent.calendarName}</span>
                  </div>
                </div>
              )}
              
              {/* Source */}
              {selectedEvent.source && (
                <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      selectedEvent.source === 'work' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}>
                      {selectedEvent.source === 'work' ? 'Work' : 'Personal'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                  <svg className="w-5 h-5 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">Location:</span>
                    <span className="ml-2">{selectedEvent.location}</span>
                  </div>
                </div>
              )}
              
              {/* Microsoft Teams Meeting Link */}
              {(() => {
                const teamsLink = extractTeamsLink(selectedEvent.description || '');
                return teamsLink ? (
                  <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                    <svg className="w-5 h-5 mr-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.01c0-1.02-.83-1.85-1.85-1.85H20.3c.13-.6.2-1.22.2-1.85C20.5 4.15 16.35 0 11.19 0S1.88 4.15 1.88 8.31c0 .63.07 1.25.2 1.85H.23C.1 10.16 0 11.07 0 12.01c0 6.63 5.37 12 12 12s12-5.37 12-12zM11.19 2.25c3.38 0 6.12 2.74 6.12 6.12s-2.74 6.12-6.12 6.12S5.07 11.75 5.07 8.37s2.74-6.12 6.12-6.12z"/>
                    </svg>
                    <div>
                      <span className="font-medium text-blue-700 dark:text-blue-300">Microsoft Teams Meeting:</span>
                      <a 
                        href={teamsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  </div>
                ) : null;
              })()}
              
              {/* Description */}
              {selectedEvent.description && (
                <div className="mt-6">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">Description:</span>
                  </div>
                  <div className="mt-1 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-gray-700 dark:text-gray-300">
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
              
              {/* Tags */}
              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <div>
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm">
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

      {/* Event Form Modal */}
      <CalendarEventForm
        event={editingEvent}
        isOpen={isEventFormOpen}
        onClose={() => {
          setIsEventFormOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleEventSubmit}
        availableCalendars={
          Array.isArray(settings?.selectedCals) && Array.isArray(calendarList)
            ? calendarList.filter(cal => settings.selectedCals.includes(cal.id))
            : calendarList || []
        }
      />
    </div>
  );
};

export default CalendarPage;