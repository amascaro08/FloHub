// pages/api/tasks.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";
import { query } from "@/lib/neon";

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
  // ── 1) Authenticate via JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const email = token.email as string;


  try {
    // ── GET: list tasks ──────────────────────────────────────────
    if (req.method === "GET") {
      const { rows } = await query(
        'SELECT id, text, done, due_date AS "dueDate", created_at AS "createdAt", source FROM tasks WHERE user_email = $1 ORDER BY created_at DESC',
        [email]
      );
      const tasks: Task[] = rows.map((row) => ({
        id: row.id,
        text: row.text,
        done: row.done,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
        source: row.source,
      }));
      return res.status(200).json(tasks);
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
      const { rows: insertedRows } = await query(
        'INSERT INTO tasks (user_email, text, done, due_date, source) VALUES ($1, $2, $3, $4, $5) RETURNING id, text, done, due_date, created_at, source',
        [email, text.trim(), false, due, source]
      );
      const task: Task = {
        id: insertedRows[0].id,
        text: insertedRows[0].text,
        done: insertedRows[0].done,
        dueDate: insertedRows[0].due_date ? new Date(insertedRows[0].due_date).toISOString() : null,
        createdAt: insertedRows[0].created_at ? new Date(insertedRows[0].created_at).toISOString() : null,
        source: insertedRows[0].source,
      };
      return res.status(201).json(task);
    }

    // ── PATCH: toggle done ───────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, done, source } = req.body as { id: string; done?: boolean; source?: "personal" | "work" };
      if (!id || (typeof done === "undefined" && typeof source === "undefined")) {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const updateData: any = {};
      if (typeof done !== "undefined") {
        updateData.done = done;
      }
      if (typeof source !== "undefined") {
        updateData.source = source;
      }
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (typeof done !== "undefined") {
        updateFields.push(`done = $${paramIndex++}`);
        updateValues.push(done);
      }
      if (typeof source !== "undefined") {
        updateFields.push(`source = $${paramIndex++}`);
        updateValues.push(source);
      }

      if (updateFields.length > 0) {
        await query(
          `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = $${paramIndex++} AND user_email = $${paramIndex++}`,
          [...updateValues, id, email]
        );
      }
      return res.status(200).json({ id, ...updateData });
    }

    // ── DELETE: remove a task ─────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body as { id: string };
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      await query('DELETE FROM tasks WHERE id = $1 AND user_email = $2', [id, email]);
      return res.status(204).end();
    }

    // ── 405 for other methods
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err: any) {
    console.error("Error in /api/tasks:", err);
    return res.status(500).json({ error: err.message });
  }
}
