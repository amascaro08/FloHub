// pages/api/tasks.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { tasks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

type Task = {
  id:        string;
  text:      string;
  done:      boolean;
  dueDate:   string | null;
  createdAt: string | null;
  source?:   "personal" | "work"; // Add source tag
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Task[] | Task | { id: string; done?: boolean; source?: string } | { error: string }>
) {
  // Handle CORS for production
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://flohub.xyz',
    'https://www.flohub.xyz',
    'https://flohub.vercel.app'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ── 1) Authenticate via JWT
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const email = user.email;


  try {
    // ── GET: list tasks ──────────────────────────────────────────
    if (req.method === "GET") {
      const rows = await db.select().from(tasks).where(eq(tasks.user_email, email)).orderBy(desc(tasks.createdAt));
      const tasksData: Task[] = rows.map((row) => ({
        id: String(row.id),
        text: row.text,
        done: row.done!,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        source: row.source as "personal" | "work" | undefined,
      }));
      return res.status(200).json(tasksData);
    }

    // ── POST: create new task ────────────────────────────────────
    if (req.method === "POST") {
      const { text, dueDate, source } = req.body as { text: string; dueDate?: string; source?: "personal" | "work" };
      if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Invalid text" });
      }
      const due = dueDate ? new Date(dueDate) : null;
      const newTaskData: any = {
        text:      text.trim(),
        done:      false,
        dueDate:   due,
        createdAt: new Date().toISOString(), // PostgreSQL will handle server timestamp
      };
      if (source) {
        newTaskData.source = source;
      }
      const [newTask] = await db.insert(tasks).values({
        user_email: email,
        text: text.trim(),
        done: false,
        dueDate: due,
        source,
      }).returning();
      const task: Task = {
        id: String(newTask.id),
        text: newTask.text,
        done: newTask.done!,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        createdAt: newTask.createdAt ? new Date(newTask.createdAt).toISOString() : null,
        source: newTask.source as "personal" | "work" | undefined,
      };
      return res.status(201).json(task);
    }

    // ── PUT/PATCH: update task fields ───────────────────────────────────────
    if (req.method === "PATCH" || req.method === "PUT") {
      const { id, done, source, dueDate } = req.body as { 
        id: string; 
        done?: boolean; 
        source?: "personal" | "work";
        dueDate?: string;
      };
      if (!id || (typeof done === "undefined" && typeof source === "undefined" && typeof dueDate === "undefined")) {
        return res.status(400).json({ error: "Invalid payload - must provide id and at least one field to update" });
      }
      const updateData: any = {};
      if (typeof done !== "undefined") {
        updateData.done = done;
      }
      if (typeof source !== "undefined") {
        updateData.source = source;
      }
      if (typeof dueDate !== "undefined") {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(tasks).set(updateData).where(eq(tasks.id, Number(id)));
      }
      return res.status(200).json({ id, ...updateData });
    }

    // ── DELETE: remove a task ─────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body as { id: string };
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      await db.delete(tasks).where(eq(tasks.id, Number(id)));
      return res.status(204).end();
    }

    // ── 405 for other methods
    res.setHeader("Allow", ["GET", "POST", "PATCH", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("Error in /api/tasks:", err);
    return res.status(500).json({ error: err.message });
  }
}
