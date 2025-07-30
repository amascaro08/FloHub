import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { prepareContentForStorage } from "@/lib/contentSecurity";

type UpdateNoteRequest = {
  id: string;
  title?: string; // Allow updating title
  content?: string; // Allow updating content
  tags?: string[]; // Allow updating tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
  source?: string; // Optional: Source of the note (e.g., "quicknote", "notespage")
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
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.email;

  // 2) Validate input
  const { id, title, content, tags, eventId, eventTitle, isAdhoc, source } = req.body as UpdateNoteRequest; // Include new fields
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Note ID is required" });
  }

  // Ensure at least one update field is provided
  if (title === undefined && content === undefined && tags === undefined && eventId === undefined && eventTitle === undefined && isAdhoc === undefined && source === undefined) {
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
    const [existingNote] = await db.select().from(notes).where(eq(notes.id, Number(id)));

    if (!existingNote) {
      return res.status(404).json({ error: "Note not found" });
    }

    if (existingNote.user_email !== userId) {
      return res.status(403).json({ error: "Unauthorized to update this note" });
    }

    // 4) Prepare update data with encryption
    const updateData: any = {};
    if (title !== undefined) {
        updateData.title = title ? prepareContentForStorage(title) : "";
    }
    if (content !== undefined) {
        updateData.content = prepareContentForStorage(content);
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
    if (source !== undefined) { // Allow setting source
        updateData.source = source;
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the note in the database
    await db.update(notes).set(updateData).where(eq(notes.id, Number(id)));

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("Update note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}