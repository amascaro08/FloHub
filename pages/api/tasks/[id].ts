import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

type Task = {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  createdAt: string | null;
  source?: "personal" | "work";
  tags?: string[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Task | { id: string; done?: boolean; source?: string } | { error: string }>
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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: "Invalid task ID" });
  }

  try {
    // ── PUT: update task ──────────────────────────────────────────
    if (req.method === "PUT") {
      const { text, dueDate, source, tags } = req.body as { 
        text?: string; 
        dueDate?: string; 
        source?: "personal" | "work"; 
        tags?: string[];
      };
      
      const updateData: any = {};
      if (text !== undefined) updateData.text = text.trim();
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (source !== undefined) updateData.source = source;
      if (tags !== undefined) updateData.tags = tags;

      const [updatedTask] = await db.update(tasks)
        .set(updateData)
        .where(eq(tasks.id, Number(id)))
        .returning();

      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      const task: Task = {
        id: String(updatedTask.id),
        text: updatedTask.text,
        done: updatedTask.done!,
        dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString() : null,
        createdAt: updatedTask.createdAt ? new Date(updatedTask.createdAt).toISOString() : null,
        source: updatedTask.source as "personal" | "work" | undefined,
        tags: updatedTask.tags as string[] | undefined,
      };
      return res.status(200).json(task);
    }

    // ── DELETE: remove a task ─────────────────────────────────────
    if (req.method === "DELETE") {
      await db.delete(tasks).where(eq(tasks.id, Number(id)));
      return res.status(204).end();
    }

    // ── 405 for other methods
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("Error in /api/tasks/[id]:", err);
    return res.status(500).json({ error: err.message });
  }
}