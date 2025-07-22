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

// Types
type ChatRequest = {
  history?: { role: string; content: string }[];
  prompt?: string;
  message?: string; // Added for direct message support
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
  const { history = [], prompt, message } = req.body as ChatRequest;

  // Use either prompt or message, with message taking precedence
  const userInput = message || prompt || "";

  if (!Array.isArray(history) || typeof userInput !== "string" || !userInput) {
    return res.status(400).json({ error: "Invalid request body - missing message/prompt or invalid history" });
  }

  const lowerPrompt = userInput.toLowerCase();

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

  // ── Add Task Detection ─────────────────────────────
  const taskMatch = userInput.match(/(?:add|new) task(?: called)? (.+?)(?: due ([\w\s]+))?$/i);
  if (taskMatch && taskMatch[1]) {
    const taskText = taskMatch[1].trim();
    const duePhrase = taskMatch[2]?.trim().toLowerCase();
    const dueDate = duePhrase ? parseDueDate(duePhrase) : undefined;

    const payload: any = { text: taskText };
    if (dueDate) payload.dueDate = dueDate;

    const success = await callInternalApi("/api/tasks", "POST", payload, req);
    if (success) {
      return res.status(200).json({
        reply: `✅ Task "${taskText}" added${dueDate ? ` (due ${duePhrase})` : ""}.`,
      });
    } else {
      return res.status(500).json({ error: "Sorry, I couldn't add the task. There was an internal error." });
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
    // Fetch all data in parallel
    const [notes, meetings, conversations] = await Promise.all([
      fetchUserNotes(email).catch(() => []),
      fetchUserMeetingNotes(email).catch(() => []),
      fetchUserConversations(email).catch(() => [])
    ]);
    
    // Fetch user settings to get FloCat style preference
    const userSettingsData = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, email),
      columns: {
        floCatStyle: true,
        floCatPersonality: true,
        preferredName: true,
      },
    });
    const floCatStyle = userSettingsData?.floCatStyle || "default";
    const floCatPersonality = userSettingsData?.floCatPersonality || [];
    const preferredName = userSettingsData?.preferredName || "";

    // If no OpenAI API key, use local AI
    if (!openai) {
      console.log("Using local AI (no OpenAI API key found)");
      return res.status(200).json({ 
        reply: generateLocalResponse(userInput, floCatStyle, preferredName, notes, meetings) 
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
          reply: generateLocalResponse(userInput, floCatStyle, preferredName, notes, meetings) 
        });
      }

      return res.status(200).json({ reply: aiReply });
    } catch (err: any) {
      console.error("OpenAI API error, falling back to local AI:", err.message);
      return res.status(200).json({ 
        reply: generateLocalResponse(userInput, floCatStyle, preferredName, notes, meetings) 
      });
    }
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
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
    return `# ${timeGreeting}, ${userName}! ${personality.emoji}

## Your Day at a Glance

I'm gathering information from all your connected services to give you a comprehensive overview. Here's what I can help you with:

- **📋 Tasks**: Your todo items and project progress
- **📅 Calendar**: Upcoming events and meetings
- **📝 Notes**: Your saved thoughts and important information
- **🎯 Habits**: Daily habit tracking and streaks
- **📊 Analytics**: Productivity insights and trends

${notes.length > 0 ? `You have **${notes.length}** notes saved.` : ''}
${meetings.length > 0 ? `You have **${meetings.length}** meeting records.` : ''}

Ask me about any specific area, or say "help" to see all my capabilities!

${floCatStyle === "more_catty" ? "Have a purr-fect day! 🐾" : floCatStyle === "professional" ? "Have a productive day." : "Have a great day!"}

${personality.sign}`;
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
    const motivationalMessages = {
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
  const defaultResponses = {
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
