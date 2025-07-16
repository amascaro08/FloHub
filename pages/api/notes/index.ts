import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../../lib/neon";

import type { Note } from "@/types/app"; // Import shared Note type

export type GetNotesResponse = { // Export the type
  notes?: Note[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetNotesResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Authenticate via JWT
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email as string; // Using email as a simple user identifier

  try {
    // 2) Fetch notes for the authenticated user from the database
    // This is a placeholder. You will need to implement the actual database logic here.

    const { rows } = await query(
      'SELECT id, title, content, tags, created_at AS "createdAt", source, event_id AS "eventId", event_title AS "eventTitle", is_adhoc AS "isAdhoc", actions, agenda, ai_summary AS "aiSummary" FROM notes WHERE user_email = $1 ORDER BY created_at DESC',
      [userId]
    );

    const notes: Note[] = rows.map((row) => ({
      id: row.id,
      title: row.title || "",
      content: row.content,
      tags: row.tags || [],
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
      source: row.source || undefined,
      eventId: row.eventId || undefined,
      eventTitle: row.eventTitle || undefined,
      isAdhoc: row.isAdhoc || false,
      actions: row.actions || undefined,
      agenda: row.agenda || undefined,
      aiSummary: row.aiSummary || undefined,
    }));

    return res.status(200).json({ notes: notes });

  } catch (err: any) {
    console.error("Fetch notes error:", err);
    // Log the full error object for detailed debugging
    console.error("Fetch notes error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}