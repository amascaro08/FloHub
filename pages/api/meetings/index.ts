// pages/api/meetings/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../../lib/neon";
import type { Note } from "@/types/app"; // Import shared Note type

export type GetMeetingNotesResponse = { // Export the type
  meetingNotes?: Note[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMeetingNotesResponse>
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
  const userId = user.id;

  try {
    // 2) Fetch meeting notes for the authenticated user from the database
    // We need to use a different approach since Firestore has limitations with OR queries
    // First, get all notes for the user
    const { rows: meetingNotesRows } = await query(
      `SELECT id, title, content, tags, "createdAt", "eventId", "eventTitle", "isAdhoc", actions, agenda, "aiSummary"
       FROM notes
       WHERE "userId" = $1 AND ("eventId" IS NOT NULL OR "isAdhoc" = TRUE)
       ORDER BY "createdAt" DESC`,
      [userId]
    );

    const meetingNotes: Note[] = meetingNotesRows.map((row) => ({
      id: row.id,
      title: row.title || "",
      content: row.content,
      tags: row.tags || [],
      createdAt: new Date(Number(row.createdAt)).toISOString(),
      eventId: row.eventId || undefined,
      eventTitle: row.eventTitle || undefined,
      isAdhoc: row.isAdhoc || undefined,
      actions: row.actions || [],
      agenda: row.agenda || undefined,
      aiSummary: row.aiSummary || undefined,
    }));

    return res.status(200).json({ meetingNotes: meetingNotes });

  } catch (err: any) {
    console.error("Fetch meeting notes error:", err);
    console.error("Fetch meeting notes error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}