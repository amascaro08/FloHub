// pages/api/tasks.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }            from "next-auth/next";
import { authOptions }                 from "./auth/[...nextauth]";
import { firestore }                   from "@/lib/firebaseAdmin";
import admin                           from "firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const email = session.user.email;
  const userTasks = firestore
    .collection("users")
    .doc(email)
    .collection("tasks");

  try {
    // ─── GET: list tasks (with ISO dates) ───────────────────────────────
    if (req.method === "GET") {
      const snap = await userTasks.orderBy("createdAt", "desc").get();
      const tasks = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id:        d.id,
          text:      data.text,
          done:      data.done,
          dueDate:   data.dueDate   ? data.dueDate.toDate().toISOString()   : null,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        };
      });
      return res.status(200).json(tasks);
    }

    // ─── POST: create a new task ────────────────────────────────────────
    if (req.method === "POST") {
      const { text, dueDate } = req.body;
      if (typeof text !== "string" || !text.trim()) {
        return res.status(400).json({ error: "Invalid text" });
      }
      const due = dueDate ? new Date(dueDate) : null;
      const ref = await userTasks.add({
        text:       text.trim(),
        done:       false,
        dueDate:    due,
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
      });
      const snap = await ref.get();
      const data = snap.data() as any;
      return res.status(201).json({
        id:        snap.id,
        text:      data.text,
        done:      data.done,
        dueDate:   data.dueDate   ? data.dueDate.toDate().toISOString()   : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      });
    }

    // ─── PATCH: toggle done state ────────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, done } = req.body;
      if (!id || typeof done !== "boolean") {
        return res.status(400).json({ error: "Invalid payload" });
      }
      await userTasks.doc(id).update({ done });
      return res.status(200).json({ id, done });
    }

    // ─── DELETE: remove a task ──────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing id" });
      }
      await userTasks.doc(id).delete();
      return res.status(204).end();
    }

    // ─── 405 for other methods ──────────────────────────────────────────
    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error: any) {
    console.error("Error in /api/tasks:", error);
    return res.status(500).json({ error: error.message });
  }
}
