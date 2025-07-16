// pages/api/meetings/update.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../../lib/neon";
import OpenAI from "openai"; // Import OpenAI

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
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const userId = user.email as string; // Using email as a simple user identifier

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
    // 3) Check if the meeting note exists and belongs to the authenticated user
    const { rows: existingNoteRows } = await query(
      `SELECT "userId", actions, agenda, content FROM notes WHERE id = $1`,
      [id]
    );

    if (existingNoteRows.length === 0) {
        return res.status(404).json({ error: "Meeting Note not found" });
    }

    const noteData = existingNoteRows[0];
    if (noteData.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this meeting note" });
    }

    // 4) Prepare update data
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        updateParams.push(title);
    }
    if (content !== undefined) {
        updateFields.push(`content = $${paramIndex++}`);
        updateParams.push(content);
    }
    if (tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`);
        updateParams.push(tags);
    }
    if (eventId !== undefined) {
        updateFields.push(`"eventId" = $${paramIndex++}`);
        updateParams.push(eventId);
    }
    if (eventTitle !== undefined) {
        updateFields.push(`"eventTitle" = $${paramIndex++}`);
        updateParams.push(eventTitle);
    }
    if (isAdhoc !== undefined) {
        updateFields.push(`"isAdhoc" = $${paramIndex++}`);
        updateParams.push(isAdhoc);
    }
    if (actions !== undefined) {
        updateFields.push(`actions = $${paramIndex++}`);
        updateParams.push(actions);
        
        // Process actions assigned to "Me" and add them to tasks
        if (actions.length > 0) {
            for (const action of actions) {
                // Only process new actions that weren't in the original note
                const existingAction = noteData.actions?.find((a: Action) => a.id === action.id);
                if (!existingAction && action.assignedTo === "Me") {
                    await query(
                        `INSERT INTO tasks ("userId", text, done, "createdAt", source) VALUES ($1, $2, $3, $4, $5)`,
                        [userId, action.description, action.status === "done", Date.now(), "work"]
                    );
                }
            }
        }
    }
    if (agenda !== undefined) {
        updateFields.push(`agenda = $${paramIndex++}`);
        updateParams.push(agenda);
    }
    
    // Generate AI summary if agenda and content are provided - but do it asynchronously
    console.log("update.ts - Checking conditions for AI summary generation:");
    console.log("update.ts - agenda provided:", agenda !== undefined);
    console.log("update.ts - noteData.agenda exists:", !!noteData.agenda);
    console.log("update.ts - content provided:", content !== undefined);
    console.log("update.ts - noteData.content exists:", !!noteData.content);
    
    // Start the AI summary generation in parallel with the main update
    let aiSummaryPromise: Promise<string | undefined> = Promise.resolve(undefined);
    
    if ((agenda !== undefined || noteData.agenda) && (content !== undefined || noteData.content)) {
      console.log("update.ts - Conditions met for AI summary generation");
      // Use the updated values or fall back to existing values
      const currentAgenda = agenda !== undefined ? agenda : noteData.agenda;
      const currentContent = content !== undefined ? content : noteData.content;
      const currentActions = actions !== undefined ? actions : noteData.actions || [];
      
      console.log("update.ts - Current agenda:", currentAgenda);
      console.log("update.ts - Current content length:", currentContent?.length);
      console.log("update.ts - Current actions count:", currentActions?.length);
      
      if (currentAgenda && currentContent) {
        console.log("update.ts - Both agenda and content are available, generating AI summary");
        
        // Create the AI summary generation promise
        aiSummaryPromise = (async () => {
          try {
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
            
            return completion.choices[0]?.message?.content || undefined;
          } catch (error) {
            console.error("update.ts - Error generating AI summary:", error);
            return undefined;
          }
        })();
      }
    } else {
      console.log("update.ts - Conditions not met for AI summary generation, skipping");
    }
    // Optionally update a 'updatedAt' timestamp
    // updateData.updatedAt = new Date();


    // 5) Update the meeting note in the database
    console.log("update.ts - Updating document with fields:", JSON.stringify(updateFields, null, 2));
    console.log("update.ts - Updating document with params:", JSON.stringify(updateParams, null, 2));
    
    // Add a timestamp to the update data to ensure the document is actually modified
    updateFields.push(`"updatedAt" = $${paramIndex++}`);
    updateParams.push(Date.now());
    
    updateParams.push(id); // Add ID for WHERE clause

    try {
      // Wait for AI summary to complete and add it to updateData if available
      const aiSummary = await aiSummaryPromise;
      if (aiSummary) {
        updateFields.push(`"aiSummary" = $${paramIndex++}`);
        updateParams.push(aiSummary);
        console.log("update.ts - AI Summary added to update data:", aiSummary);
      }
      
      // Log the final update data being sent to Neon
      console.log("update.ts - Final update data with timestamp:", JSON.stringify(updateFields, null, 2), JSON.stringify(updateParams, null, 2));
      
      // Perform the update
      console.log(`update.ts - Updating document in table 'notes' with ID '${id}'`);
      await query(
        `UPDATE notes SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateParams
      );
      console.log("update.ts - Document updated successfully");
      
      // Fetch the updated document to verify the changes
      console.log("update.ts - Fetching updated document to verify changes");
      const { rows: updatedNoteRows } = await query(
        `SELECT id, title, content, tags, "eventId", "eventTitle", "isAdhoc", actions, agenda, "aiSummary", "createdAt", "updatedAt" FROM notes WHERE id = $1`,
        [id]
      );
      
      if (updatedNoteRows.length === 0) {
        console.error("update.ts - Document no longer exists after update");
        return res.status(404).json({
          success: false,
          error: "Document no longer exists after update"
        });
      }
      
      const updatedNoteData = updatedNoteRows[0];
      console.log("update.ts - Updated document data:", JSON.stringify(updatedNoteData, null, 2));
      
      // Check if the aiSummary was properly saved
      if (aiSummary && !updatedNoteData.aiSummary) {
        console.warn("update.ts - AI Summary was not saved properly");
      }
      
      // Return success response with the updated document
      return res.status(200).json({
        success: true,
        updatedNote: {
          id: updatedNoteData.id,
          title: updatedNoteData.title,
          content: updatedNoteData.content,
          tags: updatedNoteData.tags,
          eventId: updatedNoteData.eventId,
          eventTitle: updatedNoteData.eventTitle,
          isAdhoc: updatedNoteData.isAdhoc,
          actions: updatedNoteData.actions,
          agenda: updatedNoteData.agenda,
          aiSummary: updatedNoteData.aiSummary,
          createdAt: Number(updatedNoteData.createdAt),
          updatedAt: Number(updatedNoteData.updatedAt)
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