import React, { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useUser } from "@/lib/hooks/useUser";
import Head from 'next/head';
import MainLayout from "@/components/ui/MainLayout";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addDays, isToday, isSameMonth, startOfDay, endOfDay, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { generateCalendarSourcesHash, extractTeamsLink } from '@/lib/calendarUtils';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  ListBulletIcon, 
  ChartBarIcon,
  PlusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ViewColumnsIcon,
  CalendarIcon,
  MapPinIcon,
  LinkIcon,
  CogIcon,
  SparklesIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

// Generic fetcher for SWR with caching
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const errorInfo = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorInfo}`);
  }
  return res.json();
};

// Function to detect if content contains HTML
const containsHTML = (content: string): boolean => {
  if (!content) return false;
  return content.includes('<html>') ||
         content.includes('<body>') ||
         content.includes('<div>') ||
         content.includes('<meta') ||
         content.includes('<p>') ||
         content.includes('<br>') ||
         content.includes('<span>') ||
         content.includes('<a ') ||
         content.includes('<table') ||
         content.includes('&nbsp;') ||
         content.includes('&amp;') ||
         content.includes('&lt;') ||
         content.includes('&gt;');
};

const CalendarPage = () => {
  const { user } = useUser();
  const status = user ? "authenticated" : "unauthenticated";

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'agenda' | 'timeline'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    
    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Calculate date range for current view
  const getDateRange = useCallback(() => {
    if (currentView === 'day') {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (currentView === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return { start, end };
    } else if (currentView === 'agenda' || currentView === 'timeline') {
      // Show 30 days for agenda/timeline
      const start = startOfDay(currentDate);
      const end = addDays(start, 30);
      return { start, end };
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end };
    }
  }, [currentDate, currentView]);

  const { data: settings, error: settingsError } = useSWR<CalendarSettings>(
    user ? '/api/userSettings' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 } // 5 minutes
  );

  // Set initial view based on settings
  useEffect(() => {
    if (settings?.defaultView) {
      const viewMapping: Record<string, 'day' | 'week' | 'month' | 'agenda' | 'timeline'> = {
        'today': 'day',
        'tomorrow': 'day',
        'week': 'week',
        'month': 'month',
        'agenda': 'agenda',
        'timeline': 'timeline',
        'custom': 'month' // Default to month for custom range
      };
      const newView = viewMapping[settings.defaultView] || 'month';
      setCurrentView(newView);
      
      // If it's tomorrow view, set the current date to tomorrow
      if (settings.defaultView === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setCurrentDate(tomorrow);
      }
    }
  }, [settings?.defaultView]);

  // Fetch all available calendars
  const { data: calendarList, error: calendarListError } = useSWR<Array<{ id: string; summary: string }>>(
    user ? '/api/calendar/list' : null,
    fetcher
  );

  const { start: startDate, end: endDate } = getDateRange();

  // Generate hash of calendar sources to detect changes
  const calendarSourcesHash = useMemo(() => {
    return generateCalendarSourcesHash(settings?.calendarSources);
  }, [settings?.calendarSources]);

  // Use cached calendar events hook
  const {
    events,
    isLoading,
    error: fetchError,
    addEvent,
    updateEvent,
    removeEvent,
    invalidateCache,
    refetch,
    isBackgroundRefreshing
  } = useCalendarEvents({
    startDate,
    endDate,
    enabled: !!user, // Always enabled if user is authenticated (includes local events)
    calendarSourcesHash
  });

  // Handle errors gracefully
  useEffect(() => {
    if (fetchError) {
      console.error('Calendar events error:', fetchError);
    }
  }, [fetchError]);

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

  const formatTime = (dateTime: any): string => {
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
    
    return format(date, 'h:mm a');
  };

  const goToPrevious = () => {
    if (currentView === 'month') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (currentView === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else if (currentView === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (currentView === 'agenda' || currentView === 'timeline') {
      setCurrentDate(prev => addDays(prev, -30));
    }
  };

  const goToNext = () => {
    if (currentView === 'month') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else if (currentView === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else if (currentView === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (currentView === 'agenda' || currentView === 'timeline') {
      setCurrentDate(prev => addDays(prev, 30));
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
      const url = editingEvent 
        ? `/api/calendar/event?id=${editingEvent.id}`
        : '/api/calendar/event';
      
      const method = editingEvent ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        let errorText = '';
        try {
          const errorJson = await response.json();
          errorText = errorJson.error || JSON.stringify(errorJson);
        } catch (e) {
          errorText = await response.text();
        }
        throw new Error(errorText || `Failed to save event: ${response.status}`);
      }

      const result = await response.json();

      // Add the new event to the cached events instead of reloading
      const newEvent: CalendarEvent = {
        id: result.id,
        summary: eventData.summary,
        description: eventData.description,
        start: { dateTime: eventData.start },
        end: { dateTime: eventData.end },
        calendarId: eventData.calendarId,
        source: eventData.source,
        tags: eventData.tags || [],
        location: eventData.location,
        htmlLink: result.htmlLink,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      
      addEvent(newEvent);
      
      // Close the form
      setIsEventFormOpen(false);
      setEditingEvent(null);
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

      removeEvent(event.id);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  // Update default view setting
  const updateDefaultView = async (newView: string) => {
    try {
      const response = await fetch('/api/userSettings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          defaultView: newView,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update default view');
      }
    } catch (error) {
      console.error('Error updating default view:', error);
    }
  };

  // Simplified loading state management
  const hasEvents = events && events.length > 0;

  if (!user || status === 'unauthenticated') {
    return (
      <MainLayout requiresAuth={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-grey-tint">Please sign in to access your calendar.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show skeleton only during initial loading, not during background refreshes
  if (isLoading && !hasEvents && !fetchError) {
    return (
      <MainLayout requiresAuth={true}>
        <Head>
          <title>Calendar | FlowHub</title>
          <meta name="description" content="Manage your events and schedule with FlowHub's intelligent calendar" />
        </Head>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md animate-pulse">
                  <span className="text-white text-lg">📅</span>
                </div>
                <div>
                  <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white mb-2">Calendar</h1>
                  <p className="text-grey-tint">Loading your events...</p>
                </div>
              </div>
              {/* Loading indicator */}
              <div className="flex items-center space-x-2 text-primary-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                <span className="text-sm">Loading...</span>
              </div>
            </div>
          </div>
          
          {/* Loading skeleton */}
          <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 animate-pulse">
            {/* Calendar controls skeleton */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="flex space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
            
            {/* Calendar grid skeleton */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
              {/* Day headers */}
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="p-3 text-center bg-gray-100 dark:bg-gray-800">
                  <div className="h-5 w-10 mx-auto bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
              
              {/* Calendar cells */}
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[120px] bg-soft-white dark:bg-gray-800 p-3">
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
      </MainLayout>
    );
  }

  // Handle persistent errors that should show error state
  if ((settingsError || fetchError) && !isLoading && !hasEvents) {
    return (
      <MainLayout requiresAuth={true}>
        <Head>
          <title>Calendar | FlowHub</title>
          <meta name="description" content="Manage your events and schedule with FlowHub's intelligent calendar" />
        </Head>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-2xl shadow-xl">
            <h3 className="font-heading font-bold text-lg mb-3">Calendar Load Error</h3>
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
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.href = '/dashboard/settings?tab=calendar'}
                className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
              >
                Check Settings
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const viewTabs = [
    { id: 'day', label: 'Day', icon: CalendarIcon },
    { id: 'week', label: 'Week', icon: ViewColumnsIcon },
    { id: 'month', label: 'Month', icon: CalendarDaysIcon },
    { id: 'agenda', label: 'Agenda', icon: ListBulletIcon },
    { id: 'timeline', label: 'Timeline', icon: ChartBarIcon }
  ];

  return (
    <MainLayout requiresAuth={true}>
      <Head>
        <title>Calendar | FlowHub</title>
        <meta name="description" content="Manage your events and schedule with FlowHub's intelligent calendar" />
      </Head>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg">📅</span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
              Calendar
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Background refresh indicator */}
            {isBackgroundRefreshing && (
              <div className="flex items-center space-x-2 text-primary-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                <span className="text-sm hidden sm:inline">Syncing...</span>
              </div>
            )}
            
            {/* Settings button */}
            <button
              onClick={() => window.location.href = '/dashboard/settings?tab=calendar'}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Calendar Settings"
            >
              <CogIcon className="w-4 h-4" />
            </button>
            
            {/* Manual refresh button */}
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              title="Refresh calendar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventFormOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add Event</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6 shadow-md overflow-x-auto">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentView(tab.id as any);
                updateDefaultView(tab.id);
              }}
              className={`flex-shrink-0 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                currentView === tab.id
                  ? 'bg-soft-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-lg'
                  : 'text-grey-tint hover:text-dark-base dark:hover:text-soft-white hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">
                {tab.id === 'day' ? 'Day' : tab.id === 'week' ? 'Wk' : tab.id === 'month' ? 'Mo' : tab.id === 'agenda' ? 'Ag' : 'TL'}
              </span>
            </button>
          ))}
        </div>

        {/* Calendar Controls */}
        <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPrevious}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-grey-tint hover:text-dark-base dark:hover:text-soft-white transition-colors"
                aria-label={`Previous ${currentView}`}
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              
              <h2 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white">
                {currentView === 'day' 
                  ? format(currentDate, 'MMMM d, yyyy')
                  : currentView === 'week'
                  ? `Week of ${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                  : currentView === 'agenda' || currentView === 'timeline'
                  ? `${format(currentDate, 'MMM d')} - ${format(addDays(currentDate, 30), 'MMM d, yyyy')}`
                  : format(currentDate, 'MMMM yyyy')
                }
              </h2>
              
              <button
                onClick={goToNext}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-grey-tint hover:text-dark-base dark:hover:text-soft-white transition-colors"
                aria-label={`Next ${currentView}`}
              >
                <ArrowRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Today Button */}
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Today
            </button>
          </div>
        </div>

        {/* Calendar Views */}
        <div className="bg-soft-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
          {/* Month View */}
          {currentView === 'month' && (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-4 text-center font-medium text-grey-tint bg-gray-50 dark:bg-gray-700">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day[0]}</span>
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
                      className={`min-h-[100px] sm:min-h-[120px] p-2 sm:p-3 border-b border-r border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        !isCurrentMonth ? 'text-grey-tint bg-gray-50 dark:bg-gray-800/50' : 'bg-soft-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-medium ${
                          isTodayDate
                            ? 'bg-primary-500 text-white rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm'
                            : 'text-dark-base dark:text-soft-white'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {isCurrentMonth && dayEvents.length > 0 && (
                          <span className="text-xs text-grey-tint bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, isMobile ? 2 : 3).map(event => {
                          const colorClass = event.source === 'work'
                            ? 'border-l-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                            : 'border-l-2 border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-900 dark:text-accent-100';
                          
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
                                <div className="text-xs opacity-75 truncate">
                                  {formatTime(event.start)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.length > (isMobile ? 2 : 3) && (
                          <div
                            className="text-xs text-grey-tint text-center py-1 cursor-pointer hover:underline"
                            onClick={() => {
                              setCurrentDate(day);
                              setCurrentView('day');
                            }}
                          >
                            +{dayEvents.length - (isMobile ? 2 : 3)} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Week View */}
          {currentView === 'week' && (
            <div className="p-6">
              <div className="space-y-4">
                {eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) }).map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div key={day.toISOString()} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                      <div className="flex items-center mb-3">
                        <span className={`text-lg font-heading font-semibold mr-4 ${
                          isTodayDate
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-dark-base dark:text-soft-white'
                        }`}>
                          {format(day, 'EEEE, MMM d')}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-sm text-grey-tint bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {dayEvents.length} events
                          </span>
                        )}
                      </div>
                      
                      {dayEvents.length === 0 ? (
                        <p className="text-grey-tint text-sm italic">No events scheduled</p>
                      ) : (
                        <div className="space-y-2">
                          {dayEvents.map(event => {
                            const colorClass = event.source === 'work'
                              ? 'border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-l-4 border-accent-500 bg-accent-50 dark:bg-accent-900/20';
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-4 rounded-xl cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="font-medium text-dark-base dark:text-soft-white">
                                      {event.summary || event.title || "No Title"}
                                    </div>
                                    {event.start && (
                                      <div className="text-sm text-grey-tint mt-1 flex items-center">
                                        <ClockIcon className="w-4 h-4 mr-1" />
                                        {formatTime(event.start)}
                                        {event.end && (
                                          <span> - {formatTime(event.end)}</span>
                                        )}
                                      </div>
                                    )}
                                    {event.location && (
                                      <div className="text-sm text-grey-tint mt-1 flex items-center">
                                        <MapPinIcon className="w-4 h-4 mr-1" />
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      event.source === 'work'
                                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                        : 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
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

          {/* Day View */}
          {currentView === 'day' && (
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white">
                  {format(currentDate, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <div className="space-y-4">
                {getEventsForDay(currentDate).length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <CalendarIcon className="w-8 h-8 text-grey-tint" />
                    </div>
                    <p className="text-grey-tint mb-4">No events scheduled for today</p>
                    <button
                      onClick={() => {
                        setEditingEvent(null);
                        setIsEventFormOpen(true);
                      }}
                      className="inline-flex items-center px-6 py-3 bg-primary-500 text-white rounded-2xl hover:bg-primary-600 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Add Event
                    </button>
                  </div>
                ) : (
                  getEventsForDay(currentDate).map(event => {
                    const colorClass = event.source === 'work'
                      ? 'border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-l-4 border-accent-500 bg-accent-50 dark:bg-accent-900/20';
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-6 rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white mb-2">
                              {event.summary || event.title || "No Title"}
                            </div>
                            {event.start && (
                              <div className="text-sm text-grey-tint mb-2 flex items-center">
                                <ClockIcon className="w-4 h-4 mr-2" />
                                {formatDateTime(event.start)}
                                {event.end && (
                                  <span> - {formatDateTime(event.end)}</span>
                                )}
                              </div>
                            )}
                            {event.location && (
                              <div className="text-sm text-grey-tint mb-2 flex items-center">
                                <MapPinIcon className="w-4 h-4 mr-2" />
                                {event.location}
                              </div>
                            )}
                            {(() => {
                              const teamsLink = extractTeamsLink(event.description || '');
                              return teamsLink ? (
                                <div className="mt-3">
                                  <a
                                    href={teamsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg"
                                  >
                                    <LinkIcon className="w-4 h-4 mr-2" />
                                    Join Teams Meeting
                                  </a>
                                </div>
                              ) : event.description && !containsHTML(event.description) ? (
                                <div className="text-sm text-grey-tint mt-2">
                                  {event.description.length > 100 
                                    ? `${event.description.substring(0, 100)}...` 
                                    : event.description}
                                </div>
                              ) : null;
                            })()}
                          </div>
                          <div className="ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              event.source === 'work'
                                ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                : 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
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

          {/* Agenda View */}
          {currentView === 'agenda' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white">
                  Upcoming Events
                </h3>
                <p className="text-grey-tint mt-1">Next 30 days</p>
              </div>
              
              <div className="space-y-4">
                {events
                  .filter(event => {
                    const eventDate = getEventDate(event);
                    const rangeStart = startOfDay(currentDate);
                    const rangeEnd = addDays(rangeStart, 30);
                    return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
                  })
                  .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
                  .reduce((acc, event) => {
                    const eventDate = format(getEventDate(event), 'yyyy-MM-dd');
                    if (!acc[eventDate]) acc[eventDate] = [];
                    acc[eventDate].push(event);
                    return acc;
                  }, {} as Record<string, CalendarEvent[]>)
                }
                {Object.keys(events
                  .filter(event => {
                    const eventDate = getEventDate(event);
                    const rangeStart = startOfDay(currentDate);
                    const rangeEnd = addDays(rangeStart, 30);
                    return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
                  })
                  .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
                  .reduce((acc, event) => {
                    const eventDate = format(getEventDate(event), 'yyyy-MM-dd');
                    if (!acc[eventDate]) acc[eventDate] = [];
                    acc[eventDate].push(event);
                    return acc;
                  }, {} as Record<string, CalendarEvent[]>)).length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                      <ListBulletIcon className="w-8 h-8 text-grey-tint" />
                    </div>
                    <p className="text-grey-tint">No upcoming events</p>
                  </div>
                ) : (
                  Object.entries(events
                    .filter(event => {
                      const eventDate = getEventDate(event);
                      const rangeStart = startOfDay(currentDate);
                      const rangeEnd = addDays(rangeStart, 30);
                      return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
                    })
                    .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
                    .reduce((acc, event) => {
                      const eventDate = format(getEventDate(event), 'yyyy-MM-dd');
                      if (!acc[eventDate]) acc[eventDate] = [];
                      acc[eventDate].push(event);
                      return acc;
                    }, {} as Record<string, CalendarEvent[]>)).map(([dateStr, dayEvents]) => {
                    const date = parseISO(dateStr);
                    const isTodayDate = isToday(date);
                    
                    return (
                      <div key={dateStr} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                        <div className="flex items-center mb-3">
                          <span className={`text-lg font-heading font-semibold mr-4 ${
                            isTodayDate
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-dark-base dark:text-soft-white'
                          }`}>
                            {format(date, 'EEEE, MMM d, yyyy')}
                            {isTodayDate && <span className="ml-2 text-sm font-normal">(Today)</span>}
                          </span>
                          <span className="text-sm text-grey-tint bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {dayEvents.length} events
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          {dayEvents.map(event => {
                            const colorClass = event.source === 'work'
                              ? 'border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-l-4 border-accent-500 bg-accent-50 dark:bg-accent-900/20';
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-4 rounded-xl cursor-pointer transition-transform hover:scale-[1.02] ${colorClass}`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="font-medium text-dark-base dark:text-soft-white">
                                      {event.summary || event.title || "No Title"}
                                    </div>
                                    <div className="text-sm text-grey-tint mt-1 flex items-center">
                                      <ClockIcon className="w-4 h-4 mr-1" />
                                      {formatTime(event.start)}
                                      {event.end && <span> - {formatTime(event.end)}</span>}
                                      {event.location && (
                                        <>
                                          <span className="mx-2">•</span>
                                          <MapPinIcon className="w-4 h-4 mr-1" />
                                          {event.location}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    event.source === 'work'
                                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                      : 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
                                  }`}>
                                    {event.source === 'work' ? 'Work' : 'Personal'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Timeline View */}
          {currentView === 'timeline' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-heading font-semibold text-dark-base dark:text-soft-white">
                  Timeline View
                </h3>
                <p className="text-grey-tint mt-1">Chronological event timeline</p>
              </div>
              
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-accent-500"></div>
                
                <div className="space-y-6">
                  {events
                    .filter(event => {
                      const eventDate = getEventDate(event);
                      const rangeStart = startOfDay(currentDate);
                      const rangeEnd = addDays(rangeStart, 30);
                      return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
                    })
                    .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
                    .length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <ChartBarIcon className="w-8 h-8 text-grey-tint" />
                      </div>
                      <p className="text-grey-tint">No events in timeline</p>
                    </div>
                  ) : (
                    events
                      .filter(event => {
                        const eventDate = getEventDate(event);
                        const rangeStart = startOfDay(currentDate);
                        const rangeEnd = addDays(rangeStart, 30);
                        return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
                      })
                      .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
                      .map((event, index) => {
                        const colorClass = event.source === 'work'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-accent-500 bg-accent-50 dark:bg-accent-900/20';
                        const dotColor = event.source === 'work' ? 'bg-primary-500' : 'bg-accent-500';
                        
                        return (
                          <div key={event.id} className="relative flex items-start">
                            {/* Timeline dot */}
                            <div className={`absolute left-5 w-3 h-3 ${dotColor} rounded-full border-2 border-soft-white dark:border-gray-800 z-10`}></div>
                            
                            {/* Event content */}
                            <div className="ml-12 flex-1">
                              <div
                                onClick={() => setSelectedEvent(event)}
                                className={`p-6 rounded-2xl border-l-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${colorClass}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-lg font-heading font-semibold text-dark-base dark:text-soft-white">
                                    {event.summary || event.title || "No Title"}
                                  </h4>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    event.source === 'work'
                                      ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                      : 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
                                  }`}>
                                    {event.source === 'work' ? 'Work' : 'Personal'}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="text-sm text-grey-tint flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    {format(getEventDate(event), 'EEEE, MMM d, yyyy')}
                                  </div>
                                  
                                  {event.start && (
                                    <div className="text-sm text-grey-tint flex items-center">
                                      <ClockIcon className="w-4 h-4 mr-2" />
                                      {formatTime(event.start)}
                                      {event.end && <span> - {formatTime(event.end)}</span>}
                                    </div>
                                  )}
                                  
                                  {event.location && (
                                    <div className="text-sm text-grey-tint flex items-center">
                                      <MapPinIcon className="w-4 h-4 mr-2" />
                                      {event.location}
                                    </div>
                                  )}
                                  
                                  {event.description && !containsHTML(event.description) && (
                                    <div className="text-sm text-grey-tint mt-2">
                                      {event.description.length > 150 
                                        ? `${event.description.substring(0, 150)}...` 
                                        : event.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button (Mobile) */}
        {isMobile && (
          <button
            onClick={() => {
              setEditingEvent(null);
              setIsEventFormOpen(true);
            }}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 z-20"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-soft-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-heading font-bold text-dark-base dark:text-soft-white">
                  {selectedEvent.summary || selectedEvent.title || "No Title"}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingEvent(selectedEvent);
                      setIsEventFormOpen(true);
                      setSelectedEvent(null);
                    }}
                    className="p-2 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    aria-label="Edit"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEventDelete(selectedEvent)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    aria-label="Delete"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 text-grey-tint hover:text-dark-base dark:hover:text-soft-white transition-colors"
                    aria-label="Close"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Event details */}
              <div className="space-y-4 text-grey-tint">
                {/* Color indicator */}
                <div className={`w-full h-2 rounded-full mb-4 ${
                  selectedEvent.source === 'work' ? 'bg-primary-500' : 'bg-accent-500'
                }`}></div>
                
                {/* Time details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <CalendarIcon className="w-5 h-5 mr-3 text-primary-500" />
                    <div>
                      <span className="font-medium text-grey-tint">Start:</span>
                      <span className="ml-2 text-dark-base dark:text-soft-white">{formatDateTime(selectedEvent.start)}</span>
                    </div>
                  </div>
                  
                  {selectedEvent.end && (
                    <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <ClockIcon className="w-5 h-5 mr-3 text-primary-500" />
                      <div>
                        <span className="font-medium text-grey-tint">End:</span>
                        <span className="ml-2 text-dark-base dark:text-soft-white">{formatDateTime(selectedEvent.end)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <MapPinIcon className="w-5 h-5 mr-3 text-primary-500" />
                    <div>
                      <span className="font-medium text-grey-tint">Location:</span>
                      <span className="ml-2 text-dark-base dark:text-soft-white">{selectedEvent.location}</span>
                    </div>
                  </div>
                )}
                
                {/* Source */}
                {selectedEvent.source && (
                  <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <EyeIcon className="w-5 h-5 mr-3 text-primary-500" />
                    <div>
                      <span className="font-medium text-grey-tint">Type:</span>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                        selectedEvent.source === 'work' 
                          ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                          : 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200'
                      }`}>
                        {selectedEvent.source === 'work' ? 'Work' : 'Personal'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Microsoft Teams Meeting Link */}
                {(() => {
                  const teamsLink = extractTeamsLink(selectedEvent.description || '');
                  return teamsLink ? (
                    <div className="flex items-center p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl border border-primary-200 dark:border-primary-700">
                      <LinkIcon className="w-5 h-5 mr-3 text-primary-500" />
                      <div>
                        <span className="font-medium text-primary-700 dark:text-primary-300">Microsoft Teams Meeting:</span>
                        <a 
                          href={teamsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 underline font-medium"
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
                    <div className="flex items-center mb-3">
                      <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium text-dark-base dark:text-soft-white">Description:</span>
                    </div>
                    <div className="mt-1 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-grey-tint">
                      {containsHTML(selectedEvent.description) ? (
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
                      <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="font-medium text-dark-base dark:text-soft-white">Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 dark:bg-gray-700 text-grey-tint px-3 py-1 rounded-full text-sm">
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
            Array.isArray(calendarList)
              ? (Array.isArray(settings?.selectedCals) && settings.selectedCals.length > 0
                  ? calendarList.filter(cal => settings.selectedCals.includes(cal.id))
                  : calendarList)
              : []
          }
        />
      </div>
    </MainLayout>
  );
};

export default CalendarPage;