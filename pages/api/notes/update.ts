import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../../lib/neon";

type UpdateNoteRequest = {
  id: string;
  title?: string; // Allow updating title
  content?: string; // Allow updating content
  tags?: string[]; // Allow updating tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
};

type UpdateNoteResponse = {
  success?: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateNoteResponse>
) {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.setHeader("Allow", "PUT, PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Authenticate via JWT
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email;

  // 2) Validate input
  const { id, title, content, tags, eventId, eventTitle, isAdhoc } = req.body as UpdateNoteRequest; // Include new fields
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Note ID is required" });
  }

  // Ensure at least one update field is provided
  if (title === undefined && content === undefined && tags === undefined && eventId === undefined && eventTitle === undefined && isAdhoc === undefined) {
      return res.status(400).json({ error: "No update fields provided" });
  }

  if (title !== undefined && typeof title !== "string") {
      return res.status(400).json({ error: "Invalid title format" });
  }

  if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ error: "Invalid content format" });
  }

  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc if needed


  try {
    // 3) Check if the note exists and belongs to the authenticated user
    const { rows: existingNotes } = await query('SELECT user_email FROM notes WHERE id = $1', [id]);

    if (existingNotes.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (existingNotes[0].user_email !== userId) {
      return res.status(403).json({ error: "Unauthorized to update this note" });
    }

    // 4) Prepare update data
    const updateData: any = {};
    if (title !== undefined) {
        updateData.title = title;
    }
    if (content !== undefined) {
        updateData.content = content;
    }
    if (tags !== undefined) {
        updateData.tags = tags;
    }
    if (eventId !== undefined) { // Allow setting eventId to null/undefined to disassociate
        updateData.eventId = eventId;
    }
    if (eventTitle !== undefined) { // Allow setting eventTitle to null/undefined
        updateData.eventTitle = eventTitle;
    }
    if (isAdhoc !== undefined) { // Allow setting isAdhoc to true or false
        updateData.isAdhoc = isAdhoc;
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the note in the database
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(content);
    }
    if (tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(tags);
    }
    if (eventId !== undefined) {
      updateFields.push(`event_id = $${paramIndex++}`);
      updateValues.push(eventId);
    }
    if (eventTitle !== undefined) {
      updateFields.push(`event_title = $${paramIndex++}`);
      updateValues.push(eventTitle);
    }
    if (isAdhoc !== undefined) {
      updateFields.push(`is_adhoc = $${paramIndex++}`);
      updateValues.push(isAdhoc);
    }

    if (updateFields.length > 0) {
      await query(
        `UPDATE notes SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_email = $${paramIndex++}`,
        [...updateValues, id, userId]
      );
    }

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("Update note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}