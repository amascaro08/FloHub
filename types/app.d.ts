// types/app.d.ts

// Define shared application types here

// Define a type for user settings
export type UserSettings = {
  selectedCals?: string[];
  defaultView?: "today" | "tomorrow" | "week" | "month" | "agenda" | "timeline" | "custom";
  customRange?: { start: string; end: string };
  powerAutomateUrl?: string;
  globalTags?: string[];
  activeWidgets?: string[];
  hiddenWidgets?: string[];
  calendarSources?: CalendarSource[];
  timezone?: string;
  floCatStyle?: "default" | "more_catty" | "less_catty" | "professional";
  floCatPersonality?: string[];
  preferredName?: string;
  tags?: string[];
  widgets?: string[];
  calendarSettings?: {
    calendars: string[];
  };
  notificationSettings?: {
    subscribed: boolean;
  };
  floCatSettings?: {
    enabledCapabilities: string[];
  };
  layouts?: { [key: string]: any };
  layoutTemplate?: string;
  slotAssignments?: { [slotId: string]: string | null };
};

// Define a type for calendar sources
export type CalendarSource = {
  id: string; // Unique identifier for the calendar source
  name: string; // Display name for the calendar
  type: "google" | "o365" | "apple" | "ical" | "other"; // Type of calendar
  sourceId: string; // Original calendar ID from the provider
  connectionData?: string; // Connection data (e.g., PowerAutomate URL for O365, iCal URL for ical)
  tags: string[]; // Tags for the calendar (e.g., "work", "personal")
  color?: string; // Optional color for the calendar
  isEnabled: boolean; // Whether the calendar is enabled
};

// Define a type for widget configuration
export type WidgetConfig = {
  id: string;
  name: string;
  description: string;
  component: string;
};

// Define a type for actions within a meeting note
export type Action = {
  id: string; // Unique ID for the action
  description: string;
  assignedTo: string; // e.g., "Me", "Other Person Name"
  status: "todo" | "done"; // Simple status
  createdAt: string; // Timestamp for when the action was added
  taskId?: string; // Optional: Link to task if assigned to "Me"
  dueDate?: string; // Optional: Due date for the action
  completedAt?: string; // Optional: When the action was completed
};

export type Note = {
  id: string;
  title?: string; // Add optional title field
  content: string;
  tags: string[];
  createdAt: string; // Use string for the type as it's sent as ISO string from API
  source?: string; // e.g., "quicknote", "notespage"
  // New fields for meeting notes
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
  actions?: Action[]; // Optional: Array of actions associated with the meeting note
  agenda?: string; // Optional: Meeting agenda
  aiSummary?: string; // Optional: AI-generated summary of the meeting
  // Manual linking fields
  linkedMeetingIds?: string[]; // Manually linked meeting note IDs for context building
  meetingSeries?: string; // Custom series name for grouping
};

// Enhanced MeetingNote type for dedicated meeting notes table
export type MeetingNote = {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  eventId?: string;
  eventTitle?: string;
  isAdhoc: boolean;
  actions?: Action[];
  agenda?: string;
  aiSummary?: string;
  meetingSeriesId?: string; // For linking related meetings (e.g., weekly standups)
  parentMeetingId?: string; // For follow-up meetings
  meetingDate?: string;
  attendees?: string[]; // List of attendee names/emails
  meetingType: 'regular' | 'standup' | 'review' | 'planning' | 'retrospective' | 'other';
  status: 'scheduled' | 'completed' | 'cancelled';
  source: 'manual' | 'calendar' | 'import';
};

// Define a type for tasks
export interface Task {
  id:        string;
  text:      string;
  done:      boolean;
  dueDate:   string | null;
  createdAt: string | null;
  source?:   "personal" | "work"; // Add source tag
  tags: string[]; // Add tags property
}

export interface WidgetProps {
  size?: 'small' | 'medium' | 'large' | 'hero';
  colSpan?: number;
  rowSpan?: number;
  isCompact?: boolean;
  isHero?: boolean;
}