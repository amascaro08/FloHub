// pages/api/meetings/index.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { collection, query, where, orderBy, getDocs, QueryDocumentSnapshot, or, and } from "firebase/firestore"; // Import modular Firestore functions, QueryDocumentSnapshot, 'or', and 'and'
import type { Note } from "@/types/app"; // Import shared Note type

export type GetMeetingNotesResponse = { // Export the type
  meetingNotes?: Note[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMeetingNotesResponse>
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
    // 2) Fetch meeting notes for the authenticated user from the database
    // Filter for notes where eventId exists OR isAdhoc is true

    // Fetch all notes for the user and filter meeting notes in application code
    const meetingNotesSnapshot = await getDocs(query(
      collection(db, "notes"), // Meeting notes are stored in the same 'notes' collection
      where("userId", "==", userId), // Filter by userId
      orderBy("createdAt", "desc")
    ));

    // Filter meeting notes in application code
    const meetingNotes: Note[] = meetingNotesSnapshot.docs
      .map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "", // Include title
          content: data.content,
          tags: data.tags || [],
          createdAt: data.createdAt.toDate().toISOString(),
          eventId: data.eventId || undefined, // Include eventId
          eventTitle: data.eventTitle || undefined, // Include eventTitle
          isAdhoc: data.isAdhoc || undefined, // Include isAdhoc
          actions: data.actions || [], // Include actions
          agenda: data.agenda || undefined, // Include agenda
          aiSummary: data.aiSummary || undefined, // Include AI summary
        };
      })
      .filter(note => note.eventId !== undefined || note.isAdhoc === true); // Filter for meeting notes

    return res.status(200).json({ meetingNotes: meetingNotes });

  } catch (err: any) {
    console.error("Fetch meeting notes error:", err);
    console.error("Fetch meeting notes error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}