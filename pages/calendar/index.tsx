import React, { useState, useEffect, useMemo, useCallback, ErrorInfo } from 'react';
import useSWR from 'swr';
import { useUser } from "@/lib/hooks/useUser";
import Head from 'next/head';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, getDay, startOfWeek, endOfWeek, addDays, isToday, isSameMonth, startOfDay, endOfDay, addWeeks, subWeeks, isWithinInterval, setHours, setMinutes, setSeconds, startOfHour, addHours, isSameHour } from 'date-fns';
import { CalendarEvent, CalendarSettings } from '@/types/calendar';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
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

// Error Boundary Component
class CalendarErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Calendar Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-6 rounded-2xl shadow-xl">
            <h3 className="font-heading font-bold text-lg mb-3">Calendar Error</h3>
            <p className="mb-4">There was an error loading the calendar. Please refresh the page or contact support if this persists.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

  // Enable background sync for Power Automate events
  useBackgroundSync({
    enabled: true,
    intervalMinutes: 30, // Sync if 30+ minutes since last sync
    onSyncStart: () => console.log('Background Power Automate sync started'),
    onSyncComplete: () => console.log('Background Power Automate sync completed'),
    onSyncError: (error) => console.warn('Background Power Automate sync error:', error)
  });

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'day' | 'week' | 'month' | 'agenda'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const agendaRef = React.useRef<HTMLDivElement>(null);

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

  // Calculate date range for current view - fixed to prevent excessive re-renders
  const getDateRange = useCallback(() => {
    if (currentView === 'day') {
      const start = startOfDay(currentDate);
      const end = endOfDay(currentDate);
      return { start, end };
    } else if (currentView === 'week') {
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return { start, end };
    } else if (currentView === 'agenda') {
      // For agenda view, focus on current day
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

  // Set initial view based on settings - only run once
  useEffect(() => {
    if (settings?.defaultView) {
      const viewMapping: Record<string, 'day' | 'week' | 'month' | 'agenda'> = {
        'today': 'day',
        'tomorrow': 'day',
        'week': 'week',
        'month': 'month',
        'agenda': 'agenda',
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

  // Generate hash of calendar sources to detect changes - extra stable to prevent loops
  const calendarSourcesHash = useMemo(() => {
    if (!settings?.calendarSources) {
      return 'empty';
    }
    
    // Only include essential properties that actually matter for calendar loading
    const stableSourcesData = settings.calendarSources
      .filter(source => source && source.isEnabled) // Only enabled sources, check for null/undefined
      .map(source => ({
        type: source.type || 'unknown',
        sourceId: source.sourceId || 'unknown',
        connectionData: source.connectionData || '',
        isEnabled: source.isEnabled
      }))
      .sort((a, b) => {
        // Safe sorting with null checks
        const aKey = `${a.type || ''}:${a.sourceId || ''}`;
        const bKey = `${b.type || ''}:${b.sourceId || ''}`;
        return aKey.localeCompare(bKey);
      }); // Stable sort
    
    return generateCalendarSourcesHash(stableSourcesData as any);
  }, [settings?.calendarSources?.length, settings?.calendarSources?.map(s => `${s?.type || ''}:${s?.sourceId || ''}:${s?.isEnabled || false}`).join('|')]);

  // Use cached calendar events hook with stable parameters
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

  // Safe date parsing function
  const safeParseDate = (dateInput: any): Date => {
    try {
      if (!dateInput) return new Date();
      
      if (dateInput instanceof Date) {
        return dateInput;
      }
      
      if (typeof dateInput === 'object') {
        if (dateInput.dateTime) {
          const parsed = parseISO(dateInput.dateTime);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        if (dateInput.date) {
          const parsed = parseISO(dateInput.date);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
      }
      
      if (typeof dateInput === 'string') {
        const parsed = parseISO(dateInput);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      
      return new Date();
    } catch (error) {
      console.warn('Error parsing date:', dateInput, error);
      return new Date();
    }
  };

  // Safe event date getter
  const getEventDate = (event: CalendarEvent): Date => {
    try {
      return safeParseDate(event.start);
    } catch (error) {
      console.warn('Error getting event date:', event, error);
      return new Date();
    }
  };

  // Safe date time formatter
  const formatDateTime = (dateTime: any): string => {
    try {
      if (!dateTime) return '';
      
      const date = safeParseDate(dateTime);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      console.warn('Error formatting date time:', dateTime, error);
      return '';
    }
  };

  // Safe time formatter
  const formatTime = (dateTime: any): string => {
    try {
      if (!dateTime) return '';
      
      const date = safeParseDate(dateTime);
      return format(date, 'h:mm a');
    } catch (error) {
      console.warn('Error formatting time:', dateTime, error);
      return '';
    }
  };

  // Helper function to get event color classes
  const getEventColorClasses = (event: CalendarEvent, type: 'border' | 'background' | 'text' = 'border') => {
    if (event.color) {
      // Use custom color
      return {
        style: {
          '--event-color': event.color,
          borderLeftColor: type === 'border' ? event.color : undefined,
          backgroundColor: type === 'background' ? `${event.color}20` : undefined,
          color: type === 'text' ? event.color : undefined,
        },
        className: type === 'border' ? 'border-l-2' : type === 'background' ? 'bg-opacity-20' : '',
      };
    } else {
      // Fallback to source-based colors
      const colorClass = event.source === 'work'
        ? (type === 'border' ? 'border-l-2 border-primary-500' : 
           type === 'background' ? 'bg-primary-50 dark:bg-primary-900/20' : 
           'text-primary-900 dark:text-primary-100')
        : (type === 'border' ? 'border-l-2 border-accent-500' : 
           type === 'background' ? 'bg-accent-50 dark:bg-accent-900/20' : 
           'text-accent-900 dark:text-accent-100');
      
      return {
        style: {},
        className: colorClass,
      };
    }
  };

  const goToPrevious = () => {
    if (currentView === 'month') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (currentView === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else if (currentView === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (currentView === 'agenda') {
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
    } else if (currentView === 'agenda') {
      setCurrentDate(prev => addDays(prev, 30));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDay = (day: Date) => {
    try {
      if (!Array.isArray(events)) return [];
      
      return events.filter(event => {
        try {
          if (!event || !event.start) return false;
          const eventDate = getEventDate(event);
          return isSameDay(eventDate, day);
        } catch (error) {
          console.warn('Error filtering event for day:', event, error);
          return false;
        }
      }).sort((a, b) => {
        try {
          const aDate = getEventDate(a);
          const bDate = getEventDate(b);
          return aDate.getTime() - bDate.getTime();
        } catch (error) {
          console.warn('Error sorting events:', a, b, error);
          return 0;
        }
      });
    } catch (error) {
      console.warn('Error in getEventsForDay:', error);
      return [];
    }
  };

  // Helper function to get events for a specific time slot (30 minutes)
  const getEventsForSlot = useCallback((slot: Date) => {
    try {
      if (!Array.isArray(events)) return [];
      
      const slotEnd = addHours(slot, 0.5); // 30 minutes later
      
      return events.filter(event => {
        try {
          if (!event || !event.start) return false;
          const eventStart = getEventDate(event);
          const eventEnd = event.end ? safeParseDate(event.end) : eventStart;
          
          // Check if event overlaps with this 30-minute slot
          return (eventStart < slotEnd && eventEnd >= slot);
        } catch (error) {
          console.warn('Error filtering event for slot:', event, error);
          return false;
        }
      }).sort((a, b) => {
        try {
          const aDate = getEventDate(a);
          const bDate = getEventDate(b);
          return aDate.getTime() - bDate.getTime();
        } catch (error) {
          console.warn('Error sorting events by slot:', a, b, error);
          return 0;
        }
      });
    } catch (error) {
      console.warn('Error in getEventsForSlot:', error);
      return [];
    }
  }, [events]);

  // Generate half-hour slots for agenda view
  const agendaSlots = useMemo(() => {
    const slots: Date[] = [];
    const baseDate = isToday(currentDate) ? new Date() : currentDate;
    const startTime = startOfDay(baseDate);
    
    // Generate 48 half-hour slots (24 hours * 2)
    for (let i = 0; i < 48; i++) {
      const slot = addHours(startTime, i * 0.5);
      slots.push(slot);
    }
    
    return slots;
  }, [currentDate]);

  // Autoscroll to current hour when agenda view is opened
  useEffect(() => {
    if (currentView === 'agenda' && agendaRef.current && isToday(currentDate)) {
      setTimeout(() => {
        const currentHour = new Date().getHours();
        const currentSlotIndex = currentHour * 2; // Two slots per hour
        const currentSlotElement = agendaRef.current?.querySelector(`[data-slot-index="${currentSlotIndex}"]`);
        
        if (currentSlotElement) {
          currentSlotElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  }, [currentView, currentDate]);

  const getEventsForCurrentView = () => {
    try {
      if (currentView === 'day') {
        return getEventsForDay(currentDate);
      }
      return Array.isArray(events) ? events : [];
    } catch (error) {
      console.warn('Error in getEventsForCurrentView:', error);
      return [];
    }
  };

  // Calculate calendar days for the current month
  const calendarDays = useMemo(() => {
    try {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } catch (error) {
      console.warn('Error calculating calendar days:', error);
      return [];
    }
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-grey-tint">Please sign in to access your calendar.</p>
        </div>
      </div>
    );
  }

  // Show skeleton only during initial loading, not during background refreshes
  if (isLoading && !hasEvents && !fetchError) {
    return (
      <>
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
      </>
    );
  }

  // Handle persistent errors that should show error state
  if ((settingsError || fetchError) && !isLoading && !hasEvents) {
    return (
      <>
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
      </>
    );
  }

  const viewTabs = [
    { id: 'day', label: 'Day', icon: CalendarIcon },
    { id: 'week', label: 'Week', icon: ViewColumnsIcon },
    { id: 'month', label: 'Month', icon: CalendarDaysIcon },
    { id: 'agenda', label: 'Agenda', icon: ListBulletIcon }
  ];

  return (
    <CalendarErrorBoundary>
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
                {tab.id === 'day' ? 'Day' : tab.id === 'week' ? 'Wk' : tab.id === 'month' ? 'Mo' : 'Ag'}
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
                  : currentView === 'agenda'
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
                          if (!event || !event.id) return null; // Safety check
                          
                          const borderStyle = getEventColorClasses(event, 'border');
                          const bgStyle = getEventColorClasses(event, 'background');
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`text-xs p-2 rounded cursor-pointer transition-transform hover:scale-[1.02] ${borderStyle.className} ${bgStyle.className}`}
                              style={{ ...borderStyle.style, ...bgStyle.style }}
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
                        }).filter(Boolean)}
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
                            const borderStyle = getEventColorClasses(event, 'border');
                            const bgStyle = getEventColorClasses(event, 'background');
                            const combinedBorder = borderStyle.className.replace('border-l-2', 'border-l-4');
                            
                            return (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-4 rounded-xl cursor-pointer transition-transform hover:scale-[1.02] ${combinedBorder} ${bgStyle.className}`}
                                style={{ ...borderStyle.style, ...bgStyle.style, borderLeftWidth: '4px' }}
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
                    const borderStyle = getEventColorClasses(event, 'border');
                    const bgStyle = getEventColorClasses(event, 'background');
                    const combinedBorder = borderStyle.className.replace('border-l-2', 'border-l-4');
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-6 rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] ${combinedBorder} ${bgStyle.className}`}
                        style={{ ...borderStyle.style, ...bgStyle.style, borderLeftWidth: '4px' }}
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
                  {isToday(currentDate) ? "Today's Schedule" : `Schedule for ${format(currentDate, 'EEEE, MMM d, yyyy')}`}
                </h3>
                <p className="text-grey-tint mt-1">30-minute intervals with events</p>
              </div>
              
              <div ref={agendaRef} className="space-y-1 max-h-[600px] overflow-y-auto">
                {agendaSlots.map((slot, index) => {
                  const slotEvents = getEventsForSlot(slot);
                  const isPastSlot = isToday(currentDate) && slot < new Date();
                  const isCurrentSlot = isToday(currentDate) && 
                    slot <= new Date() && 
                    addHours(slot, 0.5) > new Date();
                  
                  return (
                    <div 
                      key={slot.toISOString()}
                      data-slot-index={index}
                      className={`border-l-4 rounded-lg transition-all duration-200 ${
                        isCurrentSlot 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg' 
                          : isPastSlot
                          ? 'border-gray-300 bg-gray-50 dark:bg-gray-800/50 opacity-75'
                          : 'border-gray-200 dark:border-gray-700 bg-soft-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-base font-mono font-semibold ${
                              isCurrentSlot 
                                ? 'text-primary-600 dark:text-primary-400' 
                                : isPastSlot
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-dark-base dark:text-soft-white'
                            }`}>
                              {format(slot, 'h:mm a')}
                            </span>
                            {isCurrentSlot && (
                              <span className="px-2 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 text-xs font-medium rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          {slotEvents.length > 0 && (
                            <span className="text-sm text-grey-tint bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {slotEvents.length} event{slotEvents.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                        
                        {slotEvents.length === 0 ? (
                          <div className="h-4"></div> // Small spacer for empty slots
                        ) : (
                          <div className="space-y-2 pl-4">
                            {slotEvents.map(event => {
                              const borderStyle = getEventColorClasses(event, 'border');
                              const bgStyle = getEventColorClasses(event, 'background');
                              
                              return (
                                <div
                                  key={event.id}
                                  onClick={() => setSelectedEvent(event)}
                                  className={`p-2 rounded-lg cursor-pointer transition-transform hover:scale-[1.02] ${borderStyle.className} ${bgStyle.className}`}
                                  style={{ ...borderStyle.style, ...bgStyle.style }}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium text-dark-base dark:text-soft-white text-sm">
                                        {event.summary || event.title || "No Title"}
                                      </div>
                                      <div className="text-xs text-grey-tint mt-1 flex items-center">
                                        <ClockIcon className="w-3 h-3 mr-1" />
                                        {formatTime(event.start)}
                                        {event.end && <span> - {formatTime(event.end)}</span>}
                                        {event.location && (
                                          <>
                                            <span className="mx-2">•</span>
                                            <MapPinIcon className="w-3 h-3 mr-1" />
                                            <span className="truncate max-w-[120px]">{event.location}</span>
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
                        )}
                      </div>
                    </div>
                  );
                })}
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
                <div 
                  className="w-full h-2 rounded-full mb-4" 
                  style={{ 
                    backgroundColor: selectedEvent.color || (selectedEvent.source === 'work' ? '#3b82f6' : '#10b981') 
                  }}
                ></div>
                
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
    </CalendarErrorBoundary>
  );
};

export default CalendarPage;