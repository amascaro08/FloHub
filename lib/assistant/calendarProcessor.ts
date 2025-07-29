/**
 * Calendar processing utilities for the AI Assistant
 */
import { UserIntent } from './types';
import { getTimezoneAwareDates, formatSingleEventResponse, extractCalendarKeywords, formatTimeAgo } from './dateUtils';
import { getEnhancedNLPProcessor } from '@/lib/enhancedNLP';
import { EnhancedCalendarProcessor } from '@/lib/enhancedCalendarProcessor';
import { toZonedTime } from 'date-fns-tz';

export async function processCalendarQuery(userInput: string, userTimezone: string, contextData: any): Promise<string> {
  try {
    // Try enhanced NLP processing first
    const nlpProcessor = getEnhancedNLPProcessor();
    const enhancedIntent = await nlpProcessor.processQuery(userInput, userTimezone);
    
    if (enhancedIntent && enhancedIntent.confidence > 0.7) {
      // Use enhanced calendar processor for high-confidence queries
      const calendarProcessor = new EnhancedCalendarProcessor(userTimezone);
      return calendarProcessor.processCalendarQuery(enhancedIntent, contextData.allEvents || []);
    }
    
    // Fall back to basic processing
    const basicIntent = analyzeUserIntent(userInput);
    return await handleContextualCalendarQuery(userInput, contextData.allEvents || [], userTimezone, basicIntent);
    
  } catch (error) {
    console.error('Error in processCalendarQuery:', error);
    return "I'm having trouble processing your calendar query right now. Please try again.";
  }
}

function analyzeUserIntent(userInput: string): UserIntent {
  // This would typically import from intentAnalyzer, but to avoid circular dependencies
  // we'll use a simplified version here
  const lowerInput = userInput.toLowerCase().trim();
  
  const intent: UserIntent = {
    type: 'question',
    category: 'calendar',
    entities: {},
    confidence: 0.6
  };

  // Extract time references
  if (lowerInput.includes('today')) {
    intent.entities.timeRef = 'today';
  } else if (lowerInput.includes('tomorrow')) {
    intent.entities.timeRef = 'tomorrow';
  } else if (lowerInput.includes('this week')) {
    intent.entities.timeRef = 'this week';
  } else if (lowerInput.includes('next week')) {
    intent.entities.timeRef = 'next week';
  }

  return intent;
}

export async function handleContextualCalendarQuery(query: string, events: any[], userTimezone: string, intent: UserIntent): Promise<string> {
  const { now, today } = getTimezoneAwareDates(userTimezone);
  
  // If user is asking about a specific time period
  if (intent.entities.timeRef) {
    return await handleTimeSpecificQuery(intent.entities.timeRef, events, userTimezone);
  }

  // Extract additional keywords for more intelligent matching
  const additionalKeywords = extractCalendarKeywords(query);
  
  // Filter events based on query content and keywords
  const allKeywords = [...additionalKeywords];
  if (allKeywords.length > 0) {
    const matchingEvents = events.filter((event: any) => {
      const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
      return allKeywords.some(keyword => eventText.includes(keyword.toLowerCase()));
    });

    if (matchingEvents.length > 0) {
      // Sort by date
      matchingEvents.sort((a: any, b: any) => {
        const dateA = new Date(a.start?.dateTime || a.start?.date || a.start);
        const dateB = new Date(b.start?.dateTime || b.start?.date || b.start);
        return dateA.getTime() - dateB.getTime();
      });

      if (matchingEvents.length === 1) {
        return formatSingleEventResponse(matchingEvents[0], userTimezone, now, intent);
      } else {
        // Multiple matching events
        const upcomingEvents = matchingEvents.filter((event: any) => {
          const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
          return eventDate.getTime() >= now.getTime();
        }).slice(0, 5);

        if (upcomingEvents.length > 0) {
          upcomingEvents.sort((a: any, b: any) => {
            const dateA = new Date(a.start?.dateTime || a.start?.date || a.start);
            const dateB = new Date(b.start?.dateTime || b.start?.date || b.start);
            return dateA.getTime() - dateB.getTime();
          });

          let response = `I found ${upcomingEvents.length} upcoming events matching "${allKeywords.join(', ')}":\n\n`;
          upcomingEvents.forEach((event: any, index: number) => {
            response += `${index + 1}. ${formatSingleEventResponse(event, userTimezone, now, intent)}\n`;
          });
          return response;
        } else {
          // Check for recent past events
          const recentEvents = matchingEvents.filter((event: any) => {
            const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            return eventDate.getTime() >= threeDaysAgo.getTime() && eventDate.getTime() < now.getTime();
          }).slice(-1);

          if (recentEvents.length > 0) {
            const lastEvent = recentEvents[0];
            const eventDate = new Date(lastEvent.start?.dateTime || lastEvent.start?.date || lastEvent.start);
            const timeAgo = formatTimeAgo(eventDate);
            return `The most recent event matching "${allKeywords.join(', ')}" was "${lastEvent.summary || 'Untitled Event'}" ${timeAgo}${lastEvent.location ? ` at ${lastEvent.location}` : ''}.`;
          }
        }
      }
    }
  }

  // Default fallback for general calendar queries
  return await handleTimeSpecificQuery('today', events, userTimezone);
}

export async function handleTimeSpecificQuery(timeRef: string, events: any[], userTimezone: string): Promise<string> {
  const { now, today, tomorrow } = getTimezoneAwareDates(userTimezone);

  if (timeRef === 'today') {
    const todayEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const eventInUserTz = toZonedTime(eventDate, userTimezone);
      return eventInUserTz.getDate() === today.getDate() && 
             eventInUserTz.getMonth() === today.getMonth() && 
             eventInUserTz.getFullYear() === today.getFullYear();
    });

    if (todayEvents.length === 0) {
      return "You don't have any events scheduled for today.";
    } else if (todayEvents.length === 1) {
      return formatSingleEventResponse(todayEvents[0], userTimezone, now, { type: 'question', category: 'calendar', entities: {}, confidence: 0.8 });
    } else {
      let response = `You have ${todayEvents.length} events today:\n\n`;
      todayEvents.forEach((event: any, index: number) => {
        response += `${index + 1}. ${formatSingleEventResponse(event, userTimezone, now, { type: 'question', category: 'calendar', entities: {}, confidence: 0.8 })}\n`;
      });
      return response;
    }
  } else if (timeRef === 'tomorrow') {
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    const tomorrowEvents = events.filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      const eventInUserTz = toZonedTime(eventDate, userTimezone);
      return eventInUserTz.getDate() === tomorrow.getDate() && 
             eventInUserTz.getMonth() === tomorrow.getMonth() && 
             eventInUserTz.getFullYear() === tomorrow.getFullYear();
    });

    if (tomorrowEvents.length === 0) {
      return "You don't have any events scheduled for tomorrow.";
    } else if (tomorrowEvents.length === 1) {
      return formatSingleEventResponse(tomorrowEvents[0], userTimezone, now, { type: 'question', category: 'calendar', entities: {}, confidence: 0.8 });
    } else {
      let response = `You have ${tomorrowEvents.length} events tomorrow:\n\n`;
      tomorrowEvents.forEach((event: any, index: number) => {
        response += `${index + 1}. ${formatSingleEventResponse(event, userTimezone, now, { type: 'question', category: 'calendar', entities: {}, confidence: 0.8 })}\n`;
      });
      return response;
    }
  }

  // Default fallback
  return "I couldn't find any events for that time period.";
}