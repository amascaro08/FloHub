/**
 * Date utility functions for the AI Assistant
 */
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

// Enhanced utility to parse natural language for dates with timezone awareness
export const parseDueDate = (phrase: string, userTimezone: string = 'UTC'): string | undefined => {
  const now = new Date();
  const dayMs = 86400000;

  if (phrase === "today") {
    const date = toZonedTime(now, userTimezone);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  if (phrase === "tomorrow") {
    const date = toZonedTime(new Date(now.getTime() + dayMs), userTimezone);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  const inDaysMatch = phrase.match(/^in (\d+) days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const date = toZonedTime(new Date(now.getTime() + days * dayMs), userTimezone);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  const weekdays = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ];

  const nextWeekdayMatch = phrase.match(/^next (\w+)$/);
  if (nextWeekdayMatch) {
    const targetDay = weekdays.indexOf(nextWeekdayMatch[1].toLowerCase());
    if (targetDay !== -1) {
      const date = toZonedTime(now, userTimezone);
      const currentDay = date.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }
      date.setDate(date.getDate() + daysUntilTarget);
      date.setHours(23, 59, 59, 999);
      return date.toISOString();
    }
  }

  return undefined;
};

// Helper function to get timezone-aware dates
export function getTimezoneAwareDates(userTimezone: string) {
  const now = new Date();
  const nowInUserTz = toZonedTime(now, userTimezone);
  const today = new Date(nowInUserTz.getFullYear(), nowInUserTz.getMonth(), nowInUserTz.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return { now, today, tomorrow };
}

// Helper function to format time ago
export function formatTimeAgo(eventDate: Date): string {
  const now = new Date();
  const timeDiff = now.getTime() - eventDate.getTime();
  const minutesAgo = Math.floor(timeDiff / (1000 * 60));
  const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
  const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  if (minutesAgo < 60) {
    return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
  } else if (hoursAgo < 24) {
    return `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
  } else {
    return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
  }
}

// Helper function to format single event responses intelligently
export function formatSingleEventResponse(event: any, userTimezone: string, now: Date, intent: any): string {
  const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
  const dayName = formatInTimeZone(eventDate, userTimezone, 'eeee');
  const dateStr = formatInTimeZone(eventDate, userTimezone, 'MMMM d' + (eventDate.getFullYear() !== now.getFullYear() ? ', yyyy' : ''));
  const timeStr = formatInTimeZone(eventDate, userTimezone, 'h:mm a');

  // Calculate relative time information
  const timeDiff = eventDate.getTime() - now.getTime();
  const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  // Build response based on timing
  let response = `${event.summary || 'Untitled Event'}`;
  
  if (daysUntil < 0) {
    // Past event
    const timeAgo = formatTimeAgo(eventDate);
    response += ` was ${timeAgo}`;
  } else if (daysUntil === 0) {
    // Today
    response += ` is today at ${timeStr}`;
    
    // Add time remaining if it's still upcoming today
    if (timeDiff > 0) {
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutesUntil = Math.floor(timeDiff / (1000 * 60));
      
      if (hoursUntil > 0) {
        response += ` (in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''})`;
      } else if (minutesUntil > 0) {
        response += ` (in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''})`;
      } else {
        response += ` (happening now!)`;
      }
    }
  } else if (daysUntil === 1) {
    // Tomorrow
    response += ` is tomorrow (${dayName}) at ${timeStr}`;
  } else {
    // Future date
    response += ` is on ${dayName}, ${dateStr} at ${timeStr}`;
  }

  // Add location if available
  if (event.location) {
    response += ` at ${event.location}`;
  }

  return response;
}

// Helper function to extract calendar keywords
export function extractCalendarKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const keywords: string[] = [];

  // Time-based keywords
  const timeKeywords = [
    'today', 'tomorrow', 'yesterday', 'this week', 'next week', 'last week',
    'this month', 'next month', 'last month', 'weekend', 'weekday',
    'morning', 'afternoon', 'evening', 'night', 'lunch', 'dinner'
  ];

  timeKeywords.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      keywords.push(keyword);
    }
  });

  // Event type keywords
  const eventTypeKeywords = [
    'meeting', 'appointment', 'call', 'conference', 'interview', 'class',
    'lesson', 'workout', 'gym', 'doctor', 'dentist', 'lunch', 'dinner',
    'party', 'event', 'birthday', 'anniversary'
  ];

  eventTypeKeywords.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      keywords.push(keyword);
    }
  });

  return keywords;
}