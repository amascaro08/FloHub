import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "@/lib/neon";
import type { Note, Task } from "@/types/app";

export type SearchByTagResponse = {
  items?: (Note | Task)[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchByTagResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email as string;

  const { tag } = req.query;

  if (typeof tag !== "string" || !tag) {
    return res.status(400).json({ error: "Missing or invalid tag parameter" });
  }

  try {
    const items: (Note | Task)[] = [];

    // 1. Fetch Notes and Meeting Notes by tag
    // 1. Fetch Notes and Meeting Notes by tag
    const { rows: notesRows } = await query(
      `SELECT id, title, content, tags, "createdAt", source, "eventId", "eventTitle", "isAdhoc", actions FROM notes WHERE "userId" = $1 AND tags @> ARRAY[$2]::text[]`,
      [userId, tag]
    );
    notesRows.forEach((row) => {
      items.push({
        id: row.id,
        title: row.title || "",
        content: row.content,
        tags: row.tags || [],
        createdAt: new Date(Number(row.createdAt)).toISOString(),
        source: row.source || "notespage", // Default source for notes
        eventId: row.eventId || undefined,
        eventTitle: row.eventTitle || undefined,
        isAdhoc: row.isAdhoc || undefined,
        actions: row.actions || [],
      } as Note);
    });

    // 2. Fetch Tasks by tag
    const { rows: tasksRows } = await query(
      `SELECT id, text, done, "dueDate", "createdAt", source, tags FROM tasks WHERE "userId" = $1 AND tags @> ARRAY[$2]::text[]`,
      [userId, tag]
    );
    tasksRows.forEach((row) => {
      items.push({
        id: row.id,
        text: row.text as string,
        done: row.done as boolean,
        dueDate: row.dueDate ? new Date(Number(row.dueDate)).toISOString() : null,
        createdAt: row.createdAt ? new Date(Number(row.createdAt)).toISOString() : null,
        source: row.source as Task['source'] | undefined,
        tags: row.tags || [],
      } as Task);
    });

    // Sort items by creation date (most recent first) - approximate sorting across types
    items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());


    return res.status(200).json({ items });

  } catch (err: any) {
    console.error("Search by tag error:", err);
    console.error("Search by tag error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}