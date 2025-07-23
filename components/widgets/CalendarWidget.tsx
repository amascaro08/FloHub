import React, { useEffect, useState, memo, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useUser } from '@/lib/hooks/useUser';
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO

import type {
  CalendarEvent,
  CalendarSettings,
  CalendarEventDateTime,
} from "../../types/calendar.d.ts";

type CalendarEventDateTimeType = CalendarEventDateTime | Date;

// Helper type guard to check if an object is a Date
function isDate(obj: any): obj is Date {
  return obj instanceof Date;
}

// Helper type guard to check if an object is a CalendarEventDateTime
function isCalendarEventDateTime(obj: any): obj is CalendarEventDateTime {
  return obj && (typeof obj.dateTime === 'string' || typeof obj.date === 'string' || obj.dateTime === null || obj.date === null);
}

type ViewType = 'today' | 'tomorrow' | 'week' | 'month' | 'custom';
type CustomRange = { start: string; end: string };

// Generic fetcher for SWR
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

// Optimized fetcher specifically for calendar events API with smart caching
const calendarEventsFetcher = async (url: string): Promise<CalendarEvent[]> => {
  try {
    console.log("CalendarWidget: Fetching from URL:", url);
    
    // Check if we have a cached version first
    const cacheKey = `calendar_events_${btoa(url)}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Use cache if less than 2 minutes old
        if (Date.now() - timestamp < 120000) {
          console.log("CalendarWidget: Using cached data");
          return data;
        }
      }
    } catch (e) {
      // Invalid cache or sessionStorage unavailable, continue to fetch
    }
    
    const res = await fetch(url, { 
      credentials: 'include',
      headers: {
        'Cache-Control': 'max-age=60'
      }
    });
    
    let data;
    try {
      data = await res.json();
    } catch (parseError) {
      console.error("Calendar API JSON parse error:", parseError);
      throw new Error(`Failed to parse response: ${res.status} ${res.statusText}`);
    }
    
    if (!res.ok) {
      console.error("Calendar API error details:", {
        status: res.status,
        statusText: res.statusText,
        url: url,
        response: data
      });
      throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
    }
    
    // Handle both formats: direct array or {events: [...]} object 
    let events;
    if (Array.isArray(data)) {
      console.log("CalendarWidget: Received", data.length, "events directly");
      events = data;
    } else if (data && Array.isArray(data.events)) {
      console.log("CalendarWidget: Received", data.events.length, "events in events property");
      events = data.events;
    } else {
      console.error("CalendarWidget: Unexpected response format:", data);
      events = [];
    }

    // Cache the result
    try {
      const cacheKey = `calendar_events_${btoa(url)}`;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: events,
        timestamp: Date.now()
      }));
    } catch (e) {
      // SessionStorage full or unavailable, continue without caching
    }

    return events;
  } catch (error) {
    console.error("CalendarWidget: Calendar fetch error:", error);
    throw error;
  }
};

function CalendarWidget() {
  const { user, isLoading } = useUser();
  const { mutate } = useSWRConfig();

  if (isLoading) { // Correctly check for loading status
    return <div>Loading calendar...</div>; // Or any other fallback UI
  }

  if (!user || !user.email) {
    return <div className="text-neutral-500 dark:text-neutral-400 text-center py-8">
      Please sign in to view your calendar
    </div>;
  }

  // Fetch persistent user settings via SWR with optimized caching
  const { data: loadedSettings, error: settingsError } =
    useSWR<CalendarSettings>(
      user ? "/api/userSettings" : null, 
      fetcher,
      {
        revalidateOnFocus: false,
        dedupingInterval: 300000, // 5 minutes
        errorRetryCount: 1,
        errorRetryInterval: 10000,
      }
    );

  // Local state derived from loadedSettings or defaults
  const [selectedCals, setSelectedCals] = useState<string[]>(['primary']);
  const [activeView, setActiveView] = useState<ViewType>('week');
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>("");

  // Other local state
  const [timeRange, setTimeRange] = useState<{ timeMin: string; timeMax: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<{
    calendarId: string;
    summary: string;
    start: string;
    end: string;
    timeZone?: string; // Add timezone field
  }>({ calendarId: '', summary: '', start: '', end: '' });

  // Update local state when loadedSettings changes
  useEffect(() => {
    if (loadedSettings) {
      console.log("CalendarWidget loaded settings:", {
        selectedCals: loadedSettings.selectedCals,
        defaultView: loadedSettings.defaultView,
        hasPowerAutomateUrl: !!loadedSettings.powerAutomateUrl,
        hasCalendarSources: !!loadedSettings.calendarSources
      });
      if (Array.isArray(loadedSettings.selectedCals) && loadedSettings.selectedCals.length > 0) {
        setSelectedCals(loadedSettings.selectedCals);
        console.log("CalendarWidget: Set selectedCals to:", loadedSettings.selectedCals);
      } else {
        setSelectedCals(['primary']); // Default if empty/invalid
        console.log("CalendarWidget: No selectedCals found, using default ['primary']");
      }
      if (['today', 'tomorrow', 'week', 'month', 'custom'].includes(loadedSettings.defaultView)) {
        setActiveView(loadedSettings.defaultView);
      } else {
        setActiveView('week'); // Default
      }
      if (
        loadedSettings.customRange &&
        typeof loadedSettings.customRange.start === 'string' &&
        typeof loadedSettings.customRange.end === 'string'
      ) {
        setCustomRange(loadedSettings.customRange);
      } else {
        // Initialize with default if needed
        const today = new Date().toISOString().slice(0, 10);
        setCustomRange({ start: today, end: today });
      }
      setPowerAutomateUrl(loadedSettings.powerAutomateUrl || "");
    }
  }, [loadedSettings]);

  // Memoize time range calculation to prevent unnecessary recalculations
  const calculatedTimeRange = useMemo(() => {
    const now = new Date();
    let minDate = new Date();
    let maxDate = new Date();
    const startOfDay = (d: Date): Date => {
      const newDate = new Date(d);
      newDate.setHours(0, 0, 0, 0);
      return newDate;
    };
    const endOfDay = (d: Date): Date => {
      const newDate = new Date(d);
      newDate.setHours(23, 59, 59, 999);
      return newDate;
    };

    switch (activeView) {
      case 'today':
        minDate = startOfDay(new Date(now));
        maxDate = endOfDay(new Date(now));
        break;
      case 'tomorrow':
        const t = new Date(now);
        t.setDate(t.getDate() + 1);
        minDate = startOfDay(t);
        maxDate = endOfDay(t);
        break;
      case 'week': {
        const currentDate = new Date(now); // Don't mutate the original now
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(currentDate.setDate(diff));
        minDate = startOfDay(new Date(monday));
        maxDate = endOfDay(new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000));
        break;
      }
      case 'month':
        minDate = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        maxDate = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'custom': {
        const cs = new Date(customRange.start);
        const ce = new Date(customRange.end);
        if (!isNaN(cs.getTime()) && !isNaN(ce.getTime()) && cs <= ce) {
          minDate = startOfDay(cs);
          maxDate = endOfDay(ce);
        } else {
          // Fallback to week
          const dd = now.getDay();
          const diff2 = now.getDate() - dd + (dd === 0 ? -6 : 1);
          const monday2 = new Date(now.setDate(diff2));
          minDate = startOfDay(new Date(monday2));
          maxDate = endOfDay(new Date(monday2.getTime() + 6 * 24 * 60 * 60 * 1000));
        }
        break;
      }
      default:
        // default to week
        const defaultDate = new Date(now); // Don't mutate the original now
        const ddd = defaultDate.getDay();
        const diff3 = defaultDate.getDate() - ddd + (ddd === 0 ? -6 : 1);
        const monday3 = new Date(defaultDate.setDate(diff3));
        minDate = startOfDay(new Date(monday3));
        maxDate = endOfDay(new Date(monday3.getTime() + 6 * 24 * 60 * 60 * 1000));
    }
    
    return { timeMin: minDate.toISOString(), timeMax: maxDate.toISOString() };
  }, [activeView, customRange]);

  // Update timeRange when calculatedTimeRange changes
  useEffect(() => {
    setTimeRange(calculatedTimeRange);
  }, [calculatedTimeRange]);

  // Build API URL for calendar events
  const apiUrl = useMemo(() => {
    // Wait for user, settings, and timeRange to be ready
    if (!user || !loadedSettings || !timeRange || !timeRange.timeMin || !timeRange.timeMax) {
      console.log("CalendarWidget: Not ready yet:", {
        hasUser: !!user,
        hasSettings: !!loadedSettings,
        hasTimeRange: !!timeRange,
        timeRange: timeRange
      });
      return null;
    }
    
    const url = `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(
      timeRange.timeMax
    )}&useCalendarSources=true${
      powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
    }`;
    
    console.log("CalendarWidget: Built API URL:", url);
    return url;
  }, [user, loadedSettings, timeRange, powerAutomateUrl]);

  // Fetch calendar events with optimized error handling and caching
  const { data, error } = useSWR(
    apiUrl, 
    calendarEventsFetcher,
    {
      revalidateOnFocus: false,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      dedupingInterval: 120000, // 2 minutes
      refreshInterval: 300000, // 5 minutes
      onError: (error) => {
        console.log("SWR calendar error:", error);
      }
    }
  );

  // Debug logs for API URL and error
  useEffect(() => {
    if (apiUrl) {
      console.log("CalendarWidget: Fetching calendar events from:", apiUrl);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (error) {
      console.error("CalendarWidget: Error fetching calendar events:", error);
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      console.log("CalendarWidget: Calendar events data:", data);
    }
  }, [data]);

  const hasValidCalendar = loadedSettings && (
    (loadedSettings.selectedCals && loadedSettings.selectedCals.length > 0) ||
    (loadedSettings.calendarSources && Array.isArray(loadedSettings.calendarSources) && loadedSettings.calendarSources.length > 0)
  );
  
  console.log("CalendarWidget: hasValidCalendar:", hasValidCalendar, {
    hasSettings: !!loadedSettings,
    selectedCals: loadedSettings?.selectedCals,
    calendarSources: loadedSettings?.calendarSources
  });

  // Filter out past events and find the next upcoming event
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcomingEvents = data
    ? data
        .filter((event, index, self) => // Filter out duplicates based on ID
          index === self.findIndex((e) => e.id === event.id)
        )
        .filter(ev => {
          // Get start date based on type
          let eventStartDate: Date | null = null;
          let eventEndDate: Date | null = null;
          
          if (isDate(ev.start)) {
            eventStartDate = ev.start;
          } else if (isCalendarEventDateTime(ev.start)) {
            eventStartDate = ev.start.dateTime ? parseISO(ev.start.dateTime) :
                            (ev.start.date ? parseISO(ev.start.date) : null);
          }
          
          if (ev.end) {
            if (isDate(ev.end)) {
              eventEndDate = ev.end;
            } else if (isCalendarEventDateTime(ev.end)) {
              eventEndDate = ev.end.dateTime ? parseISO(ev.end.dateTime) :
                            (ev.end.date ? parseISO(ev.end.date) : null);
            }
          }

          console.log("Filtering event:", ev.summary, "Start:", eventStartDate, "End:", eventEndDate);
          console.log("Current time (local):", now);
          console.log("Start of today (local):", startOfToday);
          console.log("Active view:", activeView);

          if (!eventStartDate) return false; // Must have a start time/date

          // For 'today' and 'tomorrow' views, filter out events that have already ended relative to the current time.
          // For other views, assume the API has provided events within the requested range,
          // and we only need to ensure the event hasn't ended before the start of the *current* day.
          if (activeView === 'today' || activeView === 'tomorrow') {
             if (eventEndDate) {
               return eventEndDate.getTime() >= now.getTime();
             } else if (isCalendarEventDateTime(ev.start)) {
                const start = ev.start as CalendarEventDateTime;
                if (start.date && !start.dateTime) {
                  // All-day event today/tomorrow
                  const date = start.date;
                  const allDayEndDate = date ? new Date(date) : null;
                  if (!allDayEndDate) return false;
                  allDayEndDate.setHours(23, 59, 59, 999);
                  return allDayEndDate.getTime() >= now.getTime();
                } else {
                  return false;
                }
             } else {
                // Timed event with no end time? Assume it's ongoing from start time
                return eventStartDate.getTime() >= now.getTime();
             }
          } else {
            // For week, month, custom, show events that start on or after the start of today,
            // and are within the API's fetched range (which is handled by timeRange).
            // This prevents showing events from the past days of the current week/month/custom range.
            return eventStartDate.getTime() >= startOfToday.getTime();
          }
        })
    : [];

  // The next upcoming event is the first one in the sorted, filtered list
  // Note: Sorting is handled by the API, but we re-sort here just in case or for client-side additions
  upcomingEvents.sort((a, b) => {
    let dateA = 0;
    let dateB = 0;
    
    if (isDate(a.start)) {
      dateA = a.start.getTime();
    } else if (isCalendarEventDateTime(a.start)) {
      dateA = a.start.dateTime ? new Date(a.start.dateTime).getTime() :
             (a.start.date ? new Date(a.start.date).getTime() : 0);
    }
    
    if (isDate(b.start)) {
      dateB = b.start.getTime();
    } else if (isCalendarEventDateTime(b.start)) {
      dateB = b.start.dateTime ? new Date(b.start.dateTime).getTime() :
             (b.start.date ? new Date(b.start.date).getTime() : 0);
    }
    
    return dateA - dateB;
  });

  const nextUpcomingEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;


  // Format event for display
  const formatEvent = (ev: CalendarEvent) => {
   if (isCalendarEventDateTime(ev.start)) {
     const start = ev.start as CalendarEventDateTime;
     if (start.date && !start.dateTime) {
      const date = start.date;
      const d = date ? new Date(date) : null;
      return d ? d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : "Unknown date format";
    }
    const dateTime = start.dateTime;
    const date = start.date;
    const dt = dateTime ? new Date(dateTime) : date ? new Date(date) : null;
    return dt ? dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "Unknown date format";
  } else if (isDate(ev.start)) {
    return (ev.start as Date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  return "Unknown date format";
};

  // Handlers for opening modal
  const openAdd = () => {
    setEditingEvent(null);
    setForm({
      calendarId: selectedCals[0] || '',
      summary: '',
      start: '',
      end: '',
    });
    setModalOpen(true);
  };
  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    
    let startStr = '';
    let endStr = '';
    
    if (isCalendarEventDateTime(ev.start)) {
      const start = ev.start as CalendarEventDateTime;
      startStr = start.dateTime || (start.date ? `${start.date}T00:00` : '');
    } else if (isDate(ev.start)) {
      startStr = (ev.start as Date).toISOString().substring(0, 16);
    }
    
    if (ev.end) {
      if (isCalendarEventDateTime(ev.end)) {
        const end = ev.end as CalendarEventDateTime;
        endStr = end.dateTime || (end.date ? `${end.date}T00:00` : '');
      } else if (isDate(ev.end)) {
        endStr = (ev.end as Date).toISOString().substring(0, 16);
      }
    }
    
    setForm({
      calendarId: selectedCals[0] || '',
      summary: ev.summary || '',
      start: startStr,
      end: endStr,
    });
    setModalOpen(true);
  };

  // Handlers for saving/deleting events (simplified for now)
  const handleSaveEvent = async () => {
    console.log("Saving event:", form);
    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const url = editingEvent ? `/api/calendar/event?id=${editingEvent.id}` : '/api/calendar/event';

      // Parse start and end times from datetime-local strings and convert to UTC ISO strings
      // new Date('YYYY-MM-DDTHH:mm') is parsed as local time
      const startLocal = form.start ? new Date(form.start) : undefined;
      const endLocal = form.end ? new Date(form.end) : undefined;

      const startUtc = startLocal && !isNaN(startLocal.getTime()) ? startLocal.toISOString() : undefined;
      const endUtc = endLocal && !isNaN(endLocal.getTime()) ? endLocal.toISOString() : undefined;

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarId: form.calendarId,
          summary: form.summary,
          start: startUtc, // Send UTC ISO string
          end: endUtc,     // Send UTC ISO string
          // No need to send timezone if backend expects UTC
        }),
      });

      if (!res.ok) {
        const errorInfo = await res.json();
        throw new Error(errorInfo.error || `HTTP error! status: ${res.status}`);
      }

      const savedEvent = await res.json();
      console.log("Event saved successfully:", savedEvent);

      setModalOpen(false);
      // Trigger revalidation after potential save
      if (apiUrl) mutate(apiUrl);

    } catch (error) {
      console.error("Failed to save event:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeleteEvent = async (eventId: string, calendarId?: string) => {
    console.log("Deleting event:", eventId, "from calendar:", calendarId);
    if (!viewingEvent) return; // Should not happen if button is visible, but for safety
    
    try {
      // Use the provided calendarId or fall back to a default if not available
      const effectiveCalendarId = calendarId || viewingEvent.calendarId || 'primary';
      const url = `/api/calendar/event?id=${eventId}&calendarId=${effectiveCalendarId}`;

      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorInfo = await res.json();
        throw new Error(errorInfo.error || `HTTP error! status: ${res.status}`);
      }

      console.log("Event deleted successfully:", eventId);

      setViewingEvent(null); // Close the details modal
      // Trigger revalidation after successful delete
      if (apiUrl) mutate(apiUrl);

    } catch (error) {
      console.error("Failed to delete event:", error);
      // TODO: Show error message to user
    }
  };


  return (
    <div className="relative">
      {!hasValidCalendar ? (
        <div className="text-neutral-500 dark:text-neutral-400 flex items-center justify-center py-8">
          Please select a valid calendar in your <a href="/dashboard/settings" className="text-teal-500 hover:text-teal-400 underline ml-1" target="_blank" rel="noopener noreferrer">settings</a>.
        </div>
      ) : (
        <>
          {/* Time Frame Selector */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => setActiveView('today')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'today'
                    ? 'bg-teal-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setActiveView('tomorrow')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'tomorrow'
                    ? 'bg-teal-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Tomorrow
              </button>
              <button
                onClick={() => setActiveView('week')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'week'
                    ? 'bg-teal-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Events Display */}
          <div className="space-y-3">
            {!apiUrl && (
              <div className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                Loading calendar configuration...
              </div>
            )}
            
            {apiUrl && !data && !error && (
              <div className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                Loading events...
              </div>
            )}
            
            {error && (
              <div className="text-amber-600 dark:text-amber-400 text-sm p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="font-medium mb-1">Calendar Temporarily Unavailable</div>
                <div className="text-xs">
                  We're having trouble connecting to your calendar right now. This could be due to:
                  <ul className="mt-1 ml-4 list-disc">
                    <li>Authentication needs to be refreshed</li>
                    <li>Network connectivity issues</li>
                    <li>Calendar service maintenance</li>
                  </ul>
                </div>
                <div className="mt-2">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-blue-600 hover:text-blue-700 underline text-xs"
                  >
                    Try reloading the page
                  </button>
                </div>
              </div>
            )}
            
            {!error && data && upcomingEvents.length === 0 && (
              <div className="text-neutral-500 dark:text-neutral-400 text-center py-8">
                No upcoming events found
              </div>
            )}
            
            {!error && data && upcomingEvents.length > 0 && 
              upcomingEvents.slice(0, 5).map((event, index) => {
                const teamsLink = event.description ? extractTeamsLink(event.description) : null;
                const isNextUpcoming = event === nextUpcomingEvent;
                
                                 return (
                   <div
                     key={`${event.id}-${index}`}
                     className={`p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
                       isNextUpcoming ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : ''
                     }`}
                     onClick={() => setViewingEvent(event)}
                   >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {isNextUpcoming && <span className="text-teal-600 mr-2">📍</span>}
                          {event.summary || "Untitled Event"}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {formatEvent(event)}
                        </p>
                        {event.calendarName && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                            {event.calendarName}
                            {event.source === "work" && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Work
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      
                                             {/* Teams Link Button */}
                       {teamsLink && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             window.open(teamsLink, '_blank');
                           }}
                           className="ml-3 flex-shrink-0 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                           title="Join Teams Meeting"
                         >
                          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.16 12a4.16 4.16 0 0 1-4.16 4.16H12v4a4 4 0 0 1-8 0v-4H2.16A2.16 2.16 0 0 1 0 13.84V2.16A2.16 2.16 0 0 1 2.16 0h11.68A2.16 2.16 0 0 1 16 2.16v7.68a2.16 2.16 0 0 1 2.16-2.16h2A2.16 2.16 0 0 1 22.32 9.84v2.16a2.16 2.16 0 0 1-2.16 2.16Z"/>
                          </svg>
                          Teams
                        </button>
                      )}
                    </div>
                  </div>
                                 );
               })
             }
          </div>

          {/* Add Event Button */}
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={openAdd}
              className="w-full px-3 py-2 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
            >
              + Add Event
            </button>
          </div>

          {/* Add/Edit Event Modal */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">
                  {editingEvent ? 'Edit Event' : 'Add Event'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={form.summary}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      className="w-full p-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600"
                      placeholder="Event title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Start</label>
                    <input
                      type="datetime-local"
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className="w-full p-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End</label>
                    <input
                      type="datetime-local"
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className="w-full p-2 border rounded-md dark:bg-neutral-700 dark:border-neutral-600"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleSaveEvent}
                    className="flex-1 bg-teal-500 text-white py-2 rounded-md hover:bg-teal-600 transition-colors"
                  >
                    {editingEvent ? 'Update' : 'Create'}
                  </button>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 bg-neutral-200 dark:bg-neutral-600 py-2 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Event Details Modal */}
          {viewingEvent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">{viewingEvent.summary}</h3>
                <div className="space-y-2">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {formatEvent(viewingEvent)}
                  </p>
                  {viewingEvent.description && (
                    <p className="text-sm">{viewingEvent.description}</p>
                  )}
                  {/* Teams Link in Modal */}
                  {extractTeamsLink(viewingEvent.description || '') && (
                    <button
                      onClick={() => window.open(extractTeamsLink(viewingEvent.description || '') || '', '_blank')}
                      className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.16 12a4.16 4.16 0 0 1-4.16 4.16H12v4a4 4 0 0 1-8 0v-4H2.16A2.16 2.16 0 0 1 0 13.84V2.16A2.16 2.16 0 0 1 2.16 0h11.68A2.16 2.16 0 0 1 16 2.16v7.68a2.16 2.16 0 0 1 2.16-2.16h2A2.16 2.16 0 0 1 22.32 9.84v2.16a2.16 2.16 0 0 1-2.16 2.16Z"/>
                      </svg>
                      Join Teams Meeting
                    </button>
                  )}
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => openEdit(viewingEvent)}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(viewingEvent.id, viewingEvent.calendarId)}
                    className="flex-1 bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setViewingEvent(null)}
                    className="flex-1 bg-neutral-200 dark:bg-neutral-600 py-2 rounded-md hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export default memo(CalendarWidget);

{"\n"}
