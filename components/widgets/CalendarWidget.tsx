import React, { useEffect, useState, memo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useSession } from "next-auth/react"; // Import useSession
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
  const res = await fetch(url);
  if (!res.ok) {
    const errorInfo = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorInfo}`);
  }
  return res.json();
};

// Fetcher specifically for calendar events API
const calendarEventsFetcher = async (url: string): Promise<CalendarEvent[]> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error loading events');
  
  // Handle both formats: direct array or {events: [...]} object 
  if (Array.isArray(data)) {
    return data;
  } else if (data && Array.isArray(data.events)) {
    return data.events;
  } else {
    console.error("Unexpected response format from calendar API:", data);
    return [];
  }
};

function CalendarWidget() {
  const sessionHookResult = useSession();
  const session = sessionHookResult?.data ? sessionHookResult.data : null;
  const status = sessionHookResult?.status || "unauthenticated";
  const { mutate } = useSWRConfig();

  if (status === 'loading') { // Correctly check for loading status
    return <div>Loading...</div>; // Or any other fallback UI
  }

  // Fetch persistent user settings via SWR
  const { data: loadedSettings, error: settingsError } =
    useSWR<CalendarSettings>(session ? "/api/userSettings" : null, fetcher);

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
      console.log("CalendarWidget loaded settings:", loadedSettings);
      if (Array.isArray(loadedSettings.selectedCals) && loadedSettings.selectedCals.length > 0) {
        setSelectedCals(loadedSettings.selectedCals);
      } else {
        setSelectedCals(['primary']); // Default if empty/invalid
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

  // Calculate time range when view or customRange changes
  useEffect(() => {
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
        t.setDate(now.getDate() + 1);
        minDate = startOfDay(t);
        maxDate = endOfDay(t);
        break;
      case 'week': {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff));
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
        console.log("Calculated timeRange:", { timeMin: minDate.toISOString(), timeMax: maxDate.toISOString() });
        // default to week
        const ddd = now.getDay();
        const diff3 = now.getDate() - ddd + (ddd === 0 ? -6 : 1);
        const monday3 = new Date(now.setDate(diff3));
        minDate = startOfDay(new Date(monday3));
        maxDate = endOfDay(new Date(monday3.getTime() + 6 * 24 * 60 * 60 * 1000));
    }
    console.log("Calculated minDate (local):", minDate);
    console.log("Calculated maxDate (local):", maxDate);
    setTimeRange({ timeMin: minDate.toISOString(), timeMax: maxDate.toISOString() });
  }, [activeView, customRange]);

  // Build API URL for calendar events
  const apiUrl =
    timeRange &&
    `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(
      timeRange.timeMax
    )}${selectedCals.map((id) => `&calendarId=${encodeURIComponent(id)}`).join('')}${
      powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
    }`;

  // Fetch calendar events
  const { data, error } = useSWR(apiUrl, calendarEventsFetcher);

  // Debug logs for API URL and error
  useEffect(() => {
    if (apiUrl) {
      console.log("Fetching calendar events from:", apiUrl);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (error) {
      console.error("Error fetching calendar events:", error);
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      console.log("Calendar events data:", data);
    }
  }, [data]);

  const hasValidCalendar = loadedSettings && loadedSettings.selectedCals && loadedSettings.selectedCals.length > 0 && !loadedSettings.selectedCals.every(calId => calId === 'primary');

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
          Please select a valid calendar in your <a href="/dashboard/settings-modular" className="text-teal-500 hover:text-teal-400 underline ml-1" target="_blank" rel="noopener noreferrer">settings</a>.
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default memo(CalendarWidget);

{"\n"}
