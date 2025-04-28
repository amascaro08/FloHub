import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { doc, updateDoc, getDoc } from "firebase/firestore"; // Import modular Firestore functions

type UpdateNoteRequest = {
  id: string;
  content?: string; // Allow updating content
  tags?: string[]; // Allow updating tags
};

type UpdateNoteResponse = {
  success?: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateNoteResponse>
) {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    res.setHeader("Allow", "PUT, PATCH");
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
  const { id, content, tags } = req.body as UpdateNoteRequest;
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Note ID is required" });
  }

  // Ensure at least content or tags are provided for update
  if (content === undefined && tags === undefined) {
      return res.status(400).json({ error: "No update fields provided" });
  }

  if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ error: "Invalid content format" });
  }

  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }


  try {
    // 3) Check if the note exists and belongs to the authenticated user
    const noteRef = doc(db, "notes", id);
    const noteSnap = await getDoc(noteRef);

    if (!noteSnap.exists()) {
        return res.status(404).json({ error: "Note not found" });
    }

    const noteData = noteSnap.data();
    if (noteData.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this note" });
    }

    // 4) Prepare update data
    const updateData: any = {};
    if (content !== undefined) {
        updateData.content = content;
    }
    if (tags !== undefined) {
        updateData.tags = tags;
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the note in the database
    await updateDoc(noteRef, updateData);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("Update note error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}