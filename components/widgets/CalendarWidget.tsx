import React, { useEffect, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

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

const fetcher = async (url: string): Promise<CalendarEvent[]> => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error loading events');
  return data;
};

export default function CalendarWidget() {
  const { mutate } = useSWRConfig();
  const [selectedCals, setSelectedCals] = useState<string[]>(['primary']);
  const [activeView, setActiveView] = useState<ViewType>('week');
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
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
  const [powerAutomateUrl, setPowerAutomateUrl] = useState<string>("");

  // Load calendar settings on mount
  useEffect(() => {
    const raw = localStorage.getItem('flohub.calendarSettings');
    if (raw) {
      try {
        const settings = JSON.parse(raw);
        if (Array.isArray(settings.selectedCals) && settings.selectedCals.length > 0) {
          setSelectedCals(settings.selectedCals);
        }
        if (['today', 'tomorrow', 'week', 'month', 'custom'].includes(settings.defaultView)) {
          setActiveView(settings.defaultView);
        }
        if (
          settings.customRange &&
          typeof settings.customRange.start === 'string' &&
          typeof settings.customRange.end === 'string'
        ) {
          setCustomRange({ start: settings.customRange.start, end: settings.customRange.end });
        }
        if (typeof settings.powerAutomateUrl === "string") {
          setPowerAutomateUrl(settings.powerAutomateUrl);
        }
      } catch (e) {
        console.error('Failed to parse calendar settings:', e);
      }
    }
  }, []);

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

  // Build API URL
  const apiUrl =
    timeRange &&
    `/api/calendar?timeMin=${encodeURIComponent(timeRange.timeMin)}&timeMax=${encodeURIComponent(
      timeRange.timeMax
    )}${selectedCals.map((id) => `&calendarId=${encodeURIComponent(id)}`).join('')}${
      powerAutomateUrl ? `&o365Url=${encodeURIComponent(powerAutomateUrl)}` : ''
    }`;

  const { data, error } = useSWR(apiUrl, fetcher);

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

  return (
    <div className="p-4 bg-[var(--surface)] rounded-lg shadow">
      {/* Event Details Modal */}
      {viewingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setViewingEvent(null)}>
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              {/* Event Description */}
              {viewingEvent.description && (
                <div>
                  <span className="font-medium">Details: </span>
                  {/* WARNING: Using dangerouslySetInnerHTML can expose to XSS attacks if content is not trusted */}
                  <div
                    className="prose prose-sm max-w-none mt-1"
                    dangerouslySetInnerHTML={{ __html: viewingEvent.description }}
                  />
                </div>
              )}

              {/* Show Teams link if present */}
              {(() => {
                let teamsLink = null;
                // Check summary first
                const summaryMatch = (viewingEvent.summary || "").match(/(https:\/\/teams\.microsoft\.com\/[^\s]+)/i);
                if (summaryMatch) {
                  teamsLink = summaryMatch[1];
                } else if (viewingEvent.description) {
                  // If no link in summary, parse description HTML
                  try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(viewingEvent.description, 'text/html');
                    const teamsAnchor = doc.querySelector('a[href*="teams.microsoft.com"]');
                    if (teamsAnchor && (teamsAnchor as HTMLAnchorElement).href) {
                      teamsLink = (teamsAnchor as HTMLAnchorElement).href;
                    }
                  } catch (e) {
                    console.error("Failed to parse HTML description for Teams link:", e);
                  }
                }

                if (teamsLink) {
                  return (
                    <div>
                      <a
                        href={teamsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded"
                      >
                        Join Meeting
                      </a>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingEvent(null)}
                className="px-3 py-1 border rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        {/* Removed redundant Calendar heading */}
        <button onClick={openAdd} className="px-2 py-1 bg-primary-500 text-white rounded text-sm">
          Add Event
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(['today', 'tomorrow', 'week', 'month', 'custom'] as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-3 py-1 rounded text-sm transition ${
              activeView === view
                ? 'bg-primary-500 text-white'
                : 'bg-[var(--neutral-200)] hover:bg-[var(--neutral-300)] text-[var(--fg-muted)]'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Custom Range Inputs */}
      {activeView === 'custom' && (
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => setCustomRange((cr) => ({ ...cr, start: e.target.value }))}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            min={customRange.start}
            value={customRange.end}
            onChange={(e) => setCustomRange((cr) => ({ ...cr, end: e.target.value }))}
            className="border px-2 py-1 rounded"
          />
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingEvent ? 'Edit Event' : 'Add Event'}
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
                  onClick={async () => {
                    const method = editingEvent ? 'PUT' : 'POST';
                    const payload: any = {
                      calendarId: form.calendarId,
                      summary: form.summary,
                      start: {}, // Initialize start and end as empty objects
                      end: {},
                    };

                    // Format date-time strings to ISO 8601 if not empty
                    if (form.start) {
                      try {
                        // Parse the local datetime string and convert to ISO string
                        // This assumes the input is in the user's local timezone
                        payload.start.dateTime = new Date(form.start).toISOString();
                      } catch (e) {
                        console.error("Failed to parse start date:", form.start, e);
                        alert("Invalid start date format.");
                        return;
                      }
                    }
                    if (form.end) {
                       try {
                        // Parse the local datetime string and convert to ISO string
                        // This assumes the input is in the user's local timezone
                        payload.end.dateTime = new Date(form.end).toISOString();
                      } catch (e) {
                        console.error("Failed to parse end date:", form.end, e);
                        alert("Invalid end date format.");
                        return;
                      }
                    }


                    if (editingEvent) payload.eventId = editingEvent.id;

                    // Basic validation before sending
                    if (!payload.calendarId || !payload.summary || !payload.start.dateTime || !payload.end.dateTime) {
                       alert("Please fill in all required fields (Calendar, Title, Start, End).");
                       return; // Stop here if validation fails
                     }

                     // Optional: Add validation to ensure end time is after start time
                     if (new Date(payload.start.dateTime) >= new Date(payload.end.dateTime)) {
                          alert("End time must be after start time.");
                          return;
                     }

                    // Make the API call
                    const response = await fetch('/api/calendar/event', {
                      method,
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        console.error("API Error:", response.status, errorData);
                        alert(`Failed to save event: ${errorData.error || 'Unknown error'}`);
                        return;
                    }


                    // If successful, revalidate SWR cache and close modal
                    if (apiUrl) mutate(apiUrl);
                    setModalOpen(false);
                  }}
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
        {upcomingEvents.length === 0 && <div className="text-[var(--fg-muted)]">No upcoming events scheduled.</div>} {/* Use upcomingEvents */}
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
                <button
                  onClick={e => {
                    e.stopPropagation();
                    openEdit(ev);
                  }}
                  className="text-sm text-primary-500 ml-2"
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
