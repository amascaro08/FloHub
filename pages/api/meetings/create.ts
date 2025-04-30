// pages/api/meetings/create.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
// Assuming Firebase will be used for data storage
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { collection, addDoc } from "firebase/firestore"; // Import modular Firestore functions

type CreateMeetingNoteRequest = { // Renamed type
  title?: string; // Add optional title field
  content: string;
  tags?: string[]; // Optional array of tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
};

type CreateMeetingNoteResponse = { // Renamed type
  success?: boolean;
  error?: string;
  noteId?: string; // Optional ID of the created note
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateMeetingNoteResponse> // Use renamed type
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
  const { title, content, tags, eventId, eventTitle, isAdhoc } = req.body as CreateMeetingNoteRequest; // Include new fields
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Meeting note content is required" }); // Updated error message
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc if needed


  try {
    // 3) Save the meeting note to the database
    console.log(`Saving meeting note for user ${userId}:`, { title, content, tags, eventId, eventTitle, isAdhoc }); // Updated log message

    // Example placeholder for Firebase (adjust based on your actual Firebase setup)
    const newNoteRef = await addDoc(collection(db, "notes"), { // Still save to 'notes' collection
      userId: userId,
      title: title || "", // Save title, default to empty string if not provided
      content: content,
      tags: tags || [], // Save tags as an empty array if none provided
      createdAt: new Date(),
      // Save new fields if provided
      ...(eventId && { eventId }),
      ...(eventTitle && { eventTitle }),
      ...(isAdhoc !== undefined && { isAdhoc }), // Save if explicitly provided (true or false)
    });
    const noteId = newNoteRef.id;

    return res.status(201).json({ success: true, noteId: noteId });

  } catch (err: any) {
    console.error("Create meeting note error:", err); // Updated error log
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}