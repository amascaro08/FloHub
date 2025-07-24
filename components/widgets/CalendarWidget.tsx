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

// Function to parse HTML content from Power Automate
const parseHTMLContent = (content: string): string => {
  if (!content) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Extract text content while preserving line breaks
  let textContent = tempDiv.textContent || tempDiv.innerText || '';
  
  // Clean up common HTML entities
  textContent = textContent
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return textContent;
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
        'Content-Type': 'application/json',
      }
    });
    
    if (!res.ok) {
      console.error('Calendar fetch failed:', res.status, res.statusText);
      throw new Error('Calendar fetch failed');
    }
    
    const data = await res.json();
    const events = Array.isArray(data) ? data : (data.events || []);
    
    // Cache the result
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: events,
        timestamp: Date.now()
      }));
    } catch (e) {
      // SessionStorage might be full or unavailable
      console.warn('Could not cache calendar data:', e);
    }
    
    return events;
  } catch (error) {
    console.error('CalendarWidget: Error fetching events:', error);
    throw error;
  }
};

function CalendarWidget() {
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  
  const [viewType, setViewType] = useState<ViewType>('today');
  const [customRange, setCustomRange] = useState<CustomRange>({ start: '', end: '' });
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    location: ''
  });

  // Memoized date calculations
  const dateRange = useMemo(() => {
    const now = new Date();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const startOfDay = (d: Date): Date => {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    
    const endOfDay = (d: Date): Date => {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    };

    let start: Date;
    let end: Date;

    switch (viewType) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        start = startOfDay(tomorrow);
        end = endOfDay(tomorrow);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        start = startOfDay(startOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        end = endOfDay(endOfWeek);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'custom':
        start = customRange.start ? new Date(customRange.start) : now;
        end = customRange.end ? new Date(customRange.end) : now;
        break;
      default:
        start = startOfDay(now);
        end = endOfDay(now);
    }

    return {
      start: formatInTimeZone(start, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX'),
      end: formatInTimeZone(end, userTimezone, 'yyyy-MM-dd\'T\'HH:mm:ssXXX'),
      userTimezone
    };
  }, [viewType, customRange]);

  // SWR for calendar events with optimized caching
  const { data: events, error, isLoading, mutate: refreshEvents } = useSWR(
    user ? `/api/calendar?timeMin=${encodeURIComponent(dateRange.start)}&timeMax=${encodeURIComponent(dateRange.end)}&useCalendarSources=true&userTimezone=${encodeURIComponent(dateRange.userTimezone)}` : null,
    calendarEventsFetcher,
    {
      dedupingInterval: 120000, // 2 minutes
      revalidateOnFocus: false,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      refreshInterval: 300000, // 5 minutes
    }
  );

  // SWR for user settings
  const { data: userSettings } = useSWR(
    user ? `/api/userSettings?userId=${user.primaryEmail}` : null,
    fetcher,
    {
      dedupingInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
    }
  );

  // Memoized event processing
  const processedEvents = useMemo(() => {
    if (!events) return [];
    
    return events.map((event: CalendarEvent) => {
      // Process event times
      let startTime: string;
      let endTime: string;
      
      if (event.start instanceof Date) {
        startTime = formatInTimeZone(event.start, dateRange.userTimezone, 'h:mm a');
      } else if (event.start?.dateTime) {
        startTime = formatInTimeZone(parseISO(event.start.dateTime), dateRange.userTimezone, 'h:mm a');
      } else {
        startTime = 'All day';
      }
      
      if (event.end instanceof Date) {
        endTime = formatInTimeZone(event.end, dateRange.userTimezone, 'h:mm a');
      } else if (event.end?.dateTime) {
        endTime = formatInTimeZone(parseISO(event.end.dateTime), dateRange.userTimezone, 'h:mm a');
      } else {
        endTime = '';
      }

      // Extract meeting links
      const teamsLink = event.description ? extractTeamsLink(event.description) : null;
      const zoomLink = event.description?.includes('zoom.us') ? 
        event.description.match(/https:\/\/[^\s]+zoom\.us[^\s]+/)?.[0] : null;

      return {
        ...event,
        startTime,
        endTime,
        teamsLink,
        zoomLink,
        hasMeetingLink: !!(teamsLink || zoomLink)
      };
    }).sort((a, b) => {
      // Sort by start time
      const aStart = a.start instanceof Date ? a.start : new Date(a.start?.dateTime || a.start?.date || '');
      const bStart = b.start instanceof Date ? b.start : new Date(b.start?.dateTime || b.start?.date || '');
      return aStart.getTime() - bStart.getTime();
    });
  }, [events, dateRange.userTimezone]);

  const formatEvent = (ev: CalendarEvent) => {
    const startTime = ev.start instanceof Date ? 
      formatInTimeZone(ev.start, dateRange.userTimezone, 'h:mm a') :
      ev.start?.dateTime ? 
        formatInTimeZone(parseISO(ev.start.dateTime), dateRange.userTimezone, 'h:mm a') : 
        'All day';
    
    const endTime = ev.end instanceof Date ? 
      formatInTimeZone(ev.end, dateRange.userTimezone, 'h:mm a') :
      ev.end?.dateTime ? 
        formatInTimeZone(parseISO(ev.end.dateTime), dateRange.userTimezone, 'h:mm a') : 
        '';

    return {
      ...ev,
      startTime,
      endTime
    };
  };

  const openAdd = () => {
    setNewEvent({
      summary: '',
      description: '',
      start: '',
      end: '',
      location: ''
    });
    setIsAddingEvent(true);
    setIsEditingEvent(false);
  };

  const openEdit = (ev: CalendarEvent) => {
    const formattedEvent = formatEvent(ev);
    setSelectedEvent(ev);
    setNewEvent({
      summary: formattedEvent.summary || '',
      description: formattedEvent.description || '',
      start: formattedEvent.start instanceof Date ? 
        formatInTimeZone(formattedEvent.start, dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm') :
        formattedEvent.start?.dateTime ? 
          formatInTimeZone(parseISO(formattedEvent.start.dateTime), dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm') :
          formatInTimeZone(new Date(), dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm'),
      end: formattedEvent.end instanceof Date ? 
        formatInTimeZone(formattedEvent.end, dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm') :
        formattedEvent.end?.dateTime ? 
          formatInTimeZone(parseISO(formattedEvent.end.dateTime), dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm') :
          formatInTimeZone(new Date(), dateRange.userTimezone, 'yyyy-MM-dd\'T\'HH:mm'),
      location: formattedEvent.location || ''
    });
    setIsEditingEvent(true);
    setIsAddingEvent(false);
  };

  const handleSaveEvent = async () => {
    try {
      const eventData = {
        summary: newEvent.summary,
        description: newEvent.description,
        start: {
          dateTime: newEvent.start,
          timeZone: dateRange.userTimezone
        },
        end: {
          dateTime: newEvent.end,
          timeZone: dateRange.userTimezone
        },
        location: newEvent.location
      };

      const url = isEditingEvent && selectedEvent ? 
        `/api/calendar/${selectedEvent.id}` : 
        '/api/calendar';

      const method = isEditingEvent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      // Refresh events and clear form
      await refreshEvents();
      setIsAddingEvent(false);
      setIsEditingEvent(false);
      setSelectedEvent(null);
      setNewEvent({
        summary: '',
        description: '',
        start: '',
        end: '',
        location: ''
      });
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: string, calendarId?: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ calendarId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh events
      await refreshEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const showEventDetails = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const joinMeeting = (event: any) => {
    const link = extractTeamsLink(event.description || '');
    if (link) {
      window.open(link, '_blank');
    }
  };

  if (error) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <div className="text-red-600 dark:text-red-400 mb-3">
          <h3 className="font-medium">Calendar Unavailable</h3>
          <p className="text-sm mt-1">
            Unable to load calendar events. Please check your connection and try again.
          </p>
        </div>
        <button 
          onClick={() => refreshEvents()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="calendar-widget h-full w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Calendar
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            {viewType === 'today' ? 'Today\'s Events' : 
             viewType === 'tomorrow' ? 'Tomorrow\'s Events' :
             viewType === 'week' ? 'This Week' :
             viewType === 'month' ? 'This Month' : 'Custom Range'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-gradient-to-r from-[#00C9A7] to-[#00A8A7] text-white rounded-lg hover:from-[#00A8A7] hover:to-[#009A8A] transition-all duration-200 font-medium"
        >
          + Add Event
        </button>
      </div>

      {/* View Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['today', 'tomorrow', 'week', 'month'] as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => setViewType(view)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewType === view
                ? 'bg-[#00C9A7] text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        ) : processedEvents.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              No events scheduled for this period
            </p>
          </div>
        ) : (
          processedEvents.map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => showEventDetails(event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {event.startTime}
                      {event.endTime && event.endTime !== event.startTime && ` - ${event.endTime}`}
                    </span>
                    {(extractTeamsLink(event.description || '')) && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                        📹 Meeting
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {event.summary}
                  </h3>
                  {event.location && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      📍 {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {containsHTML(event.description) ? parseHTMLContent(event.description) : event.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {(extractTeamsLink(event.description || '')) && (
                    <button
                      onClick={() => joinMeeting(event)}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Join Meeting"
                    >
                      🎥
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(event)}
                    className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="Edit Event"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id!, event.calendarId)}
                    className="p-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    title="Delete Event"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Event Modal */}
      {(isAddingEvent || isEditingEvent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {isAddingEvent ? 'Add New Event' : 'Edit Event'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title"
                value={newEvent.summary}
                onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="datetime-local"
                value={newEvent.start}
                onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="datetime-local"
                value={newEvent.end}
                onChange={(e) => setNewEvent({...newEvent, end: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Location (optional)"
                value={newEvent.location}
                onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <textarea
                placeholder="Description (optional)"
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEvent}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00C9A7] to-[#00A8A7] text-white rounded-lg hover:from-[#00A8A7] hover:to-[#009A8A] transition-all duration-200 font-medium"
              >
                {isAddingEvent ? 'Add Event' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setIsAddingEvent(false);
                  setIsEditingEvent(false);
                  setSelectedEvent(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetail && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Event Details
              </h3>
              <button
                onClick={() => setShowEventDetail(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {selectedEvent.summary}
                </h4>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>📅 {formatEvent(selectedEvent).startTime}</span>
                  {formatEvent(selectedEvent).endTime && formatEvent(selectedEvent).endTime !== formatEvent(selectedEvent).startTime && (
                    <span>⏰ {formatEvent(selectedEvent).endTime}</span>
                  )}
                </div>
              </div>

              {selectedEvent.location && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">📍 Location</h5>
                  <p className="text-gray-600 dark:text-gray-400">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">📝 Description</h5>
                  <div className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {containsHTML(selectedEvent.description) ? parseHTMLContent(selectedEvent.description) : selectedEvent.description}
                  </div>
                </div>
              )}

              {(extractTeamsLink(selectedEvent.description || '')) && (
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-1">🎥 Meeting Link</h5>
                  <button
                    onClick={() => joinMeeting(selectedEvent)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Join Meeting
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowEventDetail(false);
                  openEdit(selectedEvent);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00C9A7] to-[#00A8A7] text-white rounded-lg hover:from-[#00A8A7] hover:to-[#009A8A] transition-all duration-200 font-medium"
              >
                Edit Event
              </button>
              <button
                onClick={() => setShowEventDetail(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(CalendarWidget);
