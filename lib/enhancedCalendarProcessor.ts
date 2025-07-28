import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { EnhancedIntent } from './enhancedNLP';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  } | string;
  end?: {
    dateTime?: string;
    date?: string;
  } | string;
  source?: string;
}

export class EnhancedCalendarProcessor {
  
  constructor(private userTimezone: string = 'UTC') {}

  processCalendarQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    if (!intent.calendar_context?.is_calendar_query) {
      return "I didn't understand that as a calendar query. Could you rephrase?";
    }

    const { query_type, time_scope } = intent.calendar_context;

    switch (query_type) {
      case 'specific_event':
        return this.handleSpecificEventQuery(intent, events);
      case 'first_meeting':
        return this.handleFirstMeetingQuery(intent, events);
      case 'next_event':
        return this.handleNextEventQuery(intent, events);
      case 'list_events':
        return this.handleListEventsQuery(intent, events);
      default:
        return this.handleGeneralCalendarQuery(intent, events);
    }
  }

  private handleSpecificEventQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    const { person, location } = intent.entities;
    
    // Build search keywords
    const searchKeywords: string[] = [];
    if (person) searchKeywords.push(...person);
    if (location) searchKeywords.push(...location);

    // Find matching events
    const matchingEvents = this.findMatchingEvents(events, searchKeywords);
    
    if (matchingEvents.length === 0) {
      const searchTerms = searchKeywords.join(' and ');
      return `📅 I couldn't find any events matching "${searchTerms}" in your calendar. Could you check if the event is scheduled or provide more details?`;
    }

    // Get the next upcoming match
    const upcomingEvents = this.getUpcomingEvents(matchingEvents);
    
    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      return this.formatSpecificEventResponse(nextEvent, intent);
    } else {
      // Check for past events
      const pastEvents = this.getPastEvents(matchingEvents).slice(0, 1);
      if (pastEvents.length > 0) {
        const lastEvent = pastEvents[0];
        const eventDate = this.getEventDate(lastEvent);
        const timeAgo = this.formatTimeAgo(eventDate);
        return `📅 I found "${lastEvent.summary}" but it was ${timeAgo}. There are no upcoming events matching your search.`;
      }
    }

    return `📅 I couldn't find any events matching your search criteria.`;
  }

  private handleFirstMeetingQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    const { time_scope } = intent.calendar_context!;
    
    let filteredEvents: CalendarEvent[] = [];
    let timeDescription = '';

    if (time_scope === 'today') {
      filteredEvents = this.getEventsForDay(events, new Date());
      timeDescription = 'today';
    } else if (time_scope === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredEvents = this.getEventsForDay(events, tomorrow);
      timeDescription = 'tomorrow';
    } else {
      // Default to upcoming events
      filteredEvents = this.getUpcomingEvents(events);
      timeDescription = 'upcoming';
    }

    if (filteredEvents.length === 0) {
      return `📅 You don't have any meetings ${timeDescription}.`;
    }

    // Get the first meeting (earliest time)
    const firstMeeting = filteredEvents[0];
    const eventDate = this.getEventDate(firstMeeting);
    const timeStr = formatInTimeZone(eventDate, this.userTimezone, 'h:mm a');
    const dayStr = time_scope === 'today' ? 'today' : time_scope === 'tomorrow' ? 'tomorrow' : formatInTimeZone(eventDate, this.userTimezone, 'eeee');

    let response = `📅 Your first meeting ${timeDescription} is **${firstMeeting.summary}** at **${timeStr}**`;
    
    if (time_scope !== 'today' && time_scope !== 'tomorrow') {
      response += ` on ${dayStr}`;
    }

    if (firstMeeting.location) {
      response += `\n📍 Location: ${firstMeeting.location}`;
    }

    if (firstMeeting.description) {
      response += `\n📝 ${firstMeeting.description.substring(0, 100)}${firstMeeting.description.length > 100 ? '...' : ''}`;
    }

    return response;
  }

  private handleNextEventQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    const upcomingEvents = this.getUpcomingEvents(events);
    
    if (upcomingEvents.length === 0) {
      return `📅 You don't have any upcoming events.`;
    }

    const nextEvent = upcomingEvents[0];
    return this.formatSpecificEventResponse(nextEvent, intent);
  }

  private handleListEventsQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    const { time_scope } = intent.calendar_context!;
    
    let filteredEvents: CalendarEvent[] = [];
    let timeDescription = '';

    if (time_scope === 'today') {
      filteredEvents = this.getEventsForDay(events, new Date());
      timeDescription = 'today';
    } else if (time_scope === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      filteredEvents = this.getEventsForDay(events, tomorrow);
      timeDescription = 'tomorrow';
    } else {
      filteredEvents = this.getUpcomingEvents(events).slice(0, 5); // Limit to 5 events
      timeDescription = 'upcoming';
    }

    if (filteredEvents.length === 0) {
      return `📅 You don't have any events ${timeDescription}.`;
    }

    let response = `📅 **Your ${timeDescription} schedule:**\n\n`;
    
    filteredEvents.forEach((event, index) => {
      const eventDate = this.getEventDate(event);
      const timeStr = formatInTimeZone(eventDate, this.userTimezone, 'h:mm a');
      
      response += `${index + 1}. **${event.summary}** at ${timeStr}`;
      if (event.location) {
        response += ` (${event.location})`;
      }
      response += '\n';
    });

    return response;
  }

  private handleGeneralCalendarQuery(intent: EnhancedIntent, events: CalendarEvent[]): string {
    const upcomingEvents = this.getUpcomingEvents(events).slice(0, 3);
    
    if (upcomingEvents.length === 0) {
      return `📅 You don't have any upcoming events.`;
    }

    let response = `📅 **Your upcoming events:**\n\n`;
    
    upcomingEvents.forEach((event, index) => {
      const eventDate = this.getEventDate(event);
      const timeStr = formatInTimeZone(eventDate, this.userTimezone, 'h:mm a');
      const dayStr = formatInTimeZone(eventDate, this.userTimezone, 'eeee, MMM d');
      
      response += `${index + 1}. **${event.summary}**\n`;
      response += `   📅 ${dayStr} at ${timeStr}`;
      if (event.location) {
        response += `\n   📍 ${event.location}`;
      }
      response += '\n\n';
    });

    return response;
  }

  private findMatchingEvents(events: CalendarEvent[], keywords: string[]): CalendarEvent[] {
    if (keywords.length === 0) return events;

    return events.filter(event => {
      const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
      return keywords.some(keyword => eventText.includes(keyword.toLowerCase()));
    });
  }

  private getUpcomingEvents(events: CalendarEvent[]): CalendarEvent[] {
    const now = new Date();
    
    return events
      .filter(event => {
        const eventDate = this.getEventDate(event);
        return eventDate >= now;
      })
      .sort((a, b) => {
        const dateA = this.getEventDate(a);
        const dateB = this.getEventDate(b);
        return dateA.getTime() - dateB.getTime();
      });
  }

  private getPastEvents(events: CalendarEvent[]): CalendarEvent[] {
    const now = new Date();
    
    return events
      .filter(event => {
        const eventDate = this.getEventDate(event);
        return eventDate < now;
      })
      .sort((a, b) => {
        const dateA = this.getEventDate(a);
        const dateB = this.getEventDate(b);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
  }

  private getEventsForDay(events: CalendarEvent[], targetDate: Date): CalendarEvent[] {
    const targetInUserTz = toZonedTime(targetDate, this.userTimezone);
    const startOfDay = new Date(targetInUserTz.getFullYear(), targetInUserTz.getMonth(), targetInUserTz.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return events
      .filter(event => {
        const eventDate = this.getEventDate(event);
        const eventInUserTz = toZonedTime(eventDate, this.userTimezone);
        return eventInUserTz >= startOfDay && eventInUserTz < endOfDay;
      })
      .sort((a, b) => {
        const dateA = this.getEventDate(a);
        const dateB = this.getEventDate(b);
        return dateA.getTime() - dateB.getTime();
      });
  }

  private getEventDate(event: CalendarEvent): Date {
    if (typeof event.start === 'string') {
      return new Date(event.start);
    } else if (event.start?.dateTime) {
      return new Date(event.start.dateTime);
    } else if (event.start?.date) {
      return new Date(event.start.date);
    } else {
      // Fallback for events with malformed date
      return new Date();
    }
  }

  private formatSpecificEventResponse(event: CalendarEvent, intent: EnhancedIntent): string {
    const eventDate = this.getEventDate(event);
    const now = new Date();
    
    const dayName = formatInTimeZone(eventDate, this.userTimezone, 'eeee');
    const dateStr = formatInTimeZone(eventDate, this.userTimezone, 'MMMM d' + (eventDate.getFullYear() !== now.getFullYear() ? ', yyyy' : ''));
    const timeStr = formatInTimeZone(eventDate, this.userTimezone, 'h:mm a');
    
    // Calculate time difference for more natural response
    const timeDiff = eventDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    let whenText = "";
    if (daysUntil === 0) {
      whenText = "today";
    } else if (daysUntil === 1) {
      whenText = "tomorrow";
    } else if (daysUntil <= 7) {
      whenText = `this ${dayName}`;
    } else {
      whenText = `on ${dayName}, ${dateStr}`;
    }
    
    // Personalize response based on intent
    let responsePrefix = "";
    if (intent.entities.person && intent.entities.location) {
      const person = intent.entities.person[0];
      const location = intent.entities.location[0];
      responsePrefix = `You're taking ${person} to ${location} `;
    } else if (intent.entities.location) {
      responsePrefix = `Your ${intent.entities.location[0]} appointment is `;
    } else {
      responsePrefix = `**${event.summary}** is scheduled for `;
    }
    
    let response = `📅 ${responsePrefix}**${whenText}** at **${timeStr}**`;
    
    if (event.location) {
      response += `\n📍 Location: ${event.location}`;
    }
    
    if (event.description) {
      response += `\n📝 ${event.description.substring(0, 150)}${event.description.length > 150 ? '...' : ''}`;
    }
    
    // Add helpful context about time remaining
    if (daysUntil === 0) {
      const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
      if (hoursUntil > 0) {
        response += `\n\n⏰ That's in about ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}!`;
      } else {
        const minutesUntil = Math.floor(timeDiff / (1000 * 60));
        if (minutesUntil > 0) {
          response += `\n\n⏰ That's in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}!`;
        }
      }
    } else if (daysUntil === 1) {
      response += `\n\n⏰ That's tomorrow!`;
    } else if (daysUntil <= 7) {
      response += `\n\n⏰ That's in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`;
    }
    
    return response;
  }

  private formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}