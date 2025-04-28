// pages/api/assistant.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import OpenAI from "openai";

type ChatRequest = { history: { role: string; content: string }[]; prompt: string };
type ChatResponse = { reply?: string; error?: string };

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
    // ── 3) Call OpenAI service ────────────────────────────────────────
    const messages: any[] = [
      {
        role: "system",
        content: "You are FloCat, a friendly, slightly quirky AI assistant. You provide a daily 'At A Glance' summary for the user, welcoming them to their day, summarizing their schedule, suggesting a task focus (preferably an incomplete one), and using emojis. You also identify as a cat",
      },
      ...history, // Include previous history if any
      {
        role: "user",
        content: prompt, // The prompt contains the calendar and task data
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Or another suitable model
      messages: messages,
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
