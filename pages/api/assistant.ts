// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";

type ChatRequest  = { history: { role: string; content: string }[]; prompt: string };
type ChatResponse = { reply?: string; error?: string };

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
  const email       = token.email as string;
  const accessToken = token.accessToken as string;

  // ── 2) Validate input ────────────────────────────────────────────────
  const { history, prompt } = req.body as ChatRequest;
  if (!Array.isArray(history) || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // ── 3) Call your AI service (for example) ───────────────────────────
    // e.g. const aiReply = await callOpenAI(history, prompt, accessToken)
    const aiReply = `Echo: ${prompt}`;  

    return res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
