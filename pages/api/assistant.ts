// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { Session } from "next-auth";
import { authOptions }                        from "./auth/[...nextauth]";

type ChatMessage = { role: "assistant" | "user"; content: string };

type RequestBody = {
  history: ChatMessage[];
  prompt:  string;
};

type ResponseData =
  | { reply: string }
  | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // ─── Only allow POST ───────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // ─── 1) AUTH ───────────────────────────────────────────────
  const session: Session | null = await getServerSession(req, res, authOptions);
  if (!session?.user || !session?.user?.email || !session.user.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  // ─── 2) PAYLOAD VALIDATION ─────────────────────────────────
  const body = req.body as Partial<RequestBody>;
  if (
    !Array.isArray(body.history) ||
    typeof body.prompt !== "string"
  ) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  const history = body.history as ChatMessage[];
  const prompt  = body.prompt.trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt must not be empty" });
  }

  // ─── 3) BUILD MESSAGES FOR OPENAI ─────────────────────────
  const messages = history.map((m) => ({
    role:    m.role,
    content: m.content
  }));
  messages.push({ role: "user", content: prompt });

  // ─── 4) CALL OPENAI ────────────────────────────────────────
  try {
    const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens:  500,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      console.error("OpenAI API error:", errText);
      return res.status(502).json({ error: "OpenAI API error" });
    }

    const data = await openAiRes.json();
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      return res.status(500).json({ error: "No reply from OpenAI" });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Assistant handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
