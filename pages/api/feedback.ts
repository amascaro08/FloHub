import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { query } from "@/lib/neon";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate via JWT for all requests
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token?.email as string;

  // Handle different HTTP methods
  if (req.method === "GET") {
    // Get feedback or backlog items
    const { type } = req.query;
    
    try {
      if (type === "backlog") {
        // Retrieve backlog items
        const { rows: backlogItems } = await query(
          `SELECT id, text, "userId", "createdAt" FROM backlog ORDER BY "createdAt" DESC`
        );
        return res.status(200).json(backlogItems.map(item => ({
          id: item.id,
          text: item.text,
          userId: item.userId,
          createdAt: Number(item.createdAt)
        })));
      } else {
        // Retrieve feedback items
        const { rows: feedbackItems } = await query(
          `SELECT id, "userId", "feedbackType", "feedbackText", status, "createdAt" FROM feedback ORDER BY "createdAt" DESC`
        );
        return res.status(200).json(feedbackItems.map(item => ({
          id: item.id,
          userId: item.userId,
          feedbackType: item.feedbackType,
          feedbackText: item.feedbackText,
          status: item.status,
          createdAt: Number(item.createdAt)
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
      const now = Date.now();
      const { rows } = await query(
        `INSERT INTO backlog (text, "userId", "createdAt") VALUES ($1, $2, $3) RETURNING id`,
        [text, userId, now]
      );
      
      return res.status(201).json({
        success: true,
        backlogId: rows[0].id
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
      const now = Date.now();
      const { rows } = await query(
        `INSERT INTO feedback ("userId", "feedbackType", "feedbackText", status, "createdAt") VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, feedbackType || "general", feedbackText, "open", now]
      );
      const feedbackId = rows[0].id;

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
      // Get existing feedback to check existence and retrieve data for backlog
      const { rows: existingFeedback } = await query(
        `SELECT "feedbackText" FROM feedback WHERE id = $1`,
        [id]
      );
      
      if (existingFeedback.length === 0) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      const updateFields: string[] = [];
      const updateParams: any[] = [];
      let paramIndex = 1;

      updateFields.push(`status = $${paramIndex++}`);
      updateParams.push(status);

      if (notes) {
        updateFields.push(`notes = $${paramIndex++}`);
        updateParams.push(notes);
      }
      
      updateParams.push(id); // Add ID for WHERE clause

      await query(
        `UPDATE feedback SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateParams
      );
      
      // If status is "backlog", add to backlog collection
      if (status === "backlog") {
        const feedbackData = existingFeedback[0];
        const now = Date.now();
        await query(
          `INSERT INTO backlog ("originalId", text, "createdAt", "userId") VALUES ($1, $2, $3, $4)`,
          [id, feedbackData.feedbackText, now, userId]
        );
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