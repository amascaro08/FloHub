// Unified CalendarEvent type that works across all components
export interface CalendarEvent {
  id: string;
  summary?: string;
  title?: string; // Some APIs return title instead of summary
  start: { 
    dateTime?: string | null; 
    date?: string | null; 
    timeZone?: string | null;
  } | Date;
  end?: { 
    dateTime?: string | null; 
    date?: string | null; 
    timeZone?: string | null;
  } | Date;
  description?: string;
  calendarId?: string;
  source?: "personal" | "work";
  calendarName?: string;
  tags?: string[];
}

// Settings type for calendar components
export interface CalendarSettings {
  selectedCals: string[];
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  customRange: { start: string; end: string };
  powerAutomateUrl?: string;
}

// Response type for calendar API
export interface GetCalendarEventsResponse {
  events?: CalendarEvent[];
  error?: string;
}