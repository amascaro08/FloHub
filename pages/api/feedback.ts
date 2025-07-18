import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { feedback, backlog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate via JWT for all requests
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.email;

  // Handle different HTTP methods
  if (req.method === "GET") {
    // Get feedback or backlog items
    const { type } = req.query;
    
    try {
      if (type === "backlog") {
        // Retrieve backlog items
        const backlogItems = await db.select().from(backlog).orderBy(desc(backlog.createdAt));
        return res.status(200).json(backlogItems.map(item => ({
          ...item,
          id: String(item.id),
          createdAt: new Date(item.createdAt!).getTime()
        })));
      } else {
        // Retrieve feedback items
        const feedbackItems = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
        return res.status(200).json(feedbackItems.map(item => ({
          ...item,
          id: String(item.id),
          createdAt: new Date(item.createdAt!).getTime()
        })));
      }
    } catch (err: any) {
      console.error("Get feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "POST" && req.query.type === "backlog") {
    // Add item directly to backlog
    const { text } = req.body;
    
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Backlog text is required" });
    }
    
    try {
      const [newBacklogItem] = await db.insert(backlog).values({ text, userId, createdAt: new Date() }).returning();
      
      return res.status(201).json({
        success: true,
        backlogId: newBacklogItem.id
      });
    } catch (err: any) {
      console.error("Create backlog error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "POST") {
    // Create new feedback
    const { feedbackType, feedbackText } = req.body;
    if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
      return res.status(400).json({ error: "Feedback text is required" });
    }

    try {
      const [newFeedbackItem] = await db.insert(feedback).values({ userId, feedbackType: feedbackType || "general", feedbackText, status: "open", createdAt: new Date() }).returning();
      const feedbackId = newFeedbackItem.id;

      return res.status(201).json({ success: true, feedbackId });
    } catch (err: any) {
      console.error("Create feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "PUT" || req.method === "PATCH") {
    // Update feedback status
    const { id, status, notes } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Feedback ID is required" });
    }
    
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    try {
      const [existingFeedback] = await db.select().from(feedback).where(eq(feedback.id, id));
      
      if (!existingFeedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      await db.update(feedback).set({ status, notes }).where(eq(feedback.id, id));
      
      // If status is "backlog", add to backlog collection
      if (status === "backlog") {
        await db.insert(backlog).values({ originalId: id, text: existingFeedback.feedbackText, createdAt: new Date(), userId });
      }
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Update feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}