import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { conversations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

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
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.id;

  if (req.method === "GET") {
    try {
      const rows = await db.select().from(conversations).where(eq(conversations.userId, String(userId))).orderBy(desc(conversations.createdAt));
      const conversationsData: Conversation[] = rows.map((row) => ({
        id: String(row.id),
        userId: row.userId,
        messages: (row.messages as any) || [],
        createdAt: new Date(row.createdAt!).getTime(),
      }));
      return res.status(200).json({ conversations: conversationsData });
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
      const now = new Date();
      const newConversation = {
        userId: String(userId),
        messages: messages.map((m) => ({ ...m, timestamp: now.getTime() })),
        createdAt: now,
      };
      const [createdConversation] = await db.insert(conversations).values(newConversation).returning();
      const conversationData = { ...createdConversation, id: String(createdConversation.id), userId: String(createdConversation.userId), messages: (createdConversation.messages as any) || [], createdAt: new Date(createdConversation.createdAt!).getTime() };
      return res.status(201).json({ conversations: [conversationData] });
    } catch (error) {
      console.error("Error saving conversation:", error);
      return res.status(500).json({ error: "Failed to save conversation" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}