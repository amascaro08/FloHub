// pages/api/meetings/create.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
// Assuming Firebase will be used for data storage
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; // Import modular Firestore functions and serverTimestamp
import OpenAI from "openai"; // Import OpenAI

import type { Action } from "@/types/app"; // Import Action type

type CreateMeetingNoteRequest = { // Renamed type
  title?: string; // Add optional title field
  content: string;
  tags?: string[]; // Optional array of tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
  actions?: Action[]; // Optional: Array of actions
  agenda?: string; // Optional: Meeting agenda
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
  const { title, content, tags, eventId, eventTitle, isAdhoc, actions, agenda } = req.body as CreateMeetingNoteRequest; // Include new fields
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Meeting note content is required" }); // Updated error message
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc, and actions if needed


  try {
    // 3) Save the meeting note to the database

    // Example placeholder for Firebase (adjust based on your actual Firebase setup)
    // Generate AI summary if agenda and content are provided
    let aiSummary = undefined;
    if (agenda && content) {
      try {
        // Create a prompt for the OpenAI API
        const prompt = `
          Please provide a concise summary of this meeting based on the following information:
          
          Agenda:
          ${agenda}
          
          Meeting Notes:
          ${content}
          
          ${actions && actions.length > 0 ? `Action Items:
          ${actions.map(action => `- ${action.description} (Assigned to: ${action.assignedTo})`).join('\n')}` : ''}
          
          Provide a 2-3 sentence summary that captures the key points and decisions.
        `;
        
        // Initialize OpenAI client
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that summarizes meeting notes concisely and professionally."
            },
            {
              role: "user",
              content: prompt
            }
          ],
        });
        
        aiSummary = completion.choices[0]?.message?.content || undefined;
        console.log("AI Summary generated:", aiSummary);
      } catch (error) {
        console.error("Error generating AI summary:", error);
        // Continue without AI summary if there's an error
      }
    }
    
    const newNoteRef = await addDoc(collection(db, "notes"), { // Still save to 'notes' collection
      userId: userId,
      title: title || "", // Save title, default to empty string if not provided
      content: content,
      tags: tags || [], // Save tags as an empty array if none provided
      createdAt: serverTimestamp(), // Use serverTimestamp for consistency
      // Save new fields if provided
      ...(eventId && { eventId }),
      ...(eventTitle && { eventTitle }),
      ...(isAdhoc !== undefined && { isAdhoc }), // Save if explicitly provided (true or false)
      ...(actions && { actions }), // Save actions if provided
      ...(agenda && { agenda }), // Save agenda if provided
      ...(aiSummary && { aiSummary }), // Save AI summary if generated
    });
    const noteId = newNoteRef.id;

    // 4) Process and save actions to the tasks collection if assigned to "Me"
    if (actions && actions.length > 0) {
      for (const action of actions) {
        if (action.assignedTo === "Me") {
          await addDoc(collection(db, "tasks"), {
            userId: userId,
            text: action.description, // Use 'text' field as expected by the tasks collection
            done: action.status === "done", // Convert status to boolean 'done' field
            createdAt: serverTimestamp(), // Use serverTimestamp
            source: "work", // Tag as a work task
            // Optional: Link back to the meeting note if needed in the future
            // meetingNoteId: noteId,
          });
        }
      }
    }

    return res.status(201).json({ success: true, noteId: noteId });

  } catch (err: any) {
    console.error("Create meeting note error:", err); // Updated error log
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}