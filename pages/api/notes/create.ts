import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
// Assuming Firebase will be used for data storage
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { collection, addDoc } from "firebase/firestore"; // Import modular Firestore functions

type CreateNoteRequest = {
  content: string;
  tags?: string[]; // Optional array of tags
};

type CreateNoteResponse = {
  success?: boolean;
  error?: string;
  noteId?: string; // Optional ID of the created note
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateNoteResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
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

  // 2) Validate input
  const { content, tags } = req.body as CreateNoteRequest;
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Note content is required" });
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }


  try {
    // 3) Save the note to the database
    // This is a placeholder. You will need to implement the actual database logic here.
    console.log(`Saving note for user ${userId}:`, { content, tags });

    // Example placeholder for Firebase (adjust based on your actual Firebase setup)
    const newNoteRef = await addDoc(collection(db, "notes"), {
      userId: userId,
      content: content,
      tags: tags || [], // Save tags as an empty array if none provided
      createdAt: new Date(),
    });
    const noteId = newNoteRef.id;

    return res.status(201).json({ success: true, noteId: noteId });

  } catch (err: any) {
    console.error("Create note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}