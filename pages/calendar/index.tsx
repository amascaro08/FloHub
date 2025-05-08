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
  const [events, setEvents] = useState([]);
  const { data: settings, error: settingsError } = useSWR<Settings>('/api/userSettings', fetcher);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!settings?.selectedCals) {
        return; // Don't fetch if settings or selectedCals is missing
      }

      try {
        const calendarIds = settings.selectedCals;
        const calendarIdParams = calendarIds.map(id => `calendarId=${encodeURIComponent(id)}`).join('&');
        const response = await fetch(`/api/calendar/events?${calendarIdParams}`);
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [settings]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Calendar</h1>
      <div style={{ height: 500 }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          defaultView="month"
          style={{ height: 500 }}
        />
      </div>
    </div>
  );
};

export default CalendarPage;