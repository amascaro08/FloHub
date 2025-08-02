import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { userSettings, calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { withAssistantSecurity } from '@/lib/securityMiddleware';
import { logger } from '@/lib/logger';

type CalendarAction = 'create' | 'update' | 'delete' | 'list' | 'search';

type CalendarRequest = {
  action: CalendarAction;
  event?: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    source?: string;
    timezone?: string;
  };
  query?: string;
  timeMin?: string;
  timeMax?: string;
  eventId?: string;
};

type CalendarResponse = {
  success: boolean;
  message?: string;
  events?: any[];
  event?: any;
  error?: string;
};

// Enhanced natural language processing for event creation
interface EventIntent {
  title: string;
  duration: number; // in minutes
  date?: Date;
  time?: { hour: number; minute: number };
  location?: string;
  description?: string;
  recurring?: 'daily' | 'weekly' | 'monthly';
  priority?: 'high' | 'medium' | 'low';
}

function parseEventFromNaturalLanguage(input: string, userTimezone: string): EventIntent | null {
  const lowerInput = input.toLowerCase().trim();
  
  // Extract title (everything before time/date indicators)
  let title = input;
  
  // Remove common command words
  title = title.replace(/^(add|create|schedule|book|new|make)\s+(event|meeting|appointment)\s*/i, '');
  title = title.replace(/^(for|on|at)\s+/i, '');
  
  // Extract time patterns
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)?/i;
  const timeMatch = input.match(timePattern);
  
  let time: { hour: number; minute: number } | undefined;
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const period = timeMatch[3]?.toLowerCase();
    
    if (period === 'pm' && hour !== 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    
    time = { hour, minute };
    
    // Remove time from title
    title = title.replace(timePattern, '').trim();
  }
  
  // Extract date patterns
  const datePatterns = [
    /\b(today|tomorrow)\b/i,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, // MM/DD or MM/DD/YYYY
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i
  ];
  
  let date: Date | undefined;
  for (const pattern of datePatterns) {
    const match = input.match(pattern);
    if (match) {
      date = parseDateFromMatch(match, userTimezone);
      if (date) {
        // Remove date from title
        title = title.replace(pattern, '').trim();
        break;
      }
    }
  }
  
  // Extract location
  const locationPatterns = [
    /(?:at|in|@)\s+([^,.\n]+?)(?:\s+(?:on|at|for|with)|\s*$)/i,
    /location:\s*([^,.\n]+)/i
  ];
  
  let location: string | undefined;
  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match) {
      location = match[1].trim();
      title = title.replace(pattern, '').trim();
      break;
    }
  }
  
  // Extract duration
  const durationPatterns = [
    /(\d+)\s*hours?/i,
    /(\d+)\s*minutes?/i,
    /(\d+)\s*hrs?/i,
    /(\d+)\s*mins?/i,
    /(\d+)\s*h/i,
    /(\d+)\s*m(?!\w)/i
  ];
  
  let duration = 60; // Default 1 hour
  for (const pattern of durationPatterns) {
    const match = input.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (pattern.source.includes('hour') || pattern.source.includes('hr') || pattern.source.includes('h')) {
        duration = value * 60;
      } else {
        duration = value;
      }
      title = title.replace(pattern, '').trim();
      break;
    }
  }
  
  // Clean up title
  title = title.replace(/\s+/g, ' ').trim();
  title = title.replace(/^(for|on|at|with)\s+/i, '');
  title = title.replace(/\s+(for|on|at|with)\s*$/i, '');
  
  if (!title) {
    return null;
  }
  
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    duration,
    date,
    time,
    location,
    description: `Created via natural language: "${input}"`,
    priority: lowerInput.includes('urgent') || lowerInput.includes('important') ? 'high' : 'medium'
  };
}

function parseDateFromMatch(match: RegExpMatchArray, userTimezone: string): Date | undefined {
  const now = toZonedTime(new Date(), userTimezone);
  
  if (match[0].toLowerCase() === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  if (match[0].toLowerCase() === 'tomorrow') {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  }
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(match[0].toLowerCase());
  if (dayIndex !== -1) {
    const targetDate = new Date(now);
    const currentDay = targetDate.getDay();
    let daysToAdd = (dayIndex - currentDay + 7) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // Next week
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  }
  
  // Handle MM/DD format
  if (match[1] && match[2]) {
    const month = parseInt(match[1]) - 1; // Month is 0-indexed
    const day = parseInt(match[2]);
    const year = match[3] ? parseInt(match[3]) : now.getFullYear();
    return new Date(year, month, day);
  }
  
  // Handle month name format
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const monthIndex = monthNames.indexOf(match[1]?.toLowerCase());
  if (monthIndex !== -1 && match[2]) {
    const day = parseInt(match[2]);
    return new Date(now.getFullYear(), monthIndex, day);
  }
  
  return undefined;
}

async function calendarHandler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Not signed in" });
  }

  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ success: false, error: "User not found" });
  }

  const { action, event, query, timeMin, timeMax, eventId } = req.body as CalendarRequest;

  // Get user timezone
  const userSettingsData = await db.query.userSettings.findFirst({
    where: eq(userSettings.user_email, user.email),
    columns: { timezone: true },
  });
  const userTimezone = userSettingsData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    switch (action) {
      case 'create':
        return await handleCreateEvent(req, res, user.email, userTimezone);
      
      case 'update':
        return await handleUpdateEvent(req, res, user.email, userTimezone, eventId!);
      
      case 'delete':
        return await handleDeleteEvent(req, res, user.email, eventId!);
      
      case 'list':
        return await handleListEvents(req, res, user.email, userTimezone, timeMin, timeMax);
      
      case 'search':
        return await handleSearchEvents(req, res, user.email, query || '');
      
      default:
        return res.status(400).json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    logger.error("Calendar API error", { 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      endpoint: '/api/assistant/calendar',
      method: req.method,
      action: req.body?.action,
      userId: decoded?.userId
    });
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function handleCreateEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>,
  userEmail: string,
  userTimezone: string
): Promise<void> {
  const { event, query } = req.body;
  
  let eventData;
  
  if (query) {
    // Parse natural language input
    const parsedEvent = parseEventFromNaturalLanguage(query, userTimezone);
    if (!parsedEvent) {
      res.status(400).json({ success: false, error: "Could not parse event from natural language input" });
      return;
    }
    
    // Convert parsed event to event data
    const eventDate = parsedEvent.date || new Date();
    const startTime = parsedEvent.time || { hour: 9, minute: 0 }; // Default 9 AM
    
    const startDate = new Date(eventDate);
    startDate.setHours(startTime.hour, startTime.minute, 0, 0);
    
    const endDate = new Date(startDate.getTime() + parsedEvent.duration * 60 * 1000);
    
    eventData = {
      summary: parsedEvent.title,
      description: parsedEvent.description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      location: parsedEvent.location,
      source: 'assistant',
      timezone: userTimezone
    };
  } else if (event) {
    eventData = { ...event, timezone: userTimezone };
  } else {
    res.status(400).json({ success: false, error: "No event data provided" });
    return;
  }
  
  try {
    // Call the existing calendar event API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
      },
      body: JSON.stringify({
        calendarId: 'primary',
        ...eventData
      }),
    });
    
    if (response.ok) {
      const createdEvent = await response.json();
      res.status(200).json({
        success: true,
        message: `Event "${eventData.summary}" created successfully`,
        event: createdEvent
      });
    } else {
      const errorData = await response.text();
      console.error("Event creation failed:", errorData);
      res.status(500).json({ success: false, error: "Failed to create event" });
    }
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, error: "Failed to create event" });
  }
}

async function handleUpdateEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>,
  userEmail: string,
  userTimezone: string,
  eventId: string
): Promise<void> {
  // Implementation for updating events
  res.status(501).json({ success: false, error: "Update functionality not implemented yet" });
}

async function handleDeleteEvent(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>,
  userEmail: string,
  eventId: string
): Promise<void> {
  // Implementation for deleting events
  res.status(501).json({ success: false, error: "Delete functionality not implemented yet" });
}

async function handleListEvents(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>,
  userEmail: string,
  userTimezone: string,
  timeMin?: string,
  timeMax?: string
): Promise<void> {
  try {
    const now = new Date();
    const min = timeMin ? new Date(timeMin) : now;
    const max = timeMax ? new Date(timeMax) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar?timeMin=${min.toISOString()}&timeMax=${max.toISOString()}&useCalendarSources=true`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    
    if (response.ok) {
      const calendarData = await response.json();
      res.status(200).json({
        success: true,
        events: calendarData.events || [],
        message: `Found ${calendarData.events?.length || 0} events`
      });
    } else {
      res.status(500).json({ success: false, error: "Failed to fetch events" });
    }
  } catch (error) {
    logger.error("Error listing events", { 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      endpoint: '/api/assistant/calendar',
      method: req.method,
      action: 'list',
      timeMin,
      timeMax
    });
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
}

async function handleSearchEvents(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponse>,
  userEmail: string,
  query: string
): Promise<void> {
  try {
    // First get all events
    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // Next 3 months
    
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar?timeMin=${now.toISOString()}&timeMax=${futureDate.toISOString()}&useCalendarSources=true`, {
      method: 'GET',
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    
    if (response.ok) {
      const calendarData = await response.json();
      const allEvents = calendarData.events || [];
      
      // Filter events based on search query
      const searchTerms = query.toLowerCase().split(' ');
      const matchingEvents = allEvents.filter((event: any) => {
        const searchText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });
      
      res.status(200).json({
        success: true,
        events: matchingEvents,
        message: `Found ${matchingEvents.length} events matching "${query}"`
      });
    } else {
      res.status(500).json({ success: false, error: "Failed to search events" });
    }
  } catch (error) {
    logger.error("Error searching events", { 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      endpoint: '/api/assistant/calendar',
      method: req.method,
      action: 'search',
      query
    });
    res.status(500).json({ success: false, error: "Failed to search events" });
  }
}

// Apply comprehensive security to the calendar endpoint
export default withAssistantSecurity(calendarHandler);