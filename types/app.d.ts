// types/app.d.ts

// Define shared application types here

// Define a type for user settings
export type UserSettings = {
  selectedCals: string[]; // Legacy field for backward compatibility
  defaultView: "today" | "tomorrow" | "week" | "month" | "custom";
  customRange: { start: string; end: string };
  powerAutomateUrl?: string; // Legacy field for backward compatibility
  globalTags: string[]; // Field for global tags
  activeWidgets?: string[]; // Array of active widget IDs
  calendarSources?: CalendarSource[]; // New field for multiple calendar sources
  timezone?: string; // User's preferred timezone (e.g., "America/New_York")
  floCatStyle?: "default" | "more_catty" | "less_catty" | "professional"; // FloCat communication style
  floCatPersonality?: string[]; // Personality keywords for FloCat (e.g., "humorous", "sarcastic", "serious")
  preferredName?: string; // User's preferred name for FloCat to use
};

// Define a type for calendar sources
export type CalendarSource = {
  id: string; // Unique identifier for the calendar source
  name: string; // Display name for the calendar
  type: "google" | "o365" | "apple" | "other"; // Type of calendar
  sourceId: string; // Original calendar ID from the provider
  connectionData?: string; // Connection data (e.g., PowerAutomate URL for O365)
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