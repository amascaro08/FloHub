// types/app.d.ts

// Define shared application types here

export type Note = {
  id: string;
  content: string;
  tags: string[];
  createdAt: string; // Use string for the type as it's sent as ISO string from API
};