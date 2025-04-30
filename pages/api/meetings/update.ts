// pages/api/meetings/update.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { doc, updateDoc, getDoc } from "firebase/firestore"; // Import modular Firestore functions

type UpdateMeetingNoteRequest = { // Renamed type
  id: string;
  title?: string; // Allow updating title
  content?: string; // Allow updating content
  tags?: string[]; // Allow updating tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
};

type UpdateMeetingNoteResponse = { // Renamed type
  success?: boolean;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateMeetingNoteResponse> // Use renamed type
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
  const { id, title, content, tags, eventId, eventTitle, isAdhoc } = req.body as UpdateMeetingNoteRequest; // Include new fields
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Meeting Note ID is required" }); // Updated error message
  }

  // Ensure at least one update field is provided
  if (title === undefined && content === undefined && tags === undefined && eventId === undefined && eventTitle === undefined && isAdhoc === undefined) {
      return res.status(400).json({ error: "No update fields provided" });
  }

  if (title !== undefined && typeof title !== "string") {
      return res.status(400).json({ error: "Invalid title format" });
  }

  if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ error: "Invalid content format" });
  }

  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc if needed


  try {
    // 3) Check if the meeting note exists and belongs to the authenticated user
    const noteRef = doc(db, "notes", id); // Still reference the 'notes' collection
    const noteSnap = await getDoc(noteRef);

    if (!noteSnap.exists()) {
        return res.status(404).json({ error: "Meeting Note not found" }); // Updated error message
    }

    const noteData = noteSnap.data();
    if (noteData.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this meeting note" }); // Updated error message
    }

    // 4) Prepare update data
    const updateData: any = {};
    if (title !== undefined) {
        updateData.title = title;
    }
    if (content !== undefined) {
        updateData.content = content;
    }
    if (tags !== undefined) {
        updateData.tags = tags;
    }
    if (eventId !== undefined) { // Allow setting eventId to null/undefined to disassociate
        updateData.eventId = eventId;
    }
    if (eventTitle !== undefined) { // Allow setting eventTitle to null/undefined
        updateData.eventTitle = eventTitle;
    }
    if (isAdhoc !== undefined) { // Allow setting isAdhoc to true or false
        updateData.isAdhoc = isAdhoc;
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the meeting note in the database
    await updateDoc(noteRef, updateData);

    return res.status(200).json({ success: true });

  } catch (err: any) {
    console.error("Update meeting note error:", err); // Updated error log
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}