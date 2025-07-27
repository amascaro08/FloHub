import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";

type CreateNoteRequest = {
  title?: string; // Add optional title field
  content: string;
  tags?: string[]; // Optional array of tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
};

type CreateNoteResponse = {
  success?: boolean;
  error?: string;
  noteId?: string; // Optional ID of the created note
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateNoteResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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
  const { title, content, tags, eventId, eventTitle, isAdhoc } = req.body as CreateNoteRequest; // Include new fields
  if (typeof content !== "string") {
    return res.status(400).json({ error: "Note content must be a string" });
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc if needed


  try {
    // 3) Save the note to the database
    const [newNote] = await db.insert(notes).values({
      user_email: userId,
      title: title ?? "",
      content,
      tags: tags ?? [],
      eventId: eventId ?? null,
      eventTitle: eventTitle ?? null,
      isAdhoc: isAdhoc ?? false,
    }).returning();
    return res.status(201).json({ success: true, noteId: String(newNote.id) });

  } catch (err: any) {
    console.error("Create note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}