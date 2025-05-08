import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import useSWR from 'swr';

const localizer = momentLocalizer(moment);

// Define Settings type (can be moved to a shared types file)
type Settings = {
  selectedCals: string[];
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  customRange: { start: string; end: string };
  powerAutomateUrl?: string;
};

export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime: string | null; date: string | null; timeZone: string | null };
  end: { dateTime: string | null; date: string | null; timeZone: string | null };
  description?: string; // Add optional description field
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { data: settings, error: settingsError } = useSWR<Settings>('/api/userSettings', fetcher);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!settings?.selectedCals) {
        return; // Don't fetch if settings or selectedCals is missing
      }

      try {
        const calendarIds = settings.selectedCals;
        const calendarIdParam = `calendarId=${calendarIds.map(encodeURIComponent).join(',')}`;
        const response = await fetch(`/api/calendar/events?${calendarIdParam}`);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [settings]);

  // Function to determine the start date for the event
  const getStartDate = (event: CalendarEvent) => {
    return event.start.dateTime ? new Date(event.start.dateTime) : event.start.date ? new Date(event.start.date) : new Date();
  };

  // Function to determine the end date for the event
  const getEndDate = (event: CalendarEvent) => {
    return event.end.dateTime ? new Date(event.end.dateTime) : event.end.date ? new Date(event.end.date) : new Date();
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Calendar</h1>
      <div style={{ height: 500 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor={getStartDate}
          endAccessor={getEndDate}
          defaultView="month"
          style={{ height: 500 }}
        />
      </div>
    </div>
  );
};

export default CalendarPage;