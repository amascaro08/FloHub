import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useSession } from "next-auth/react"; // Import useSession
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO

// Define Settings type (can be moved to a shared types file)
export type Settings = {
  selectedCals: string[];
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  customRange: { start: string; end: string };
  powerAutomateUrl?: string;
};

type ViewType = 'today' | 'tomorrow' | 'week' | 'month' | 'custom';
type CustomRange = { start: string; end: string };

export interface CalendarEvent {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work"; // "personal" = Google, "work" = O365
  description?: string; // Add description field
}

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
  return data;
};

export default function CalendarWidget() {
  const { data: session } = useSession(); // Get session for conditional fetching
  const { mutate } = useSWRConfig();

  // Fetch persistent user settings via SWR
  const { data: loadedSettings, error: settingsError } =
    useSWR<Settings>(session ? "/api/userSettings" : null, fetcher);

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
    const startOfDay = (d: Date) => (d.setHours(0, 0, 0, 0), d);
    const endOfDay = (d: Date) => (d.setHours(23, 59, 59, 999), d);

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
        // default to week
        const ddd = now.getDay();
        const diff3 = now.getDate() - ddd + (ddd === 0 ? -6 : 1);
        const monday3 = new Date(now.setDate(diff3));
        minDate = startOfDay(new Date(monday3));
        maxDate = endOfDay(new Date(monday3.getTime() + 6 * 24 * 60 * 60 * 1000));
    }
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


  // Filter out past events and find the next upcoming event
  const now = new Date();
  const upcomingEvents = data
    ? data.filter(ev => {
        const eventTime = ev.start.dateTime ? new Date(ev.start.dateTime) : (ev.start.date ? new Date(ev.start.date) : null);
        // Keep events that are currently ongoing or in the future
        return eventTime && (eventTime.getTime() >= now.getTime() || (ev.end?.dateTime && new Date(ev.end.dateTime).getTime() > now.getTime()));
      })
    : [];

  // The next upcoming event is the first one in the sorted, filtered list
  const nextUpcomingEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;


  // Format event for display
  const formatEvent = (ev: CalendarEvent) => {
    if (ev.start.date && !ev.start.dateTime) {
      const d = new Date(ev.start.date);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    const dt = new Date(ev.start.dateTime || ev.start.date!);
    return dt.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
    setForm({
      calendarId: selectedCals[0] || '',
      summary: ev.summary || '',
      start: ev.start.dateTime || `${ev.start.date}T00:00`,
      end: ev.end?.dateTime || `${ev.end?.date}T00:00`,
    });
    setModalOpen(true);
  };

  // Handlers for saving/deleting events (simplified for now)
  const handleSaveEvent = async () => {
    // TODO: Implement actual save logic using API
    console.log("Saving event:", form);
    setModalOpen(false);
    // Trigger revalidation after potential save
    if (apiUrl) mutate(apiUrl);
  };

  const handleDeleteEvent = async (eventId: string) => {
    // TODO: Implement actual delete logic using API
    console.log("Deleting event:", eventId);
    setViewingEvent(null);
    // Trigger revalidation after potential delete
    if (apiUrl) mutate(apiUrl);
  };


  return (
    <div className="p-4 bg-[var(--surface)] rounded-lg shadow relative"> {/* Add relative positioning */}
      {/* Event Details Modal */}
      {viewingEvent && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingEvent(null)}> {/* Change to absolute positioning */}
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}> {/* max-h-full to constrain within parent */}
            <h3 className="text-lg font-semibold mb-4">Event Details</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title: </span>
                {viewingEvent.summary || "(No title)"}
              </div>
              <div>
                <span className="font-medium">When: </span>
                {formatEvent(viewingEvent)}
              </div>
              <div>
                <span className="font-medium">Type: </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${
                    viewingEvent.source === "work"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {viewingEvent.source === "work" ? "Work" : "Personal"}
                </span>
              </div>
              {viewingEvent.description && (
                <div>
                  <span className="font-medium">Description: </span>
                  {viewingEvent.description}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {/* TODO: Implement actual edit/delete functionality */}
              {/* <button onClick={() => { setViewingEvent(null); openEdit(viewingEvent); }} className="px-3 py-1 border rounded">Edit</button> */}
              {/* <button onClick={() => handleDeleteEvent(viewingEvent.id)} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button> */}
              <button onClick={() => setViewingEvent(null)} className="px-3 py-1 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {modalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              {editingEvent ? "Edit Event" : "Add Event"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Calendar</label>
                <select
                  value={form.calendarId}
                  onChange={(e) => setForm((f) => ({ ...f, calendarId: e.target.value }))}
                  className="mt-1 block w-full border px-2 py-1 text-[var(--fg)]"
                >
                  {selectedCals.map((id) => (
                    <option key={id} value={id} className="text-[var(--fg)]">
                      {id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  className="mt-1 block w-full border px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Start</label>
                <input
                  type="datetime-local"
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  className="mt-1 block w-full border px-2 py-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">End</label>
                <input
                  type="datetime-local"
                  value={form.end}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  className="mt-1 block w-full border px-2 py-1"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  className="px-3 py-1 bg-primary-500 text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event List */}
      <div className="overflow-y-auto">
        {!data && !error && <div className="text-[var(--fg-muted)]">Loading events...</div>}
        {error && <div className="text-red-500">Error loading events: {error.message}</div>}
        {upcomingEvents.length === 0 && !error && !(!data && !error) && <div className="text-[var(--fg-muted)]">No upcoming events scheduled.</div>} {/* Use upcomingEvents */}
        {upcomingEvents.length > 0 && (
          <ul className="space-y-2">
            {upcomingEvents.map((ev) => ( // Use upcomingEvents
              <li
                key={ev.id}
                className={`border-b pb-2 flex justify-between items-center cursor-pointer transition ${
                  ev.id === nextUpcomingEvent?.id // Check if it's the next upcoming event
                    ? 'bg-yellow-100 hover:bg-yellow-200 border-yellow-500' // Highlight style
                    : 'hover:bg-[var(--neutral-100)]' // Default hover style
                }`}
                onClick={() => setViewingEvent(ev)}
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {ev.summary || '(No title)'}
                    {ev.source && (
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          ev.source === "work"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {ev.source === "work" ? "Work" : "Personal"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--fg-muted)]">{formatEvent(ev)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
