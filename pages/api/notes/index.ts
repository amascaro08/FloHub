import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { notes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}
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
    // 2) Fetch notes for the authenticated user from the database
    const notesData = await db.select().from(notes).where(eq(notes.user_email, userId)).orderBy(desc(notes.createdAt));

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