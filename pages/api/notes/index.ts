import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { notes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
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
  const userId = user.email;

  try {
    // 2) Fetch notes for the authenticated user from the database
    const notesData = await db.select().from(notes).where(eq(notes.userEmail, userId)).orderBy(desc(notes.createdAt));

    const notesResult: Note[] = notesData.map((row) => ({
      id: String(row.id),
      title: row.title || "",
      content: row.content,
      tags: (row.tags as string[]) || [],
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
      source: row.source || undefined,
      eventId: row.eventId || undefined,
      eventTitle: row.eventTitle || undefined,
      isAdhoc: row.isAdhoc || false,
      actions: (row.actions as any) || undefined,
      agenda: row.agenda || undefined,
      aiSummary: row.aiSummary || undefined,
    }));

    return res.status(200).json({ notes: notesResult });

  } catch (err: any) {
    console.error("Fetch notes error:", err);
    // Log the full error object for detailed debugging
    console.error("Fetch notes error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}