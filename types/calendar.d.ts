// Unified CalendarEvent type that works across all components
export interface CalendarEventDateTime {
  dateTime?: string | null;
  date?: string | null;
  timeZone?: string | null;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  title?: string; // Some APIs return title instead of summary
  start: CalendarEventDateTime | Date;
  end?: CalendarEventDateTime | Date;
  description?: string;
  calendarId?: string;
  source?: "personal" | "work";
  calendarName?: string;
  tags?: string[];
  location?: string;
  htmlLink?: string; // Google Calendar event link
  created?: string; // ISO string for creation time
  updated?: string; // ISO string for last update time
  organizer?: {
    email?: string;
    name?: string;
    displayName?: string;
  }; // Event organizer information
  // Recurring event fields
  isRecurring?: boolean; // Whether this event is part of a recurring series
  seriesMasterId?: string; // ID of the series master for recurring events
  instanceIndex?: number; // Index of this instance within the recurring series
}

// Settings type for calendar components
export interface CalendarSettings {
  selectedCals: string[];
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  defaultCalendarView?: "day" | "week" | "month"; // New setting for calendar page view mode
  customRange: { start: string; end: string };
  powerAutomateUrl?: string;
  // Additional settings used in other components
  calendarSources?: string[];
  floCatStyle?: string;
  floCatPersonality?: string;
  preferredName?: string;
  // Add any other settings properties used across the app
}

// Response type for calendar API
export interface GetCalendarEventsResponse {
  events?: CalendarEvent[];
  error?: string;
}

// Task type for widget fetchers
export interface Task {
  id: string;
  text: string;
  completed: boolean;
  source?: "personal" | "work";
  createdAt: string;
  updatedAt?: string;
}

// Note type for widget fetchers
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

// Habit type for widget fetchers
export interface Habit {
  id: string;
  name: string;
  frequency: string;
  createdAt: string;
}

// HabitCompletion type for widget fetchers
export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}