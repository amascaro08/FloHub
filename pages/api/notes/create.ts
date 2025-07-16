import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
// Assuming Firebase will be used for data storage
import { query } from "../../../lib/neon";

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
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email as string; // Using email as a simple user identifier

  // 2) Validate input
  const { title, content, tags, eventId, eventTitle, isAdhoc } = req.body as CreateNoteRequest; // Include new fields
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Note content is required" });
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc if needed


  try {
    // 3) Save the note to the database
    const { rows } = await query(
      `INSERT INTO notes (user_email, title, content, tags, created_at, event_id, event_title, is_adhoc)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7) RETURNING id`,
      [
        userId,
        title ?? "",
        content,
        tags ?? [],
        eventId ?? null,
        eventTitle ?? null,
        isAdhoc ?? false,
      ]
    );
    return res.status(201).json({ success: true, noteId: rows[0].id });

  } catch (err: any) {
    console.error("Create note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}