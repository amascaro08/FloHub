// pages/api/meetings/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";
import { and, eq, or, isNotNull, desc } from "drizzle-orm";
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
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.email;

  try {
    // 2) Fetch meeting notes for the authenticated user from the database
    const meetingNotesRows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userEmail, userId), or(isNotNull(notes.eventId), eq(notes.isAdhoc, true))))
      .orderBy(desc(notes.createdAt));

    const meetingNotes: Note[] = meetingNotesRows.map((row) => ({
      id: String(row.id),
      title: row.title || "",
      content: row.content,
      tags: (row.tags as string[]) || [],
      createdAt: new Date(row.createdAt!).toISOString(),
      eventId: row.eventId || undefined,
      eventTitle: row.eventTitle || undefined,
      isAdhoc: row.isAdhoc || undefined,
      actions: (row.actions as any) || [],
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