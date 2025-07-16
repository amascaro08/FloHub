import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../../lib/neon";

type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
};

type Conversation = {
  id?: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: number;
};

type GetConversationsResponse = {
  conversations?: Conversation[];
  error?: string;
};

type SaveConversationRequest = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetConversationsResponse>) {
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email as string;

  if (req.method === "GET") {
    try {
      const { rows } = await query(
        `SELECT id, "userId", messages, "createdAt" FROM conversations WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
        [userId]
      );
      const conversations: Conversation[] = rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        messages: row.messages, // Assuming messages are stored as JSONB
        createdAt: Number(row.createdAt),
      }));
      return res.status(200).json({ conversations });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
  } else if (req.method === "POST") {
    const { messages } = req.body as SaveConversationRequest;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }
    try {
      const now = Date.now();
      const newConversation = {
        userId,
        messages: messages.map((m) => ({ ...m, timestamp: now })),
        createdAt: now,
      };
      const { rows } = await query(
        `INSERT INTO conversations ("userId", messages, "createdAt") VALUES ($1, $2, $3) RETURNING id`,
        [newConversation.userId, JSON.stringify(newConversation.messages), newConversation.createdAt]
      );
      const createdConversation = { id: rows[0].id, ...newConversation };
      return res.status(201).json({ conversations: [createdConversation] });
    } catch (error) {
      console.error("Error saving conversation:", error);
      return res.status(500).json({ error: "Failed to save conversation" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}