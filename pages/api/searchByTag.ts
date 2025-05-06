import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "@/lib/firebase";
import { firestore } from "@/lib/firebaseAdmin"; // Use admin for tasks collection
import { collection, query, where, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
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

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token.email as string;

  const { tag } = req.query;

  if (typeof tag !== "string" || !tag) {
    return res.status(400).json({ error: "Missing or invalid tag parameter" });
  }

  try {
    const items: (Note | Task)[] = [];

    // 1. Fetch Notes and Meeting Notes by tag
    const notesQuery = query(
      collection(db, "notes"),
      where("userId", "==", userId),
      where("tags", "array-contains", tag)
    );
    const notesSnapshot = await getDocs(notesQuery);
    notesSnapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        title: data.title || "",
        content: data.content,
        tags: data.tags || [],
        createdAt: data.createdAt.toDate().toISOString(),
        source: data.source || "notespage", // Default source for notes
        eventId: data.eventId || undefined,
        eventTitle: data.eventTitle || undefined,
        isAdhoc: data.isAdhoc || undefined,
        actions: data.actions || [],
      } as Note);
    });

    // 2. Fetch Tasks by tag
    const tasksQuery = firestore
      .collection("users")
      .doc(userId)
      .collection("tasks")
      .where("tags", "array-contains", tag);

    const tasksSnapshot = await tasksQuery.get();
    tasksSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        text: data.text as string,
        done: data.done as boolean,
        dueDate: data.dueDate?.toDate().toISOString() ?? null,
        createdAt: data.createdAt?.toDate().toISOString() ?? null,
        source: data.source as Task['source'] | undefined,
        tags: data.tags || [],
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