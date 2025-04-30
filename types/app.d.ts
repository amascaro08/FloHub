// types/app.d.ts

// Define shared application types here

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
};