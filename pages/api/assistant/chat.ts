import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { validateEmail, sanitizeText } from "@/lib/validation";
import OpenAI from "openai";
import { db } from "@/lib/drizzle";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ChatRequest, ChatResponse, AssistantContext } from "@/lib/assistant/types";
import { analyzeUserIntent, extractTaskFromIntent } from "@/lib/assistant/intentAnalyzer";
import { processCalendarQuery } from "@/lib/assistant/calendarProcessor";
import { parseDueDate } from "@/lib/assistant/dateUtils";
import { SmartAIAssistant } from "@/lib/aiAssistant";
import { findMatchingCapability } from "@/lib/floCatCapabilities";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// PERFORMANCE FIX: Add request timeout and response size limits
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RESPONSE_LENGTH = 5000; // Limit response size

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  // PERFORMANCE FIX: Set response timeout
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, REQUEST_TIMEOUT);

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // SECURITY FIX: Authentication and input validation
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // SECURITY FIX: Validate and sanitize inputs
    const { userInput, style, preferredName, contextData }: ChatRequest = req.body;
    
    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({ error: 'User input is required' });
    }

    const sanitizedInput = sanitizeText(userInput, 1000); // Limit input length
    const sanitizedStyle = style ? sanitizeText(style, 100) : undefined;
    const sanitizedName = preferredName ? sanitizeText(preferredName, 50) : undefined;

    // PERFORMANCE FIX: Get user context efficiently
    const context = await getUserContext(decoded.userId, user.email, req);
    
    // PERFORMANCE FIX: Analyze intent first to route efficiently
    const intent = analyzeUserIntent(sanitizedInput);
    
    // Add debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analyzed intent:', intent);
    }
    
    // PERFORMANCE FIX: Route to specific handlers based on intent
    let response: string;
    let actions: ChatResponse['actions'] = [];

    if (intent.category === 'calendar' && intent.confidence > 0.6) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Routing to calendar intent handler');
      }
      response = await handleCalendarIntent(sanitizedInput, context, contextData);
    } else if (intent.category === 'tasks' && intent.confidence > 0.6) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Routing to task intent handler');
      }
      const result = await handleTaskIntent(sanitizedInput, intent, context);
      response = result.response;
      actions = result.actions;
    } else {
      // PERFORMANCE FIX: Use capability matching for other intents
      const capabilityMatch = findMatchingCapability(sanitizedInput);
      if (capabilityMatch) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Routing to capability match:', capabilityMatch.capability.featureName);
        }
        response = await capabilityMatch.capability.handler(
          capabilityMatch.command,
          capabilityMatch.args
        );
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('Routing to general query handler');
        }
        // PERFORMANCE FIX: Use optimized AI assistant
        response = await handleGeneralQuery(sanitizedInput, context, sanitizedStyle, sanitizedName);
      }
    }

    // PERFORMANCE FIX: Limit response length
    if (response.length > MAX_RESPONSE_LENGTH) {
      response = response.substring(0, MAX_RESPONSE_LENGTH) + '... [truncated]';
    }

    clearTimeout(timeoutId);
    return res.status(200).json({ 
      reply: response,
      actions: actions && actions.length > 0 ? actions : undefined
    });

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Chat API error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'An error occurred while processing your request. Please try again.' 
      });
    }
  }
}

// PERFORMANCE FIX: Optimized user context retrieval
async function getUserContext(userId: number, email: string, req: NextApiRequest): Promise<AssistantContext> {
  try {
    const userSettingsData = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, email),
      columns: {
        timezone: true,
        preferredName: true,
        floCatStyle: true
      }
    });

    return {
      userId,
      email,
      userTimezone: userSettingsData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      userSettings: userSettingsData,
      cookies: req.headers.cookie || ''
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {
      userId,
      email,
      userTimezone: 'UTC',
      userSettings: null,
      cookies: req.headers.cookie || ''
    };
  }
}

// PERFORMANCE FIX: Optimized calendar intent handling
async function handleCalendarIntent(userInput: string, context: AssistantContext, contextData: any): Promise<string> {
  try {
    // PERFORMANCE FIX: Check if we have calendar data before processing
    if (!contextData?.allEvents && !contextData?.events) {
      // PERFORMANCE FIX: Fetch minimal calendar data
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar`, {
        headers: { 
          'Cookie': context.cookies,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const calendarData = await response.json();
        contextData = { allEvents: calendarData.events || [] };
      } else {
        return "I'm having trouble accessing your calendar right now. Please try again later.";
      }
    }

    return await processCalendarQuery(userInput, context.userTimezone, contextData);
  } catch (error) {
    console.error('Calendar intent error:', error);
    return "I'm having trouble processing your calendar request. Please try again.";
  }
}

// PERFORMANCE FIX: Optimized task intent handling
async function handleTaskIntent(userInput: string, intent: any, context: AssistantContext): Promise<{ response: string; actions: ChatResponse['actions'] }> {
  try {
    if (intent.action === 'create') {
      const taskText = extractTaskFromIntent(userInput, intent);
      const dueDate = intent.entities.timeRef ? parseDueDate(intent.entities.timeRef, context.userTimezone) : undefined;

      // PERFORMANCE FIX: Direct task creation
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': context.cookies
        },
        body: JSON.stringify({
          text: taskText,
          done: false,
          dueDate,
          source: 'ai_assistant'
        })
      });

      if (response.ok) {
        const createdTask = await response.json();
        return {
          response: `✅ I've created the task "${taskText}"${dueDate ? ` with due date ${new Date(dueDate).toLocaleDateString()}` : ''}.`,
          actions: [{
            type: 'create_task',
            data: createdTask,
            message: 'Task created successfully'
          }]
        };
      } else {
        return {
          response: "I had trouble creating that task. Please try again.",
          actions: []
        };
      }
    }

    return {
      response: "I understand you're asking about tasks, but I'm not sure what you'd like me to do. Try asking me to create a task or show you your tasks.",
      actions: []
    };
  } catch (error) {
    console.error('Task intent error:', error);
    return {
      response: "I'm having trouble processing your task request. Please try again.",
      actions: []
    };
  }
}

// PERFORMANCE FIX: Optimized general query handling
async function handleGeneralQuery(userInput: string, context: AssistantContext, style?: string, preferredName?: string): Promise<string> {
  try {
    if (!openai) {
      return "I'm not able to process complex queries right now. Please try asking about your calendar or tasks.";
    }

    // PERFORMANCE FIX: Use lightweight AI assistant
    const smartAssistant = new SmartAIAssistant(context.email);
    
    // Add debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Processing general query:', userInput);
      console.log('Context email:', context.email);
    }
    
    const response = await smartAssistant.processNaturalLanguageQuery(userInput);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Smart assistant response:', response);
    }
    
    return response || "I'm not sure how to help with that. Try asking about your calendar, tasks, or habits.";
  } catch (error) {
    console.error('General query error:', error);
    return "I'm having trouble processing that request. Please try rephrasing your question.";
  }
}