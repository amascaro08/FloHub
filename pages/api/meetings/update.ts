// pages/api/meetings/update.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { db } from "../../../lib/firebase"; // Import db from your firebase config
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"; // Import modular Firestore functions
import OpenAI from "openai"; // Import OpenAI
import admin from "firebase-admin"; // Import admin for serverTimestamp

import type { Action } from "@/types/app"; // Import Action type

type UpdateMeetingNoteRequest = { // Renamed type
  id: string;
  title?: string; // Allow updating title
  content?: string; // Allow updating content
  tags?: string[]; // Allow updating tags
  eventId?: string; // Optional: ID of the associated calendar event
  eventTitle?: string; // Optional: Title of the associated calendar event
  isAdhoc?: boolean; // Optional: Flag to indicate if it's an ad-hoc meeting note
  actions?: Action[]; // Optional: Array of actions
  agenda?: string; // Optional: Meeting agenda
};

type UpdateMeetingNoteResponse = { // Renamed type
  success?: boolean;
  error?: string;
  updatedNote?: {
    id: string;
    [key: string]: any;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UpdateMeetingNoteResponse> // Use renamed type
) {
  console.log("update.ts - API handler called with method:", req.method);
  console.log("update.ts - Request body:", req.body);
  
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
  const { id, title, content, tags, eventId, eventTitle, isAdhoc, actions, agenda } = req.body as UpdateMeetingNoteRequest; // Include new fields
  if (typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({ error: "Meeting Note ID is required" }); // Updated error message
  }

  // Ensure at least one update field is provided
  if (title === undefined && content === undefined && tags === undefined && eventId === undefined && eventTitle === undefined && isAdhoc === undefined && actions === undefined && agenda === undefined) {
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
  // Optional: Add validation for eventId, eventTitle, isAdhoc, and actions if needed


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
    if (actions !== undefined) { // Allow updating actions
        updateData.actions = actions;
        
        // Process actions assigned to "Me" and add them to tasks
        if (actions.length > 0) {
            for (const action of actions) {
                // Only process new actions that weren't in the original note
                const existingAction = noteData.actions?.find((a: Action) => a.id === action.id);
                if (!existingAction && action.assignedTo === "Me") {
                    await addDoc(collection(db, "tasks"), {
                        userId: userId,
                        text: action.description,
                        done: action.status === "done",
                        createdAt: serverTimestamp(),
                        source: "work", // Tag as a work task
                    });
                }
            }
        }
    }
    if (agenda !== undefined) { // Allow updating agenda
        updateData.agenda = agenda;
    }
    
    // Generate AI summary if agenda and content are provided
    console.log("update.ts - Checking conditions for AI summary generation:");
    console.log("update.ts - agenda provided:", agenda !== undefined);
    console.log("update.ts - noteData.agenda exists:", !!noteData.agenda);
    console.log("update.ts - content provided:", content !== undefined);
    console.log("update.ts - noteData.content exists:", !!noteData.content);
    
    if ((agenda !== undefined || noteData.agenda) && (content !== undefined || noteData.content)) {
      console.log("update.ts - Conditions met for AI summary generation");
      try {
        // Use the updated values or fall back to existing values
        const currentAgenda = agenda !== undefined ? agenda : noteData.agenda;
        const currentContent = content !== undefined ? content : noteData.content;
        const currentActions = actions !== undefined ? actions : noteData.actions || [];
        
        console.log("update.ts - Current agenda:", currentAgenda);
        console.log("update.ts - Current content length:", currentContent?.length);
        console.log("update.ts - Current actions count:", currentActions?.length);
        
        if (currentAgenda && currentContent) {
          console.log("update.ts - Both agenda and content are available, generating AI summary");
          // Create a prompt for the OpenAI API
          const prompt = `
            Please provide a concise summary of this meeting based on the following information:
            
            Agenda:
            ${currentAgenda}
            
            Meeting Notes:
            ${currentContent}
            
            ${currentActions.length > 0 ? `Action Items:
            ${currentActions.map((action: Action) => `- ${action.description} (Assigned to: ${action.assignedTo})`).join('\n')}` : ''}
            
            Provide a 2-3 sentence summary that captures the key points and decisions.
          `;
          
          // Check if OpenAI API key is configured
          if (!process.env.OPENAI_API_KEY) {
            console.error("update.ts - OpenAI API key is not configured");
            throw new Error("OpenAI API key is not configured");
          }
          
          console.log("update.ts - OpenAI API key is configured, initializing client");
          
          // Initialize OpenAI client
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });
          
          console.log("update.ts - Calling OpenAI API");
          
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
          
          console.log("update.ts - OpenAI API call completed");
          
          updateData.aiSummary = completion.choices[0]?.message?.content || undefined;
          console.log("update.ts - AI Summary updated:", updateData.aiSummary);
        } else {
          console.log("update.ts - Either agenda or content is missing, skipping AI summary generation");
        }
      } catch (error) {
        console.error("update.ts - Error generating AI summary:", error);
        // Continue without updating AI summary if there's an error
      }
    } else {
      console.log("update.ts - Conditions not met for AI summary generation, skipping");
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the meeting note in the database
    console.log("update.ts - Updating document with data:", JSON.stringify(updateData, null, 2));
    
    // Add a timestamp to the update data to ensure the document is actually modified
    updateData.updatedAt = serverTimestamp();
    
    // Log the final update data being sent to Firestore
    console.log("update.ts - Final update data with timestamp:", JSON.stringify(updateData, null, 2));
    
    try {
      // Perform the update
      console.log(`update.ts - Updating document in collection 'notes' with ID '${id}'`);
      await updateDoc(noteRef, updateData);
      console.log("update.ts - Document updated successfully");
      
      // Fetch the updated document to verify the changes
      console.log("update.ts - Fetching updated document to verify changes");
      const updatedNoteSnap = await getDoc(noteRef);
      
      if (!updatedNoteSnap.exists()) {
        console.error("update.ts - Document no longer exists after update");
        return res.status(404).json({
          success: false,
          error: "Document no longer exists after update"
        });
      }
      
      const updatedNoteData = updatedNoteSnap.data();
      console.log("update.ts - Updated document data:", JSON.stringify(updatedNoteData, null, 2));
      
      // Check if the aiSummary was properly saved
      if (updateData.aiSummary && !updatedNoteData.aiSummary) {
        console.warn("update.ts - AI Summary was not saved properly");
      }
      
      // Return success response with the updated document
      return res.status(200).json({
        success: true,
        updatedNote: {
          id: id,
          ...updatedNoteData
        }
      });
    } catch (updateError: any) {
      console.error("update.ts - Error during update operation:", updateError);
      return res.status(500).json({
        success: false,
        error: `Error updating document: ${updateError.message}`
      });
    }

  } catch (err: any) {
    console.error("Update meeting note error:", err); // Updated error log
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}