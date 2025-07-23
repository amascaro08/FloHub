import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import OpenAI from "openai";
import { db } from "@/lib/drizzle";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
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

// Types
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
};

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Utility to parse simple due phrases like "today", "tomorrow", "in 3 days", "next Monday"
const parseDueDate = (phrase: string): string | undefined => {
  const now = new Date();
  const dayMs = 86400000;

  if (phrase === "today") {
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }

  if (phrase === "tomorrow") {
    const date = new Date(now.getTime() + dayMs);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  const inDaysMatch = phrase.match(/^in (\d+) days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const date = new Date(now.getTime() + days * dayMs);
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
      let date = new Date(now);
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

  const lowerPrompt = userInput.toLowerCase();

  // Initialize Smart AI Assistant for pattern analysis and suggestions
  const smartAssistant = new SmartAIAssistant(email);
  // Check for proactive suggestion requests
  if (lowerPrompt.includes("suggestion") || lowerPrompt.includes("recommend") || lowerPrompt.includes("advice")) {
    try {
      await smartAssistant.loadUserContext();
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

  // Check for natural language queries first
  if (lowerPrompt.includes("when did") || lowerPrompt.includes("show me") || 
      lowerPrompt.includes("what") || lowerPrompt.includes("how") ||
      lowerPrompt.includes("find") || lowerPrompt.includes("search")) {
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

  const callInternalApi = async (path: string, method: string, body: any, originalReq: NextApiRequest) => {
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
  };

  // ── Enhanced Add Task Detection ─────────────────────────────
  // More flexible task detection patterns
  const taskPatterns = [
    /(?:add|create|new|make)\s+(?:a\s+)?task:?\s*(.+)/i,
    /(?:add|create|new|make)\s+(.+?)\s+(?:to\s+)?(?:my\s+)?(?:task\s+)?list/i,
    /task:?\s*(.+)/i
  ];
  
  for (const pattern of taskPatterns) {
    const taskMatch = userInput.match(pattern);
    if (taskMatch && taskMatch[1]) {
      const taskText = taskMatch[1].trim();
      
      // Check for due date in the task text
      const dueMatch = taskText.match(/(.+?)\s+due\s+(.+)$/i);
      const finalTaskText = dueMatch ? dueMatch[1].trim() : taskText;
      const duePhrase = dueMatch ? dueMatch[2].trim().toLowerCase() : null;
      const dueDate = duePhrase ? parseDueDate(duePhrase) : undefined;

      const payload: any = { text: finalTaskText };
      if (dueDate) payload.dueDate = dueDate;

      console.log(`[DEBUG] Creating task via direct API: "${finalTaskText}", due: ${dueDate}`);
      const success = await callInternalApi("/api/tasks", "POST", payload, req);
      if (success) {
        return res.status(200).json({
          reply: `✅ Task "${finalTaskText}" added${dueDate ? ` (due ${duePhrase})` : ""}.`,
        });
      } else {
        return res.status(500).json({ error: "Sorry, I couldn't add the task. There was an internal error." });
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
    
    // Fetch user settings to get FloCat style preference
    const userSettingsData = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, email),
      columns: {
        floCatStyle: true,
        floCatPersonality: true,
        preferredName: true,
      },
    });
    const floCatStyle = bodyFloCatStyle || userSettingsData?.floCatStyle || "default";
    const floCatPersonality = userSettingsData?.floCatPersonality || [];
    const preferredName = bodyPreferredName || userSettingsData?.preferredName || "";
    
    // Use notes and meetings from request body if provided, otherwise fetch from database
    const notes = bodyNotes.length > 0 ? bodyNotes : await fetchUserNotes(email).catch(() => []);
    const meetings = bodyMeetings.length > 0 ? bodyMeetings : await fetchUserMeetingNotes(email).catch(() => []);

    // If no OpenAI API key, use local AI with smart assistance
    if (!openai) {
      console.log("Using local AI (no OpenAI API key found)");
      return res.status(200).json({ 
        reply: await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant) 
      });
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
    
    switch(floCatStyle) {
      case "more_catty":
        styleInstruction = `You are FloCat, an extremely playful and cat-like AI assistant. Use LOTS of cat puns, cat emojis (😺 😻 🐱), and cat-like expressions (like "purr-fect", "meow", "paw-some"). Occasionally mention cat behaviors like purring, pawing at things, or chasing laser pointers. Be enthusiastic and playful in all your responses. ${personalityTraits} ${nameInstruction}`;
        break;
      case "less_catty":
        styleInstruction = `You are FloCat, a helpful and friendly AI assistant. While you have a cat mascot, you should minimize cat puns and references. Focus on being helpful and friendly while only occasionally using a cat emoji (😺) or making a subtle reference to your cat nature. ${personalityTraits} ${nameInstruction}`;
        break;
      case "professional":
        styleInstruction = `You are FloCat, a professional and efficient AI assistant. Provide concise, business-like responses with no cat puns, emojis, or playful language. Focus on delivering information clearly and efficiently. Use formal language and avoid any cat-related personality traits. ${personalityTraits} ${nameInstruction}`;
        break;
      default: // default style
        styleInstruction = `You are FloCat, a friendly, slightly quirky AI assistant. You provide summaries, add tasks, schedule events, and cheerfully help users stay on track. You are also a cat 😺, so occasionally use cat puns and references. ${personalityTraits} ${nameInstruction}`;
    }
    
    const baseMessages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: styleInstruction,
      }
    ];
    
    // Wait for context to complete
    const relevantContext = await relevantContextPromise;
    
    // Combine all messages
    const messages: ChatCompletionMessageParam[] = [
      ...baseMessages,
      {
        role: "system",
        content: `Relevant context:\n${relevantContext}`,
      },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content || "", // Ensure content is never undefined
      })),
      {
        role: "user",
        content: userInput, // Use userInput instead of prompt
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
          reply: await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant) 
        });
      }

      return res.status(200).json({ reply: aiReply });
    } catch (err: any) {
      console.error("OpenAI API error, falling back to local AI:", err.message);
      return res.status(200).json({ 
        reply: await generateEnhancedLocalResponse(userInput, floCatStyle, preferredName, notes, meetings, smartAssistant) 
      });
    }
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

// Enhanced local AI response generator with smart assistance
async function generateEnhancedLocalResponse(
  input: string, 
  floCatStyle: string, 
  preferredName: string, 
  notes: any[], 
  meetings: any[],
  smartAssistant: SmartAIAssistant
): Promise<string> {
  // First try the smart assistant for natural language queries
  try {
    const smartResponse = await smartAssistant.processNaturalLanguageQuery(input);
    if (smartResponse && !smartResponse.includes("I can help you with:")) {
      return smartResponse;
    }
  } catch (error) {
    console.error("Error in smart assistant:", error);
    // Continue with local response
  }

  return generateLocalResponse(input, floCatStyle, preferredName, notes, meetings);
}

// Local AI response generator (no external API required)
function generateLocalResponse(
  input: string, 
  floCatStyle: string, 
  preferredName: string, 
  notes: any[], 
  meetings: any[]
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
  
  // Current time context
  const now = new Date();
  const hour = now.getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  
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
      []
    );
  }
  
  // Help requests
  if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
    return `${randomGreeting} I'm FloCat, your productivity assistant! Here's what I can help you with:

## 🎯 Core Features:
- **📋 Task Management**: Create, view, and organize your tasks
- **📅 Calendar Integration**: Schedule events and view your agenda  
- **📝 Notes & Knowledge**: Organize your thoughts and information
- **🎯 Habit Tracking**: Build and maintain positive routines
- **📊 Daily Summaries**: Get overviews of your progress

## 🗣️ How to Talk to Me:
- Ask for a "summary" or "overview" to see your day
- Say "my tasks" or "show tasks" for your todo items
- Ask about "calendar" or "today's events" for your schedule
- Say "my notes" to browse your saved information
- Request "motivation" when you need encouragement

I'm constantly learning to provide you with more personalized and helpful insights!

${floCatStyle === "more_catty" ? "Purr-fect! What would you like to explore? 🐾" : "What would you like to explore today?"}

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
  
  // Default helpful response
  const defaultResponses: Record<string, string[]> = {
    more_catty: [
      "Meow! I'm here to help you stay paw-ductively organized! 😺 Ask me for a summary, or about your tasks and schedule!",
      "Purr-fect! I can help you with summaries, tasks, calendar events, and more! What would you like to know? 🐾"
    ],
    professional: [
      "I am here to assist with your productivity management. I can provide summaries, task updates, and schedule information.",
      "Please let me know how I can help with your tasks, calendar, or organizational needs."
    ],
    default: [
      "I'm here to help you stay organized! 😺 Ask me for a summary, or about your tasks, calendar, notes, and more!",
      "How can I help you today? I can show you summaries, tasks, events, and provide productivity insights!"
    ]
  };
  
  const responses = defaultResponses[floCatStyle] || defaultResponses.default;
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return `${randomResponse}

${personality.sign}`;
}

// Enhanced intelligent summary with prioritization insights
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
  conversationHistory: any[]
): string {
  const now = new Date();
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

  // Analyze calendar events
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate >= today && eventDate < tomorrow;
  });

  const tomorrowEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate >= tomorrow && eventDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
  });

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.start?.dateTime || event.start?.date);
    return eventDate >= today && eventDate <= endOfWeek;
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

${priorityInsights.length > 0 ? priorityInsights.join('\n\n') + '\n\n' : ''}

### 📅 **Today's Schedule** (${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''})
${todayEvents.length > 0 ? 
  todayEvents.slice(0, 5).map(event => {
    const time = new Date(event.start?.dateTime || event.start?.date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const isWork = workEvents.includes(event);
    return `- ${time} **${event.summary}** ${isWork ? '💼' : '👤'}`;
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

${recommendations.length > 0 ? `### 💡 **Smart Recommendations**
${recommendations.join('\n\n')}

` : ''}

### 🎯 **Habit Progress** (${completedTodayHabits.length}/${todayHabits.length} completed)
${todayHabits.length > 0 ? 
  todayHabits.slice(0, 3).map(habit => {
    const isCompleted = completedTodayHabits.some(completion => completion.habitId === habit.id);
    return `- ${habit.name} ${isCompleted ? '✅' : '⭕'}`;
  }).join('\n')
  : '- No habits tracked for today'
}

### 📈 **Tomorrow's Preview** (${tomorrowEvents.length} event${tomorrowEvents.length !== 1 ? 's' : ''})
${tomorrowEvents.length > 0 ? 
  tomorrowEvents.slice(0, 3).map(event => {
    const time = new Date(event.start?.dateTime || event.start?.date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
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
