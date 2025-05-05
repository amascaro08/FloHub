import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { collection, query, where, orderBy, getDocs, QueryDocumentSnapshot } from "firebase/firestore"; // Import modular Firestore functions and QueryDocumentSnapshot

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
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = token.email as string; // Using email as a simple user identifier

  try {
    // 2) Fetch notes for the authenticated user from the database
    // This is a placeholder. You will need to implement the actual database logic here.

    const notesSnapshot = await getDocs(query(
      collection(db, "notes"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    ));

    const notes: Note[] = notesSnapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "", // Include the title field
        content: data.content,
        tags: data.tags || [],
        // Ensure createdAt is a string before assigning to the shared Note type
        createdAt: data.createdAt.toDate().toISOString(),
      };
    });

    return res.status(200).json({ notes: notes });

  } catch (err: any) {
    console.error("Fetch notes error:", err);
    // Log the full error object for detailed debugging
    console.error("Fetch notes error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}