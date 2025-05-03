// pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";
import {
  fetchUserNotes,
  fetchUserMeetingNotes,
  fetchUserConversations,
  findRelevantContextSemantic as findRelevantContext,
} from "../../lib/context";
import { ChatCompletionMessageParam } from "openai/resources";

type ChatRequest = {
  history: { role: string; content: string }[];
  prompt: string;
};

type ChatResponse = {
  reply?: string;
  error?: string;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.email || !token.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const email = token.email as string;
  const { history, prompt } = req.body as ChatRequest;

  if (!Array.isArray(history) || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const lowerPrompt = prompt.toLowerCase();

  // ── Internal API call helper ──────────────────────────────
  const callInternalApi = async (path: string, method: string, body: any) => {
    const url = `${process.env.NEXTAUTH_URL || ""}${path}`;
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  };

  // ── Handle "add task" ─────────────────────────────────────
  if (lowerPrompt.includes("add task") || lowerPrompt.includes("new task")) {
    const taskMatch = prompt.match(/(?:add|new) task(?: called)? (.+?)(?: due|$)/i);
    if (taskMatch && taskMatch[1]) {
      const taskText = taskMatch[1].trim();
      if (taskText) {
        await callInternalApi("/api/tasks", "POST", { text: taskText });
        return res.status(200).json({ reply: `✅ Task "${taskText}" added to your list.` });
      }
    }
  }

  // ── Handle "add event" ────────────────────────────────────
  if (
    lowerPrompt.includes("add event") ||
    lowerPrompt.includes("new event") ||
    lowerPrompt.includes("schedule event")
  ) {
    const eventMatch = prompt.match(/(?:add|new|schedule) event (.+)/i);
    if (eventMatch && eventMatch[1]) {
      const summary = eventMatch[1].trim();
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime() + 3600000).toISOString(); // 1 hour later
      await callInternalApi("/api/calendar", "POST", { summary, start, end });
      return res.status(200).json({ reply: `📅 Event "${summary}" scheduled.` });
    }
  }

  // ── Fetch context and generate assistant response ─────────
  try {
    const notes = await fetchUserNotes(email);
    const meetings = await fetchUserMeetingNotes(email);
    const conversations = await fetchUserConversations(email);
    const relevantContext = await findRelevantContext(prompt, notes, meetings, conversations);

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are FloCat, a friendly, slightly quirky AI assistant. You provide a daily 'At A Glance' summary, help the user manage tasks and calendar, and you identify as a cat 😺.`,
      },
      {
        role: "system",
        content: `Here is some relevant context from the user's notes, meetings, and past conversations:\n${relevantContext}`,
      },
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
      {
        role: "user",
        content: prompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    const aiReply = completion.choices[0]?.message?.content;
    if (!aiReply) {
      return res.status(500).json({ error: "OpenAI did not return a message." });
    }

    return res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
