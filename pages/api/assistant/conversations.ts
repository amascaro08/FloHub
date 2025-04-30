import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase";
import { collection, query, where, orderBy, getDocs, addDoc, Timestamp } from "firebase/firestore";

type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: Timestamp;
};

type Conversation = {
  id?: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: Timestamp;
};

type GetConversationsResponse = {
  conversations?: Conversation[];
  error?: string;
};

type SaveConversationRequest = {
  messages: { role: string; content: string }[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<GetConversationsResponse>) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token.email as string;

  if (req.method === "GET") {
    try {
      const conversationsRef = collection(db, "conversations");
      const q = query(conversationsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const conversations: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          userId: data.userId,
          messages: data.messages,
          createdAt: data.createdAt,
        });
      });
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
      const conversationsRef = collection(db, "conversations");
      const newConversation = {
        userId,
        messages: messages.map((m) => ({ ...m, timestamp: Timestamp.now() })),
        createdAt: Timestamp.now(),
      };
      await addDoc(conversationsRef, newConversation);
      return res.status(201).json({ conversations: [newConversation] });
    } catch (error) {
      console.error("Error saving conversation:", error);
      return res.status(500).json({ error: "Failed to save conversation" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}