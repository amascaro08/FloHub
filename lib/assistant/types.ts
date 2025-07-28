/**
 * Type definitions for the AI Assistant module
 */

// Enhanced types for better contextual awareness
export type ChatRequest = {
  history?: { role: string; content: string }[];
  prompt?: string;
  message?: string; // Added for direct message support
  userInput?: string;
  style?: string;
  preferredName?: string;
  notes?: any[];
  meetings?: any[];
  contextData?: {
    tasks?: any[];
    events?: any[];
    habits?: any[];
    habitCompletions?: any[];
    allEvents?: any[];
    allTasks?: any[];
  };
};

export type ChatResponse = {
  reply?: string;
  error?: string;
  actions?: Array<{
    type: 'create_task' | 'create_event' | 'update_calendar' | 'show_info';
    data: any;
    message: string;
  }>;
};

// Enhanced Natural Language Processing for better intent recognition
export interface UserIntent {
  type: 'question' | 'command' | 'request' | 'search' | 'general';
  category: 'calendar' | 'tasks' | 'habits' | 'notes' | 'general';
  action?: 'create' | 'read' | 'update' | 'delete' | 'search';
  entities: {
    timeRef?: string; // today, tomorrow, next week, etc.
    person?: string; // mom, dad, colleague name
    location?: string; // airport, office, home
    task?: string; // task description
    event?: string; // event description
    urgency?: 'high' | 'medium' | 'low';
  };
  confidence: number;
}

export interface ProcessedIntent {
  intent: UserIntent;
  response: string;
  actions?: ChatResponse['actions'];
}

export interface AssistantContext {
  userId: number;
  email: string;
  userTimezone: string;
  userSettings: any;
}