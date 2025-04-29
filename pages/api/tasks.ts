// pages/api/tasks.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";
import { firestore }                          from "@/lib/firebaseAdmin";
import admin                                  from "firebase-admin";

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
  res: NextApiResponse  // ← no generic here
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

  const userTasks = firestore
    .collection("users")
    .doc(email)
    .collection("tasks");

  try {
    // ── GET: list tasks ──────────────────────────────────────────
    if (req.method === "GET") {
      const snap = await userTasks.orderBy("createdAt", "desc").get();
      const tasks: Task[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id:        d.id,
          text:      data.text,
          done:      data.done,
          dueDate:   data.dueDate   ? data.dueDate.toDate().toISOString()   : null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
          source:    data.source || undefined, // Include source
        };
      });
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (source) {
        newTaskData.source = source;
      }
      const ref = await userTasks.add(newTaskData);
      const snap = await ref.get();
      const data = snap.data() as any;
      const task: Task = {
        id:        snap.id,
        text:      data.text,
        done:      data.done,
        dueDate:   data.dueDate   ? data.dueDate.toDate().toISOString()   : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        source:    data.source || undefined, // Include source
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
      await userTasks.doc(id).update(updateData);
      return res.status(200).json({ id, ...updateData });
    }

    // ── DELETE: remove a task ─────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body as { id: string };
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      await userTasks.doc(id).delete();
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
