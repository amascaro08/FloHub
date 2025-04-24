// pages/api/assistant.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }                   from "next-auth/next";
import type { Session }                       from "next-auth";
import { authOptions }                        from "./auth/[...nextauth]";

type ChatRequest = {
  history: { role: string; content: string }[];
  prompt: string;
};

type ChatResponse = { reply?: string; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Cast getServerSession to the NextAuth Session type
  const session = (await getServerSession(
    req,
    res,
    authOptions
  )) as Session | null;

  if (!session?.user?.email || !session.user.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const { history, prompt } = req.body as ChatRequest;
  if (!Array.isArray(history) || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    // TODO: call your AI service here, passing session.user.accessToken if needed
    const aiReply = `Echo: ${prompt}`;
    return res.status(200).json({ reply: aiReply });
  } catch (err: any) {
    console.error("Assistant error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
