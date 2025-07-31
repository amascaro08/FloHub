// pages/api/meetings/create.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { notes, tasks } from "@/db/schema";
import OpenAI from "openai"; // Import OpenAI
import { prepareContentForStorage } from "@/lib/contentSecurity";

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
  meetingSeries?: string; // Optional: Meeting series name
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
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userId = user.email;

  // 2) Validate input
  const { title, content, tags, eventId, eventTitle, isAdhoc, actions, agenda, meetingSeries } = req.body as CreateMeetingNoteRequest; // Include new fields
  if (typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({ error: "Meeting note content is required" }); // Updated error message
  }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string'))) {
     return res.status(400).json({ error: "Invalid tags format" });
  }
  // Optional: Add validation for eventId, eventTitle, isAdhoc, and actions if needed


  try {
    // 3) Encrypt sensitive content before saving to database
    const encryptedContent = prepareContentForStorage(content);
    const encryptedTitle = title ? prepareContentForStorage(title) : "";
    const encryptedAgenda = agenda ? prepareContentForStorage(agenda) : null;

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
    
    const now = Date.now();
    const [newNote] = await db.insert(notes).values({
      user_email: userId,
      title: encryptedTitle,
      content: encryptedContent,
      tags: tags || [],
      createdAt: new Date(now),
      eventId: eventId || null,
      eventTitle: eventTitle || null,
      isAdhoc: isAdhoc !== undefined ? isAdhoc : null,
      actions: actions || [],
      agenda: encryptedAgenda,
      aiSummary: aiSummary ? prepareContentForStorage(aiSummary) : null,
      meetingSeries: meetingSeries || null,
    }).returning();
    const noteId = newNote.id;

    // 4) Process and save actions to the tasks table if assigned to "Me"
    if (actions && actions.length > 0) {
      for (const action of actions) {
        if (action.assignedTo === "Me") {
          await db.insert(tasks).values({
            user_email: userId,
            text: action.description,
            done: action.status === "done",
            createdAt: new Date(now),
            source: "work",
          });
        }
      }
    }

    return res.status(201).json({ success: true, noteId: String(noteId) });

  } catch (err: any) {
    console.error("Create meeting note error:", err); // Updated error log
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}