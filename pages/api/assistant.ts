// pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";
import { fetchUserNotes, fetchUserMeetingNotes, fetchUserConversations, findRelevantContextSemantic as findRelevantContext } from "../../lib/context";

type ChatRequest = { history: { role: string; content: string }[]; prompt: string };
type ChatResponse = { reply?: string; error?: string };

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  console.log("Assistant handler called");
  console.log("Request method:", req.method);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // ── 1) Authenticate via JWT ───────────────────────────────────────────
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email || !token.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const email = token.email as string;
  const accessToken = token.accessToken as string;

  // ── 2) Validate input ────────────────────────────────────────────────
  const { history, prompt } = req.body as ChatRequest;
  if (!Array.isArray(history) || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // Fetch user context data
    const notes = await fetchUserNotes(email);
    const meetings = await fetchUserMeetingNotes(email);
    const conversations = await fetchUserConversations(email);

    // Find relevant context based on prompt
    const relevantContext = await findRelevantContext(prompt, notes, meetings, conversations);

    // Compose messages with relevant context included as system message
    const messages: any[] = [
      {
        role: "system",
        content: "You are FloCat, a friendly, slightly quirky AI assistant. You provide a daily 'At A Glance' summary for the user, welcoming them to their day, summarizing their schedule, suggesting a task focus (preferably an incomplete one), and using emojis. You also identify as a cat",
      },
      {
        role: "system",
        content: `Here is some relevant context from the user's notes, meetings, and past conversations:\n${relevantContext}`,
      },
      ...history, // Include previous history if any
      {
        role: "user",
        content: prompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
    });

    const aiReply = completion.choices[0]?.message?.content;

    if (!aiReply) {
      return res.status(500).json({ error: "OpenAI did not return a message." });
    }

    // After getting AI reply, check for commands to add task or calendar event
    // Simple regex-based detection for demonstration; can be improved with NLP parsing
    const lowerPrompt = prompt.toLowerCase();

    // Helper function to call internal API
    const callInternalApi = async (path: string, method: string, body: any) => {
      const url = `${process.env.NEXTAUTH_URL || ""}${path}`;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return response.ok;
    }

    console.log("lowerPrompt:", lowerPrompt);
    // Detect add task command
    console.log("Checking for add task command...");
    console.log("lowerPrompt before regex:", lowerPrompt);
    if (lowerPrompt.includes("add task") || lowerPrompt.includes("new task")) {
      console.log("Add task command detected.");
      // Extract task text from prompt (more robust regex)
      const taskMatch = lowerPrompt.match(/(?:add|new) task(?: called)? (.*?)(?: due)? (.*)?/i);
      console.log("Task regex match:", taskMatch);
      if (taskMatch && taskMatch[1]) {
        const taskText = taskMatch[1].trim();
        if (taskText) {
          console.log("Task text:", taskText);
          await callInternalApi("/api/tasks", "POST", { text: taskText });
          return res.status(200).json({ reply: `Task "${taskText}" added.` });
        }
      }
    }

    // Detect add calendar event command
    if (lowerPrompt.includes("add event") || lowerPrompt.includes("new event") || lowerPrompt.includes("schedule event")) {
      // Extract event summary and dummy start/end for demo
      const eventMatch = prompt.match(/(?:add|new|schedule) event (.+)/i);
      if (eventMatch && eventMatch[1]) {
        const summary = eventMatch[1].trim();
        if (summary) {
          const now = new Date();
          const start = now.toISOString();
          const end = new Date(now.getTime() + 3600000).toISOString(); // 1 hour later
          await callInternalApi("/api/calendar", "POST", { summary, start, end });
          return res.status(200).json({ reply: `Event "${summary}" scheduled.` });
        }
      }
    }

    return res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
