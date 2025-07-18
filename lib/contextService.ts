import { db } from "./drizzle";
import { notes as notesTable, conversations as conversationsTable } from "../db/schema";
import { eq, and, or, isNotNull, desc } from "drizzle-orm";
import type { Note } from "../types/app";
import type { CalendarEvent } from "../types/calendar";
type ConversationMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: any;
};

type Conversation = {
  id?: string;
  userId: string;
  messages: ConversationMessage[];
  createdAt: any;
};

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const rows = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.user_email, userId))
    .orderBy(desc(notesTable.createdAt));

  const notes: Note[] = rows.map((row) => ({
    id: String(row.id),
    title: row.title || "",
    content: row.content,
    tags: row.tags || [],
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
    source: row.source || undefined,
    eventId: row.eventId || undefined,
    eventTitle: row.eventTitle || undefined,
    isAdhoc: row.isAdhoc || false,
    actions: (row.actions as any) || undefined,
    agenda: row.agenda || undefined,
    aiSummary: row.aiSummary || undefined,
  }));
  return notes;
}

export async function fetchUserMeetingNotes(userId: string): Promise<Note[]> {
  const rows = await db
    .select()
    .from(notesTable)
    .where(
      and(
        eq(notesTable.user_email, userId),
        or(isNotNull(notesTable.eventId), eq(notesTable.isAdhoc, true))
      )
    )
    .orderBy(desc(notesTable.createdAt));

  const meetingNotes: Note[] = rows.map((row) => ({
    id: String(row.id),
    title: row.title || "",
    content: row.content,
    tags: row.tags || [],
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
    source: row.source || undefined,
    eventId: row.eventId || undefined,
    eventTitle: row.eventTitle || undefined,
    isAdhoc: row.isAdhoc || false,
    actions: (row.actions as any) || undefined,
    agenda: row.agenda || undefined,
    aiSummary: row.aiSummary || undefined,
  }));
  return meetingNotes;
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .orderBy(desc(conversationsTable.createdAt));

  const conversations: Conversation[] = rows.map((row) => ({
    id: String(row.id),
    userId: row.userId,
    messages: (row.messages as any) || [],
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : "",
  }));
  return conversations;
}