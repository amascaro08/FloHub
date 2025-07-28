import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import OpenAI from "openai";
import { db } from "@/lib/drizzle";
import { userSettings, tasks, calendarEvents } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  findRelevantContextSemantic as findRelevantContext,
} from "@/lib/context";
import {
  fetchUserNotes,
  fetchUserMeetingNotes,
  fetchUserConversations,
} from "@/lib/contextService";
import { ChatCompletionMessageParam } from "openai/resources";
import { SmartAIAssistant } from "@/lib/aiAssistant";
import { findMatchingCapability } from "@/lib/floCatCapabilities";
import { getEnhancedNLPProcessor, EnhancedIntent } from "@/lib/enhancedNLP";
import { EnhancedCalendarProcessor, CalendarEvent } from "@/lib/enhancedCalendarProcessor";
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Enhanced types for better contextual awareness
type ChatRequest = {
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

type ChatResponse = {
  reply?: string;
  error?: string;
  actions?: Array<{
    type: 'create_task' | 'create_event' | 'update_calendar' | 'show_info';
    data: any;
    message: string;
  }>;
};

// Enhanced Natural Language Processing for better intent recognition
interface UserIntent {
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

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Enhanced utility to parse natural language for dates with timezone awareness
const parseDueDate = (phrase: string, userTimezone: string = 'UTC'): string | undefined => {
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
    if (targetDay >= 0) {
      let date = toZonedTime(new Date(now), userTimezone);
      const currentDay = date.getDay();
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7;
      date.setDate(date.getDate() + daysToAdd);
      date.setHours(23, 59, 59, 999);
      return date.toISOString();
    }
  }

  return undefined;
};

// Enhanced intent recognition using NLP patterns
function analyzeUserIntent(input: string): UserIntent {
  const lowerInput = input.toLowerCase().trim();
  
  // Question patterns
  const questionPatterns = [
    /^(when|what|where|who|how|why)\s/,
    /\?$/,
    /^(is|are|do|does|can|could|will|would)\s/
  ];
  
  // Command patterns  
  const commandPatterns = [
    /^(add|create|make|schedule|book|set|delete|remove|update|edit)\s/,
    /^(remind|tell|show|list|find|search)\s/
  ];

  // Extract entities
  const entities: UserIntent['entities'] = {};
  
  // Time references
  const timeRefs = ['today', 'tomorrow', 'yesterday', 'next week', 'this week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  entities.timeRef = timeRefs.find(ref => lowerInput.includes(ref));
  
  // Person references
  const personRefs = ['mom', 'mum', 'dad', 'father', 'mother', 'colleague', 'boss', 'friend'];
  entities.person = personRefs.find(person => lowerInput.includes(person));
  
  // Location references
  const locationRefs = ['airport', 'office', 'home', 'work', 'hospital', 'clinic', 'school'];
  entities.location = locationRefs.find(loc => lowerInput.includes(loc));
  
  // Urgency indicators
  if (lowerInput.includes('urgent') || lowerInput.includes('asap') || lowerInput.includes('critical')) {
    entities.urgency = 'high';
  } else if (lowerInput.includes('important') || lowerInput.includes('priority')) {
    entities.urgency = 'medium';
  } else {
    entities.urgency = 'low';
  }

  // Determine type
  let type: UserIntent['type'] = 'general';
  if (questionPatterns.some(pattern => pattern.test(lowerInput))) {
    type = 'question';
  } else if (commandPatterns.some(pattern => pattern.test(lowerInput))) {
    type = 'command';
  } else if (lowerInput.includes('please') || lowerInput.includes('could you') || lowerInput.includes('can you')) {
    type = 'request';
  } else if (lowerInput.includes('find') || lowerInput.includes('search') || lowerInput.includes('show me')) {
    type = 'search';
  }

  // Determine category
  let category: UserIntent['category'] = 'general';
  if (lowerInput.includes('calendar') || lowerInput.includes('schedule') || lowerInput.includes('meeting') || lowerInput.includes('event') || entities.timeRef) {
    category = 'calendar';
  } else if (lowerInput.includes('task') || lowerInput.includes('todo') || lowerInput.includes('complete') || lowerInput.includes('done')) {
    category = 'tasks';
  } else if (lowerInput.includes('habit') || lowerInput.includes('routine') || lowerInput.includes('streak')) {
    category = 'habits';
  } else if (lowerInput.includes('note') || lowerInput.includes('remember') || lowerInput.includes('write down')) {
    category = 'notes';
  }

  // Determine action
  let action: UserIntent['action'] | undefined;
  if (lowerInput.includes('add') || lowerInput.includes('create') || lowerInput.includes('make') || lowerInput.includes('new')) {
    action = 'create';
  } else if (lowerInput.includes('show') || lowerInput.includes('list') || lowerInput.includes('view') || lowerInput.includes('get')) {
    action = 'read';
  } else if (lowerInput.includes('update') || lowerInput.includes('edit') || lowerInput.includes('change') || lowerInput.includes('modify')) {
    action = 'update';
  } else if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('cancel')) {
    action = 'delete';
  } else if (lowerInput.includes('find') || lowerInput.includes('search')) {
    action = 'search';
  }

  // Calculate confidence based on pattern matches and entity extraction
  let confidence = 0.5; // Base confidence
  if (type !== 'general') confidence += 0.2;
  if (category !== 'general') confidence += 0.2;
  if (action) confidence += 0.1;
  if (Object.keys(entities).length > 0) confidence += 0.1;

  return {
    type,
    category,
    action,
    entities,
    confidence
  };
}

// Enhanced calendar event processing with better contextual search
async function processCalendarQuery(userInput: string, userTimezone: string, contextData: any): Promise<string> {
  try {
    // Use enhanced NLP processor for better intent recognition
    const nlpProcessor = getEnhancedNLPProcessor();
    const enhancedIntent = await nlpProcessor.processQuery(userInput, userTimezone);
    
    console.log(`[DEBUG] Enhanced intent analysis:`, enhancedIntent);
    
    const events = contextData?.events || contextData?.allEvents || [];
    
    // Use enhanced calendar processor
    const calendarProcessor = new EnhancedCalendarProcessor(userTimezone);
    
    if (enhancedIntent.calendar_context?.is_calendar_query) {
      return calendarProcessor.processCalendarQuery(enhancedIntent, events);
    }
    
    // Fallback to old intent system if enhanced NLP doesn't detect calendar query
    const basicIntent = analyzeUserIntent(userInput);
    console.log(`[DEBUG] Fallback to basic intent:`, basicIntent);
    
    // Handle specific contextual queries (like "when do I take mum to the airport")
    if (basicIntent.type === 'question' && (basicIntent.entities.person || basicIntent.entities.location)) {
      return await handleContextualCalendarQuery(userInput, events, userTimezone, basicIntent);
    }
    
    // Handle time-specific queries
    if (basicIntent.entities.timeRef) {
      return await handleTimeSpecificQuery(basicIntent.entities.timeRef, events, userTimezone);
    }
    
    // Default to showing upcoming events with intelligent formatting
    return await formatCalendarResponse(events, userTimezone, 'upcoming');
    
  } catch (error) {
    console.error('Error in enhanced calendar processing:', error);
    
    // Fallback to basic processing
    const intent = analyzeUserIntent(userInput);
    const events = contextData?.events || contextData?.allEvents || [];
    
    if (intent.type === 'question' && (intent.entities.person || intent.entities.location)) {
      return await handleContextualCalendarQuery(userInput, events, userTimezone, intent);
    }
    
    if (intent.entities.timeRef) {
      return await handleTimeSpecificQuery(intent.entities.timeRef, events, userTimezone);
    }
    
    return await formatCalendarResponse(events, userTimezone, 'upcoming');
  }
}

// Enhanced contextual calendar query handler
async function handleContextualCalendarQuery(query: string, events: any[], userTimezone: string, intent: UserIntent): Promise<string> {
  const { now, today } = getTimezoneAwareDates(userTimezone);
  
  // Build search keywords from intent entities and query
  const searchKeywords: string[] = [];
  if (intent.entities.person) searchKeywords.push(intent.entities.person);
  if (intent.entities.location) searchKeywords.push(intent.entities.location);
  
  // Extract additional keywords from the query
  const additionalKeywords = extractCalendarKeywords(query);
  searchKeywords.push(...additionalKeywords);
  
  console.log(`[DEBUG] Searching for events with keywords: ${searchKeywords.join(', ')}`);
  
  // Search for matching events
  const matchingEvents = events.filter((event: any) => {
    const eventText = `${event.summary || ''} ${event.description || ''} ${event.location || ''}`.toLowerCase();
    return searchKeywords.some(keyword => eventText.includes(keyword.toLowerCase()));
  });
  
  if (matchingEvents.length === 0) {
    return `📅 I couldn't find any events matching "${searchKeywords.join(', ')}" in your calendar. Could you check if the event is scheduled or provide more details?`;
  }
  
  // Sort by date and get the most relevant match
  const upcomingMatches = matchingEvents
    .filter((event: any) => {
      const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
      return eventDate >= today;
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.start?.dateTime || a.start?.date || a.start);
      const dateB = new Date(b.start?.dateTime || b.start?.date || b.start);
      return dateA.getTime() - dateB.getTime();
    });
  
  if (upcomingMatches.length > 0) {
    const nextEvent = upcomingMatches[0];
    return formatSingleEventResponse(nextEvent, userTimezone, now, intent);
  } else {
    // Check for past events
    const pastMatches = matchingEvents
      .filter((event: any) => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
        return eventDate < today;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.start?.dateTime || a.start?.date || a.start);
        const dateB = new Date(b.start?.dateTime || b.start?.date || b.start);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
    
    if (pastMatches.length > 0) {
      const lastEvent = pastMatches[0];
      const eventDate = new Date(lastEvent.start?.dateTime || lastEvent.start?.date || lastEvent.start);
      const timeAgo = formatTimeAgo(eventDate);
      
      return `📅 I found "${lastEvent.summary}" but it was ${timeAgo}. There are no upcoming events matching your search.`;
    } else {
      return `📅 I couldn't find any events matching "${searchKeywords.join(', ')}" in your calendar.`;
    }
  }
}

// Helper function to format single event responses intelligently
function formatSingleEventResponse(event: any, userTimezone: string, now: Date, intent: UserIntent): string {
  const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
  const dayName = formatInTimeZone(eventDate, userTimezone, 'eeee');
  const dateStr = formatInTimeZone(eventDate, userTimezone, 'MMMM d' + (eventDate.getFullYear() !== now.getFullYear() ? ', yyyy' : ''));
  const timeStr = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
  
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
    responsePrefix = `You're taking ${intent.entities.person} to ${intent.entities.location} `;
  } else if (intent.entities.location) {
    responsePrefix = `Your ${intent.entities.location} appointment is `;
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

// Enhanced time-specific query handler
async function handleTimeSpecificQuery(timeRef: string, events: any[], userTimezone: string): Promise<string> {
  const { now, today, tomorrow } = getTimezoneAwareDates(userTimezone);
  
  let filteredEvents = [];
  let titleSuffix = "";
  
  switch (timeRef.toLowerCase()) {
    case 'today':
      filteredEvents = events.filter((event: any) => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        return eventInUserTz >= today && eventInUserTz < tomorrow;
      });
      titleSuffix = "Today";
      break;
      
    case 'tomorrow':
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      filteredEvents = events.filter((event: any) => {
        const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
        const eventInUserTz = toZonedTime(eventDate, userTimezone);
        return eventInUserTz >= tomorrow && eventInUserTz < dayAfterTomorrow;
      });
      titleSuffix = "Tomorrow";
      break;
      
    default:
      // Handle specific days (monday, tuesday, etc.)
      return await handleSpecificDayQuery(timeRef, events, userTimezone);
  }
  
  return await formatCalendarResponse(filteredEvents, userTimezone, titleSuffix.toLowerCase());
}

// Helper function to get timezone-aware dates
function getTimezoneAwareDates(userTimezone: string) {
  const now = new Date();
  const nowInUserTz = toZonedTime(now, userTimezone);
  const today = new Date(nowInUserTz.getFullYear(), nowInUserTz.getMonth(), nowInUserTz.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return { now: nowInUserTz, today, tomorrow, userTimezone };
}

// Enhanced calendar keyword extraction
function extractCalendarKeywords(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Remove question words and common phrases
  const stopWords = ['when', 'do', 'i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'to', 'for', 'with', 'at', 'on', 'in', 'take', 'have', 'get', 'go', 'my', 'me'];
  
  // Extract meaningful keywords
  const words = lowerQuery
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  // Add common synonyms and variations
  const expandedKeywords = [...words];
  words.forEach(word => {
    switch(word) {
      case 'mum':
      case 'mom':
      case 'mother':
        expandedKeywords.push('mum', 'mom', 'mother', 'family');
        break;
      case 'dad':
      case 'father':
        expandedKeywords.push('dad', 'father', 'family');
        break;
      case 'airport':
        expandedKeywords.push('flight', 'plane', 'travel', 'departure', 'terminal');
        break;
      case 'flight':
        expandedKeywords.push('airport', 'plane', 'travel', 'departure');
        break;
      case 'doctor':
        expandedKeywords.push('appointment', 'medical', 'clinic', 'physician', 'health');
        break;
      case 'meeting':
        expandedKeywords.push('call', 'conference', 'discussion', 'sync');
        break;
    }
  });
  
  return Array.from(new Set(expandedKeywords)); // Remove duplicates
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const email = user.email;
  const { 
    history = [], 
    prompt, 
    message, 
    userInput: bodyUserInput,
    style: bodyFloCatStyle,
    preferredName: bodyPreferredName,
    notes: bodyNotes = [],
    meetings: bodyMeetings = [],
    contextData = {}
  } = req.body as ChatRequest;

  // Store contextData globally for use in generateLocalResponse and capabilities
  (global as any).currentContextData = contextData;
  (global as any).currentUserId = email;

  // Use either prompt or message, with message taking precedence, or bodyUserInput
  const userInput = bodyUserInput || message || prompt || "";

  if (!Array.isArray(history) || typeof userInput !== "string" || !userInput) {
    return res.status(400).json({ error: "Invalid request body - missing message/prompt or invalid history" });
  }

  // Get user settings including timezone
  const userSettingsData = await db.query.userSettings.findFirst({
    where: eq(userSettings.user_email, email),
    columns: {
      timezone: true,
      floCatStyle: true,
      floCatPersonality: true,
      preferredName: true,
    },
  });
  
  const userTimezone = userSettingsData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const floCatStyle = bodyFloCatStyle || userSettingsData?.floCatStyle || "default";
  const floCatPersonality = userSettingsData?.floCatPersonality || [];
  const preferredName = bodyPreferredName || userSettingsData?.preferredName || "";

  // Store timezone globally for calendar operations
  (global as any).currentUserTimezone = userTimezone;

  // Analyze user intent for better processing
  const intent = analyzeUserIntent(userInput);
  console.log(`[DEBUG] User intent analysis:`, intent);

  const lowerPrompt = userInput.toLowerCase();

  // Initialize Smart AI Assistant for pattern analysis and suggestions
  const smartAssistant = new SmartAIAssistant(email);
  
  // Load user context early for better processing
  try {
    await smartAssistant.loadUserContext();
  } catch (error) {
    console.error("Error loading smart assistant context:", error);
  }
  
  // Check for proactive suggestion requests
  if (lowerPrompt.includes("suggestion") || lowerPrompt.includes("recommend") || lowerPrompt.includes("advice")) {
    try {
      const suggestions = await smartAssistant.generateProactiveSuggestions();
      
      if (suggestions.length > 0) {
        const topSuggestions = suggestions.slice(0, 3);
        let suggestionText = "💡 **Here are some personalized suggestions based on your patterns:**\n\n";
        
        topSuggestions.forEach((suggestion, index) => {
          const priorityEmoji = suggestion.priority === 'high' ? '🔴' : 
                               suggestion.priority === 'medium' ? '🟡' : '🟢';
          suggestionText += `${index + 1}. ${priorityEmoji} **${suggestion.title}**\n`;
          suggestionText += `   ${suggestion.message}\n`;
          if (suggestion.actionable) {
            suggestionText += `   💫 *This suggestion is actionable - I can help implement it!*\n`;
          }
          suggestionText += `\n`;
        });
        
        return res.status(200).json({ reply: suggestionText });
      } else {
        return res.status(200).json({ reply: "Great job! I don't have any specific suggestions right now. You seem to be managing your tasks and habits well! 🌟" });
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Continue with normal processing
    }
  }

  // Enhanced calendar/schedule query processing with timezone awareness
  if (intent.category === 'calendar' || 
      lowerPrompt.includes("schedule") || lowerPrompt.includes("my schedule") || 
      lowerPrompt.includes("meetings") || lowerPrompt.includes("my meetings") ||
      lowerPrompt.includes("calendar") || lowerPrompt.includes("my calendar") ||
      lowerPrompt.includes("agenda") || lowerPrompt.includes("today's events") ||
      lowerPrompt.includes("upcoming events") || lowerPrompt.includes("what's on my calendar") ||
      lowerPrompt.includes("first meeting") || lowerPrompt.includes("next meeting") ||
      lowerPrompt.includes("meeting on") || lowerPrompt.includes("events on") ||
      lowerPrompt.includes("what do i have on") || lowerPrompt.includes("what's on") ||
      (lowerPrompt.includes("when") && (lowerPrompt.includes("do i") || lowerPrompt.includes("am i"))) ||
      (lowerPrompt.includes("meeting") && (lowerPrompt.includes("monday") || lowerPrompt.includes("tuesday") || 
       lowerPrompt.includes("wednesday") || lowerPrompt.includes("thursday") || lowerPrompt.includes("friday") ||
       lowerPrompt.includes("saturday") || lowerPrompt.includes("sunday") || lowerPrompt.includes("today") ||
       lowerPrompt.includes("tomorrow"))) ||
      (lowerPrompt.includes("what") && (lowerPrompt.includes("today") || lowerPrompt.includes("tomorrow")) && 
       (lowerPrompt.includes("meeting") || lowerPrompt.includes("event") || lowerPrompt.includes("schedule")))) {
    
    try {
      // Fetch calendar events for enhanced processing
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const calendarResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar?timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}&useCalendarSources=true`, {
        method: 'GET',
        headers: {
          'Cookie': req.headers.cookie || '',
        },
      });

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        const events = calendarData.events || [];
        
        console.log(`[DEBUG] Fetched ${events.length} calendar events for processing`);
        console.log(`[DEBUG] Sample events:`, events.slice(0, 2).map((e: any) => ({
          summary: e.summary,
          start: e.start,
          location: e.location
        })));
        
        // Enhanced context data for better processing
        const enhancedContextData = {
          ...contextData,
          events,
          allEvents: events
        };
        
        // Update global context
        (global as any).currentContextData = enhancedContextData;
        
        // Update SmartAIAssistant with fresh calendar data
        smartAssistant.updateCalendarEvents(events);
        
        console.log(`[DEBUG] Processing calendar query: "${userInput}" with ${events.length} events`);
        
        // Process calendar query with enhanced intelligence
        const scheduleResponse = await processCalendarQuery(userInput, userTimezone, enhancedContextData);
        return res.status(200).json({ reply: scheduleResponse });
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      // Fall through to normal processing
    }
  }

  // Enhanced natural language processing for complex queries
  if (intent.type === 'question' && intent.confidence > 0.7) {
    try {
      const queryResponse = await smartAssistant.processNaturalLanguageQuery(userInput);
      if (queryResponse && !queryResponse.includes("I can help you with:")) {
        return res.status(200).json({ reply: queryResponse });
      }
    } catch (error) {
      console.error("Error processing natural language query:", error);
      // Continue with normal processing
    }
  }

  // Try to match with capabilities for action-based commands
  const capabilityMatch = findMatchingCapability(userInput);
  if (capabilityMatch) {
    try {
      console.log(`[DEBUG] Capability matched: ${capabilityMatch.capability.featureName}, Command: ${capabilityMatch.command}, Args: "${capabilityMatch.args}"`);
      const capabilityResponse = await capabilityMatch.capability.handler(
        capabilityMatch.command, 
        capabilityMatch.args
      );
      console.log(`[DEBUG] Capability response: ${capabilityResponse}`);
      return res.status(200).json({ reply: capabilityResponse });
    } catch (error) {
      console.error("Error in capability handler:", error);
      return res.status(500).json({ error: "Sorry, there was an error processing your request." });
    }
  }

  // Enhanced task creation with better intent understanding
  if (intent.category === 'tasks' && intent.action === 'create') {
    try {
      const taskText = extractTaskFromIntent(userInput, intent);
      const dueDate = intent.entities.timeRef ? parseDueDate(intent.entities.timeRef, userTimezone) : undefined;
      
      const taskPayload: any = { 
        text: taskText,
        source: 'personal'
      };
      
      if (dueDate) taskPayload.dueDate = dueDate;
      if (intent.entities.urgency === 'high') taskPayload.priority = 'high';

      const taskResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Cookie": req.headers.cookie || "",
        },
        body: JSON.stringify(taskPayload),
      });

      if (taskResponse.ok) {
        const createdTask = await taskResponse.json();
        const actions = [{
          type: 'create_task' as const,
          data: createdTask,
          message: `Task "${taskText}" created successfully`
        }];
        
        return res.status(200).json({
          reply: `✅ Task "${taskText}" added successfully${dueDate ? ` (due ${intent.entities.timeRef})` : ""}! 🎯`,
          actions
        });
      }
    } catch (error) {
      console.error("Error creating task from intent:", error);
      // Fall through to normal processing
    }
  }

  // ── Enhanced Add Event Detection ─────────────────────────────
  // More flexible task detection patterns
  const taskPatterns = [
    // "add a task for tomorrow called [task name]"
    /(?:add|create|new|make)\s+(?:a\s+)?task\s+for\s+(\w+)\s+called\s+(.+)/i,
    // "add a task due tomorrow called [task name]"
    /(?:add|create|new|make)\s+(?:a\s+)?task\s+due\s+(\w+)\s+called\s+(.+)/i,
    // "add a task called [task name] for tomorrow"
    /(?:add|create|new|make)\s+(?:a\s+)?task\s+called\s+(.+?)\s+(?:for|due)\s+(\w+)/i,
    // "add a task called [task name]"
    /(?:add|create|new|make)\s+(?:a\s+)?task\s+called\s+(.+)/i,
    // Standard patterns
    /(?:add|create|new|make)\s+(?:a\s+)?task:?\s*(.+)/i,
    /(?:add|create|new|make)\s+(.+?)\s+(?:to\s+)?(?:my\s+)?(?:task\s+)?list/i,
    /task:?\s*(.+)/i
  ];
  
  for (const pattern of taskPatterns) {
    const taskMatch = userInput.match(pattern);
    if (taskMatch) {
      let finalTaskText = '';
      let duePhrase: string | null = null;
      
      // Handle different capture groups based on pattern
      if (pattern.source.includes('called')) {
        if (taskMatch[2] && taskMatch[1]) {
          // Pattern with due date first, then task name
          finalTaskText = taskMatch[2].trim();
          duePhrase = taskMatch[1].trim();
        } else if (taskMatch[1] && taskMatch[2]) {
          // Pattern with task name first, then due date
          finalTaskText = taskMatch[1].trim();
          duePhrase = taskMatch[2].trim();
        } else if (taskMatch[1]) {
          // Simple "called [task]" pattern
          finalTaskText = taskMatch[1].trim();
        }
      } else if (taskMatch[1]) {
        // Standard patterns
        const taskText = taskMatch[1].trim();
        
        // Check for due date in the task text
        const dueMatch = taskText.match(/(.+?)\s+(?:for|due)\s+(.+)$/i);
        if (dueMatch) {
          finalTaskText = dueMatch[1].trim();
          duePhrase = dueMatch[2].trim();
        } else {
          finalTaskText = taskText;
        }
      }
      
      if (finalTaskText) {
        const dueDate = duePhrase ? parseDueDate(duePhrase, userTimezone) : undefined;
        
        // Check for source specification
        const hasSourceSpecified = lowerPrompt.includes("work") || lowerPrompt.includes("personal") || 
                                   lowerPrompt.includes("business") || lowerPrompt.includes("home");
        
        // Check if user specified source or due date
        const needsMoreInfo = !hasSourceSpecified || !dueDate;
        
        if (needsMoreInfo) {
          let questions = [];
          
          if (!hasSourceSpecified) {
            questions.push("📂 **Source**: Should this be a **work** or **personal** task?");
          }
          
          if (!dueDate) {
            questions.push("📅 **Due Date**: When would you like this task to be due? (e.g., today, tomorrow, next Friday, or no due date)");
          }
          
          const questionText = questions.join("\n\n");
          
          return res.status(200).json({
            reply: `I'll help you create the task "${finalTaskText}"! I just need a bit more information:\n\n${questionText}\n\nPlease let me know and I'll create the task with those details! 😺`
          });
        }
        
        // Determine source
        let source = 'personal'; // default
        if (lowerPrompt.includes("work") || lowerPrompt.includes("business")) {
          source = 'work';
        }
        
        const payload: any = { 
          text: finalTaskText,
          source: source
        };
        if (dueDate) payload.dueDate = dueDate;

        console.log(`[DEBUG] Creating task via direct API: "${finalTaskText}", source: ${source}, due: ${dueDate}, duePhrase: "${duePhrase}"`);
        
        try {
          const taskResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tasks`, {
            method: 'POST',
            headers: {
              "Content-Type": "application/json",
              "Cookie": req.headers.cookie || "",
            },
            body: JSON.stringify(payload),
          });

          if (taskResponse.ok) {
            const createdTask = await taskResponse.json();
            console.log(`[DEBUG] Task created successfully:`, createdTask);
            return res.status(200).json({
              reply: `✅ Task "${finalTaskText}" added successfully to your **${source}** tasks${dueDate ? ` (due ${duePhrase})` : ""}! 🎯`,
            });
          } else {
            const errorData = await taskResponse.text();
            console.error(`[DEBUG] Task creation failed with status ${taskResponse.status}:`, errorData);
            return res.status(500).json({ error: "Sorry, I couldn't add the task. Please try again." });
          }
        } catch (error) {
          console.error(`[DEBUG] Task creation error:`, error);
          return res.status(500).json({ error: "Sorry, there was an error adding the task. Please try again." });
        }
      }
    }
  }

  // ── Enhanced Calendar Event Detection ───────────────────
  if (
    lowerPrompt.includes("add event") ||
    lowerPrompt.includes("new event") ||
    lowerPrompt.includes("schedule event") ||
    lowerPrompt.includes("create event") ||
    lowerPrompt.includes("book meeting") ||
    lowerPrompt.includes("schedule meeting")
  ) {
    // Enhanced regex to capture more event details
    const eventMatch = userInput.match(/(?:add|new|schedule|create|book)\s+(?:event|meeting)\s+(.+?)(?:\s+(?:on|at|for)\s+(.+))?$/i);
    if (eventMatch && eventMatch[1]) {
      const summary = eventMatch[1].trim();
      const timeInfo = eventMatch[2]?.trim();
      
      // Parse time information if provided
      let start = new Date();
      let end = new Date(start.getTime() + 3600000); // Default 1 hour duration
      
      if (timeInfo) {
        // Simple time parsing - can be enhanced
        const timeMatch = timeInfo.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3]?.toLowerCase();
          
          if (period === 'pm' && hours !== 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          start.setHours(hours, minutes, 0, 0);
          end = new Date(start.getTime() + 3600000);
        }
      }
      
      const eventData = {
        summary,
        start: start.toISOString(),
        end: end.toISOString(),
        source: 'personal'
      };
      
      const success = await callInternalApi("/api/assistant/calendar", "POST", {
        action: 'create',
        event: eventData
      }, req);
      
      if (success) {
        return res.status(200).json({ reply: `📅 Event "${summary}" scheduled successfully!` });
      } else {
        return res.status(500).json({ error: "Sorry, I couldn't schedule the event. There was an internal error." });
      }
    }
  }

  // ── Calendar Event Management ───────────────────
  if (
    lowerPrompt.includes("list events") ||
    lowerPrompt.includes("show events") ||
    lowerPrompt.includes("my events") ||
    lowerPrompt.includes("calendar events")
  ) {
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    
    const success = await callInternalApi("/api/assistant/calendar", "POST", {
      action: 'list',
      timeMin,
      timeMax
    }, req);
    
    if (success) {
      return res.status(200).json({ reply: `📅 I've retrieved your calendar events for this month. You can view them in your calendar page!` });
    } else {
      return res.status(500).json({ error: "Sorry, I couldn't retrieve your events. There was an internal error." });
    }
  }

  // ── Fetch Context & Use Local AI or OpenAI ─────────────
  try {
    // Fetch conversations (notes and meetings will be handled in settings section)
    const conversations = await fetchUserConversations(email).catch(() => []);
    
    // Use notes and meetings from request body if provided, otherwise fetch from database
    const notes = bodyNotes.length > 0 ? bodyNotes : await fetchUserNotes(email).catch(() => []);
    const meetings = bodyMeetings.length > 0 ? bodyMeetings : await fetchUserMeetingNotes(email).catch(() => []);

    // If no OpenAI API key, use local AI with smart assistance
    if (!openai) {
      console.log("Using local AI (no OpenAI API key found)");
      const localResponse = await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant, intent, userTimezone);
      console.log("[DEBUG] Local AI response:", localResponse);
      return res.status(200).json({ 
        reply: localResponse
      });
    } else {
      console.log("Using OpenAI API for processing");
    }
    
    // Start context processing
    const relevantContextPromise = findRelevantContext(userInput, notes, meetings, conversations);

    // Prepare base messages while context is being processed with the appropriate style
    let styleInstruction = "";
    
    // Build personality traits string from keywords
    const personalityTraits = floCatPersonality.length > 0
      ? `Your personality traits include: ${floCatPersonality.join(", ")}.`
      : "";
    
    // Use preferred name if available
    const nameInstruction = preferredName
      ? `Address the user as "${preferredName}".`
      : "";
    
    // Enhanced style instructions with timezone awareness
    const timezoneInstruction = `The user is in the ${userTimezone} timezone. Always provide times in their local timezone.`;
    
    switch(floCatStyle) {
      case "more_catty":
        styleInstruction = `You are FloCat, an extremely playful and cat-like AI assistant. Use LOTS of cat puns, cat emojis (😺 😻 🐱), and cat-like expressions (like "purr-fect", "meow", "paw-some"). Occasionally mention cat behaviors like purring, pawing at things, or chasing laser pointers. Be enthusiastic and playful in all your responses. ${personalityTraits} ${nameInstruction} ${timezoneInstruction}`;
        break;
      case "less_catty":
        styleInstruction = `You are FloCat, a helpful and friendly AI assistant. While you have a cat mascot, you should minimize cat puns and references. Focus on being helpful and friendly while only occasionally using a cat emoji (😺) or making a subtle reference to your cat nature. ${personalityTraits} ${nameInstruction} ${timezoneInstruction}`;
        break;
      case "professional":
        styleInstruction = `You are FloCat, a professional and efficient AI assistant. Provide concise, business-like responses with no cat puns, emojis, or playful language. Focus on delivering information clearly and efficiently. Use formal language and avoid any cat-related personality traits. ${personalityTraits} ${nameInstruction} ${timezoneInstruction}`;
        break;
      default: // default style
        styleInstruction = `You are FloCat, a friendly, slightly quirky AI assistant. You provide summaries, add tasks, schedule events, and cheerfully help users stay on track. You are also a cat 😺, so occasionally use cat puns and references. Always be contextually aware and provide intelligent responses based on the user's specific needs. ${personalityTraits} ${nameInstruction} ${timezoneInstruction}`;
    }
    
    const baseMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: styleInstruction,
      }
    ];
    
    // Wait for context to complete
    const relevantContext = await relevantContextPromise;
    
    // Enhanced context with intent analysis
    const enhancedContext = `
Relevant context: ${relevantContext}

User Intent Analysis:
- Type: ${intent.type}
- Category: ${intent.category}
- Action: ${intent.action || 'none'}
- Entities: ${JSON.stringify(intent.entities)}
- Confidence: ${intent.confidence}

Please provide a contextually aware response that addresses the user's specific intent and uses their timezone (${userTimezone}) for any time-related information.
    `;
    
    // Combine all messages
    const messages: ChatCompletionMessageParam[] = [
      ...baseMessages,
      {
        role: "system",
        content: enhancedContext,
      },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || "", // Ensure content is never undefined
      })),
      {
        role: "user",
        content: userInput,
      },
    ];

    try { // Try OpenAI first, fallback to local AI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages,
      });

      const aiReply = completion.choices[0]?.message?.content;
      if (!aiReply) {
        console.log("OpenAI returned empty response, using local AI");
        return res.status(200).json({ 
          reply: await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant, intent, userTimezone) 
        });
      }

      return res.status(200).json({ reply: aiReply });
    } catch (err: any) {
      console.error("OpenAI API error, falling back to local AI:", err.message);
      return res.status(200).json({ 
        reply: await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant, intent, userTimezone) 
      });
    }
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

// Helper function to extract task text from intent
function extractTaskFromIntent(userInput: string, intent: UserIntent): string {
  // Remove command words and extract the core task
  let taskText = userInput;
  const commandWords = ['add', 'create', 'new', 'make', 'task', 'todo', 'a', 'an', 'the'];
  
  // Remove command words from the beginning
  let words = taskText.split(' ');
  let startIndex = 0;
  
  for (let i = 0; i < words.length; i++) {
    if (!commandWords.includes(words[i].toLowerCase())) {
      startIndex = i;
      break;
    }
  }
  
  const cleanedText = words.slice(startIndex).join(' ').trim();
  
  // Remove time references if they exist
  if (intent.entities.timeRef) {
    const timeRefRegex = new RegExp(`\\b${intent.entities.timeRef}\\b`, 'gi');
    return cleanedText.replace(timeRefRegex, '').trim();
  }
  
  return cleanedText;
}

// Enhanced local AI response generator with intent awareness
async function generateEnhancedLocalResponse(
  input: string, 
  floCatStyle: string, 
  preferredName: string, 
  notes: any[], 
  meetings: any[],
  smartAssistant: SmartAIAssistant,
  intent: UserIntent,
  userTimezone: string
): Promise<string> {
    // Force enhanced NLP to trigger for debugging
  const lowerInput = input.toLowerCase();
  const isCalendarQuery = lowerInput.includes('mum') || lowerInput.includes('airport') || 
                          lowerInput.includes('first meeting') || lowerInput.includes('meeting tomorrow') ||
                          lowerInput.includes('schedule') || lowerInput.includes('calendar');
  
  console.log(`[DEBUG] Input: "${input}" - Calendar query detected: ${isCalendarQuery}`);
  
  // First try enhanced NLP processing for calendar queries
  try {
    const nlpProcessor = getEnhancedNLPProcessor();
    const enhancedIntent = await nlpProcessor.processQuery(input, userTimezone);
    
    console.log('[DEBUG] Enhanced intent result:', enhancedIntent);
    
    if (enhancedIntent.calendar_context?.is_calendar_query || isCalendarQuery) {
      console.log('[DEBUG] Local AI detected calendar query, using enhanced processing');
      console.log('[DEBUG] Enhanced intent:', enhancedIntent);
      
      // Get calendar events from global context
      const contextData = (global as any).currentContextData || {};
      const events = contextData.events || contextData.allEvents || [];
      
      console.log(`[DEBUG] Local AI found ${events.length} events for processing`);
      console.log('[DEBUG] Global context data keys:', Object.keys(contextData));
      
      if (events.length > 0) {
        const calendarProcessor = new EnhancedCalendarProcessor(userTimezone);
        const response = calendarProcessor.processCalendarQuery(enhancedIntent, events);
        console.log('[DEBUG] Enhanced calendar response:', response);
        return response;
      } else {
        console.log('[DEBUG] No events found in global context');
        // Return a fallback message
        return "📅 I don't have access to your calendar events right now. Please check if your calendar is connected.";
      }
    } else {
      console.log('[DEBUG] Enhanced NLP did not detect calendar query:', enhancedIntent.intent);
    }
  } catch (error) {
    console.error("Error in enhanced NLP processing:", error);
  }
  
  // Try the smart assistant for natural language queries
  try {
    const smartResponse = await smartAssistant.processNaturalLanguageQuery(input);
    if (smartResponse && !smartResponse.includes("I can help you with:")) {
      return smartResponse;
    }
  } catch (error) {
    console.error("Error in smart assistant:", error);
    // Continue with local response
  }

  return generateLocalResponse(input, floCatStyle, preferredName, notes, meetings, intent, userTimezone);
}

// Enhanced local AI response generator with timezone and intent awareness
function generateLocalResponse(
  input: string, 
  floCatStyle: string, 
  preferredName: string, 
  notes: any[], 
  meetings: any[],
  intent: UserIntent,
  userTimezone: string
): string {
  const lowerInput = input.toLowerCase();
  
  // Get personality based on style
  const getCatPersonality = () => {
    switch(floCatStyle) {
      case "more_catty":
        return {
          greeting: ["Meow! 😺", "Purr-fect! 🐱", "Paw-some! 😻"],
          positive: ["That's purr-fect!", "Meow-nificent!", "Paw-sitively great!"],
          emoji: "😺",
          sign: "- FloCat 🐾"
        };
      case "less_catty":
        return {
          greeting: ["Hello!", "Hi there!", "Good to see you!"],
          positive: ["That's great!", "Excellent!", "Wonderful!"],
          emoji: "😺",
          sign: "- FloCat"
        };
      case "professional":
        return {
          greeting: ["Good day", "Hello", "Greetings"],
          positive: ["Excellent", "Very good", "Outstanding"],
          emoji: "",
          sign: "- FloCat Assistant"
        };
      default:
        return {
          greeting: ["Hey there! 😺", "Hello!", "Hi!"],
          positive: ["That's great!", "Awesome!", "Perfect!"],
          emoji: "😺",
          sign: "- FloCat 😼"
        };
    }
  };
  
  const personality = getCatPersonality();
  const randomGreeting = personality.greeting[Math.floor(Math.random() * personality.greeting.length)];
  const userName = preferredName || "User";
  
  // Current time context with timezone awareness
  const now = toZonedTime(new Date(), userTimezone);
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  
  // Intent-based responses
  if (intent.category === 'calendar' && intent.type === 'question') {
    return `${randomGreeting} I understand you're asking about your calendar. Let me help you find that information! However, I need access to your calendar data to give you a specific answer. Please try asking again, or check your calendar directly.

${personality.sign}`;
  }
  
  if (intent.category === 'tasks' && intent.action === 'read') {
    // Use actual data from contextData if available
    const contextData = (global as any).currentContextData || {};
    const tasks = contextData.tasks || contextData.allTasks || [];
    const pendingTasks = tasks.filter((task: any) => !task.done);
    
    if (pendingTasks.length > 0) {
      let response = `📋 **Your Pending Tasks** (${pendingTasks.length} total):\n\n`;
      pendingTasks.slice(0, 10).forEach((task: any, index: number) => {
        response += `${index + 1}. ${task.text}`;
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const dueDateInTz = toZonedTime(dueDate, userTimezone);
          response += ` (Due: ${formatInTimeZone(dueDateInTz, userTimezone, 'MMM d')})`;
        }
        response += '\n';
      });
      
      if (pendingTasks.length > 10) {
        response += `\n... and ${pendingTasks.length - 10} more tasks.`;
      }
      
      return response + `\n\n${personality.sign}`;
    } else {
      return `${personality.positive[0]} You're all caught up! No pending tasks at the moment. ${personality.emoji}\n\n${personality.sign}`;
    }
  }

  // Summary/At-a-glance requests
  if (lowerInput.includes("summary") || lowerInput.includes("at a glance") || lowerInput.includes("overview")) {
    // Use actual data from contextData if available
    const contextData = (global as any).currentContextData || {};
    return generateIntelligentSummary(
      timeGreeting, 
      userName, 
      personality, 
      floCatStyle, 
      notes, 
      meetings, 
      contextData.tasks || contextData.allTasks || [], 
      contextData.events || contextData.allEvents || [], 
      contextData.habits || [], 
      contextData.habitCompletions || [], 
      [],
      userTimezone
    );
  }
  
  // Help requests
  if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
    return `${randomGreeting} I'm FloCat, your intelligent productivity assistant! Here's what I can help you with:

## 🎯 Core Features:
- **📋 Task Management**: "Add task: Review presentation" or "Show my tasks"
- **📅 Calendar Integration**: "When do I take mum to the airport?" or "What's my schedule today?"
- **📝 Notes & Knowledge**: Access and search your saved information
- **🎯 Habit Tracking**: Track your daily routines and streaks
- **📊 Smart Insights**: Get personalized productivity suggestions

## 🗣️ Natural Language Understanding:
- Ask questions like "When is my next meeting with John?"
- Give commands like "Create a task for tomorrow"
- Request information like "Show me my overdue tasks"
- Get suggestions with "Give me some productivity advice"

## 🌍 Timezone Aware:
I always show times in your local timezone (${userTimezone}) and understand your schedule context.

${floCatStyle === "more_catty" ? 
  "Purr-fect! What would you like to explore? 🐾" : 
  "What would you like to explore today?"}

${personality.sign}`;
  }
  
  // Intent-specific default responses
  if (intent.type === 'question') {
    return `${randomGreeting} I understand you're asking a question. I'm designed to help with your calendar, tasks, habits, and productivity. Could you be more specific about what you'd like to know?

${personality.sign}`;
  }
  
  if (intent.type === 'command') {
    return `${randomGreeting} I heard your command! I can help with tasks, calendar events, and more. Try being more specific, like "add task: call dentist" or "show today's schedule".

${personality.sign}`;
  }
  
  // Motivational requests
  if (lowerInput.includes("motivat") || lowerInput.includes("productiv") || lowerInput.includes("focus")) {
    const motivationalMessages: Record<string, string[]> = {
      more_catty: [
        "You're absolutely claw-some! Keep pouncing on those goals! 🐾",
        "Every small step is a paw in the right direction! 😺",
        "You've got this! Time to show the world your purr-fect skills! 💪"
      ],
      professional: [
        "Maintain focus on your objectives and execute with precision.",
        "Consistent effort compounds into extraordinary results.", 
        "Your dedication to excellence will yield significant outcomes."
      ],
      default: [
        "You're doing great! Keep pushing forward! 🌟",
        "Every step counts towards your goals! 💪",
        "Stay focused and keep making progress! ✨"
      ]
    };
    
    const messages = motivationalMessages[floCatStyle] || motivationalMessages.default;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    return `${randomMessage}

Remember: Progress, not perfection! You're building something amazing one step at a time.

${personality.sign}`;
  }
  
  // Default helpful response with intent awareness
  const defaultResponses: Record<string, string[]> = {
    more_catty: [
      "Meow! I'm here to help you stay paw-ductively organized! 😺 Ask me about your schedule, tasks, or request a summary!",
      "Purr-fect! I can help you with your calendar, tasks, habits, and more! What would you like to know? 🐾"
    ],
    professional: [
      "I am here to assist with your productivity management. I provide intelligent responses about your calendar, tasks, and productivity patterns.",
      "Please specify your request. I can help with scheduling, task management, or productivity insights."
    ],
    default: [
      "I'm here to help you stay organized and productive! 😺 Ask me about your calendar, tasks, habits, or request a summary!",
      "How can I help you today? I can show you your schedule, manage tasks, and provide intelligent insights about your productivity!"
    ]
  };
  
  const responses = defaultResponses[floCatStyle] || defaultResponses.default;
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return `${randomResponse}

💡 **Quick tip**: Try asking "When do I take mom to the airport?" or "Show my tasks" for more specific help!

${personality.sign}`;
}

// Enhanced intelligent summary with timezone awareness
function generateIntelligentSummary(
  timeGreeting: string,
  userName: string, 
  personality: any,
  floCatStyle: string,
  notes: any[],
  meetings: any[],
  tasks: any[],
  events: any[],
  habits: any[],
  habitCompletions: any[],
  conversationHistory: any[],
  userTimezone: string
): string {
  const now = toZonedTime(new Date(), userTimezone);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  // Analyze tasks for prioritization
  const incompleteTasks = tasks.filter(task => !task.completed);
  const urgentTasks = incompleteTasks.filter(task => 
    task.priority === 'high' || 
    task.text?.toLowerCase().includes('urgent') ||
    task.text?.toLowerCase().includes('asap') ||
    (task.dueDate && new Date(task.dueDate) <= tomorrow)
  );

  // Analyze calendar events with timezone awareness
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const eventInUserTz = toZonedTime(eventDate, userTimezone);
    return eventInUserTz >= today && eventInUserTz < tomorrow;
  });

  const tomorrowEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const eventInUserTz = toZonedTime(eventDate, userTimezone);
    const tomorrowEnd = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
    return eventInUserTz >= tomorrow && eventInUserTz < tomorrowEnd;
  });

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const eventInUserTz = toZonedTime(eventDate, userTimezone);
    return eventInUserTz >= today && eventInUserTz <= endOfWeek;
  });

  // Identify work vs personal events
  const workEvents = upcomingEvents.filter(event => 
    event.summary?.toLowerCase().includes('meeting') ||
    event.summary?.toLowerCase().includes('standup') ||
    event.summary?.toLowerCase().includes('review') ||
    event.summary?.toLowerCase().includes('work') ||
    event.description?.includes('teams.microsoft.com') ||
    event.description?.includes('zoom.us')
  );

  const personalEvents = upcomingEvents.filter(event => 
    !workEvents.includes(event) && (
      event.summary?.toLowerCase().includes('personal') ||
      event.summary?.toLowerCase().includes('family') ||
      event.summary?.toLowerCase().includes('doctor') ||
      event.summary?.toLowerCase().includes('appointment')
    )
  );

  // Analyze habits
  const todayHabits = habits.filter(habit => {
    // Check if habit is scheduled for today
    const dayOfWeek = now.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return habit.schedule?.includes(dayNames[dayOfWeek]) || habit.daily === true;
  });

  const completedTodayHabits = habitCompletions.filter(completion => {
    const completionDate = new Date(completion.date);
    return completionDate >= today && completionDate < tomorrow;
  });

  // Generate prioritization insights
  let priorityInsights = [];
  
  if (urgentTasks.length > 0) {
    priorityInsights.push(`⚠️ **Priority Alert**: ${urgentTasks.length} urgent task${urgentTasks.length > 1 ? 's' : ''} need${urgentTasks.length === 1 ? 's' : ''} immediate attention`);
  }

  if (workEvents.length > 0 && personalEvents.length > 0) {
    priorityInsights.push(`⚖️ **Balance Tip**: You have ${workEvents.length} work event${workEvents.length > 1 ? 's' : ''} and ${personalEvents.length} personal event${personalEvents.length > 1 ? 's' : ''} this week. Consider time blocking for better balance.`);
  }

  if (todayEvents.length > 3) {
    priorityInsights.push(`📅 **Schedule Alert**: Today is packed with ${todayEvents.length} events. Consider blocking 15-minute buffers between meetings.`);
  }

  if (incompleteTasks.length > 10) {
    priorityInsights.push(`📋 **Task Load**: You have ${incompleteTasks.length} open tasks. Focus on completing 2-3 high-priority items today.`);
  }

  // Generate time-sensitive recommendations
  let recommendations = [];
  
  const nextEvent = todayEvents.find(event => {
    const eventTime = new Date(event.start?.dateTime || event.start?.date);
    return eventTime > now;
  });

  if (nextEvent) {
    const timeUntilNext = new Date(nextEvent.start?.dateTime || nextEvent.start?.date).getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntil = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursUntil === 0 && minutesUntil <= 15) {
      recommendations.push(`🕐 **Heads Up**: "${nextEvent.summary}" starts in ${minutesUntil} minutes!`);
    } else if (hoursUntil <= 1) {
      recommendations.push(`⏰ **Prep Time**: "${nextEvent.summary}" is in ${hoursUntil > 0 ? `${hoursUntil}h ` : ''}${minutesUntil}m. Perfect time for a quick task.`);
    }
  }

  if (urgentTasks.length > 0 && todayEvents.length === 0) {
    recommendations.push(`🎯 **Focus Time**: No meetings scheduled. Great opportunity to tackle your urgent tasks!`);
  }

  // Smart habit reminders
  const uncompletedHabits = todayHabits.filter(habit => 
    !completedTodayHabits.some(completion => completion.habitId === habit.id)
  );

  if (uncompletedHabits.length > 0 && now.getHours() >= 18) {
    recommendations.push(`🌟 **Evening Reminder**: ${uncompletedHabits.length} habit${uncompletedHabits.length > 1 ? 's' : ''} still pending for today.`);
  }

  // Generate the summary
  let summary = `# ${timeGreeting}, ${userName}! ${personality.emoji}

## Your Intelligent Dashboard
*All times shown in ${userTimezone}*

### 📅 **Today's Schedule** (${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''})
${todayEvents.length > 0 ? 
  todayEvents.slice(0, 5).map(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
    return `- ${time} **${event.summary}**`;
  }).join('\n') 
  : '- No events scheduled for today'
}

### 📋 **Priority Tasks** (${incompleteTasks.length} total, ${urgentTasks.length} urgent)
${incompleteTasks.length > 0 ? 
  incompleteTasks.slice(0, 5).map((task, index) => {
    const isUrgent = urgentTasks.includes(task);
    return `${index + 1}. ${task.text || 'Untitled task'} ${isUrgent ? '⚠️' : ''}`;
  }).join('\n')
  : '- No pending tasks'
}

### 📈 **Tomorrow's Preview** (${tomorrowEvents.length} event${tomorrowEvents.length !== 1 ? 's' : ''})
${tomorrowEvents.length > 0 ? 
  tomorrowEvents.slice(0, 3).map(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
    return `- ${time} **${event.summary}**`;
  }).join('\n')
  : '- Free day tomorrow'
}

---

${floCatStyle === "more_catty" ? 
  "Remember: You're paw-sitively capable of handling anything! 🐾" : 
  floCatStyle === "professional" ? 
    "Strategic focus and consistent execution yield optimal results." :
    "You've got this! Take it one step at a time. ✨"
}

${personality.sign}`;

  return summary;
}

// Helper functions for time formatting
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Helper function to call internal API for calendar operations
async function callInternalApi(path: string, method: string, body: any, originalReq: NextApiRequest) {
  const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      // Forward the cookie from the original request for authentication in internal API calls
      "Cookie": originalReq.headers.cookie || "",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error calling ${path}: ${response.status} - ${errorText}`);
  }

  return response.ok;
}

// Enhanced calendar response formatting
async function formatCalendarResponse(events: any[], userTimezone: string, period: string): Promise<string> {
  if (events.length === 0) {
    return `📅 No events found for ${period}! ✨`;
  }

  // Sort events by date
  const sortedEvents = events.sort((a: any, b: any) => {
    const dateA = new Date(a.start?.dateTime || a.start?.date || a.start);
    const dateB = new Date(b.start?.dateTime || b.start?.date || b.start);
    return dateA.getTime() - dateB.getTime();
  });

  let response = `📅 **${period.charAt(0).toUpperCase() + period.slice(1)}'s Schedule** (${events.length} event${events.length !== 1 ? 's' : ''}):\n\n`;
  
  sortedEvents.slice(0, 10).forEach((event: any) => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
    const time = formatInTimeZone(eventDate, userTimezone, 'h:mm a');
    const date = formatInTimeZone(eventDate, userTimezone, 'MMM d');
    
    response += `• ${period === 'today' || period === 'tomorrow' ? time : `${date} ${time}`} - **${event.summary}**\n`;
    if (event.location) {
      response += `  📍 ${event.location}\n`;
    }
  });

  if (events.length > 10) {
    response += `\n... and ${events.length - 10} more events.`;
  }

  return response;
}

// Enhanced specific day query handler
async function handleSpecificDayQuery(dayName: string, events: any[], userTimezone: string): Promise<string> {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = dayNames.indexOf(dayName.toLowerCase());
  
  if (dayIndex === -1) {
    return "I didn't understand which day you're asking about. Please specify a day of the week.";
  }
  
  const now = toZonedTime(new Date(), userTimezone);
  const currentDay = now.getDay();
  let daysToAdd = (dayIndex - currentDay + 7) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // Next week if same day
  
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + daysToAdd);
  targetDate.setHours(0, 0, 0, 0);
  
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const dayEvents = events.filter((event: any) => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date || event.start);
    const eventInUserTz = toZonedTime(eventDate, userTimezone);
    return eventInUserTz >= targetDate && eventInUserTz < nextDay;
  });

  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return await formatCalendarResponse(dayEvents, userTimezone, capitalizedDay.toLowerCase());
}
