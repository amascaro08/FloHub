// pages/api/meetings/context.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes, tasks } from "@/db/schema";
import { and, eq, or, isNotNull, desc } from "drizzle-orm";
import type { Note } from "@/types/app";

export type GetMeetingContextResponse = {
  recentMeetings?: Note[];
  actionItems?: any[];
  upcomingEvents?: any[];
  summaries?: string[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMeetingContextResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate via JWT
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
    // Fetch recent meeting notes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMeetingNotesRows = await db
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.user_email, userId),
          or(isNotNull(notes.eventId), eq(notes.isAdhoc, true))
        )
      )
      .orderBy(desc(notes.createdAt))
      .limit(10);

    const recentMeetings: Note[] = recentMeetingNotesRows.map((row) => ({
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

    // Fetch action items from work tasks that originated from meetings
    const actionItemsRows = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.user_email, userId),
          eq(tasks.source, "work"),
          eq(tasks.done, false)
        )
      )
      .orderBy(desc(tasks.createdAt))
      .limit(20);

    const actionItems = actionItemsRows.map((row) => ({
      id: String(row.id),
      text: row.text,
      done: row.done,
      dueDate: row.dueDate?.toISOString() || null,
      createdAt: row.createdAt?.toISOString() || null,
      source: row.source,
      tags: (row.tags as string[]) || [],
    }));

    // Collect AI summaries for context
    const summaries = recentMeetings
      .filter(meeting => meeting.aiSummary)
      .map(meeting => meeting.aiSummary!)
      .slice(0, 5);

    // TODO: Fetch upcoming events from calendar API if needed
    const upcomingEvents: any[] = [];

    return res.status(200).json({
      recentMeetings,
      actionItems,
      upcomingEvents,
      summaries,
    });

  } catch (err: any) {
    console.error("Fetch meeting context error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}