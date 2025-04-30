// types/app.d.ts

// Define shared application types here

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
};