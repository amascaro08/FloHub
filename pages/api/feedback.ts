import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { feedback, backlog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authenticate via JWT for all requests
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const userEmail = user.email; // Use email as user identifier

  // Handle different HTTP methods
  if (req.method === "GET") {
    // Get feedback or backlog items
    const { type } = req.query;
    
    try {
      if (type === "backlog") {
        // Retrieve backlog items
        const backlogItems = await db.select().from(backlog).orderBy(desc(backlog.createdAt));
        return res.status(200).json(backlogItems.map(item => ({
          ...item,
          id: String(item.id),
          createdAt: new Date(item.createdAt!).getTime()
        })));
      } else {
        // TESTING: Use raw SQL to bypass ORM and test the actual database
        console.log("Testing feedback table access...");
        
        try {
          // Test 1: Check if feedback table exists
          const tableCheck = await db.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'feedback'
            );
          `);
          console.log("Table exists:", tableCheck.rows[0]);
          
          // Test 2: Get table columns
          const columnsCheck = await db.execute(sql`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'feedback' 
            ORDER BY ordinal_position;
          `);
          console.log("Table columns:", columnsCheck.rows);
          
          // Test 3: Try simple count
          const countCheck = await db.execute(sql`SELECT COUNT(*) as count FROM feedback;`);
          console.log("Row count:", countCheck.rows[0]);
          
          // Test 4: Try the problematic query with raw SQL
          const rawQuery = await db.execute(sql`
            SELECT id, user_id, title, description, status, created_at 
            FROM feedback 
            WHERE user_id = ${userEmail} 
            ORDER BY created_at DESC 
            LIMIT 10;
          `);
          console.log("Raw query result:", rawQuery.rows);
          
          // If raw query works, return the data
          return res.status(200).json({
            success: true,
            debug: {
              tableExists: tableCheck.rows[0],
              columns: columnsCheck.rows,
              count: countCheck.rows[0],
              userEmail: userEmail
            },
            data: rawQuery.rows.map(item => ({
              id: String(item.id),
              feedbackType: 'general',
              feedbackText: item.description || '',
              title: item.title || '',
              status: item.status || 'open',
              createdAt: item.created_at ? new Date(item.created_at as string | number | Date).getTime() : Date.now(),
              completedAt: null
            }))
          });
          
        } catch (dbError: any) {
          console.error("Database test error:", {
            message: dbError.message,
            code: dbError.code,
            detail: dbError.detail,
            hint: dbError.hint,
            position: dbError.position,
            table: dbError.table,
            column: dbError.column,
            stack: dbError.stack
          });
          
          return res.status(500).json({ 
            error: "Database test failed", 
            details: dbError.message,
            userEmail: userEmail,
            errorCode: dbError.code
          });
        }
      }
    } catch (err: any) {
      console.error("Get feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "POST" && req.query.type === "backlog") {
    // Add item directly to backlog
    const { text } = req.body;
    
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Backlog text is required" });
    }
    
    try {
      const [newBacklogItem] = await db.insert(backlog).values({ text, userId: userEmail, createdAt: new Date() }).returning();
      
      return res.status(201).json({
        success: true,
        backlogId: newBacklogItem.id
      });
    } catch (err: any) {
      console.error("Create backlog error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "POST") {
    // Create new feedback
    const { feedbackType, feedbackText } = req.body;
    if (!feedbackText || typeof feedbackText !== "string" || feedbackText.trim() === "") {
      return res.status(400).json({ error: "Feedback text is required" });
    }

    try {
      // Create title from feedback type and text
      const titlePrefixes: Record<string, string> = {
        'bug': '🐛 Bug Report',
        'feature': '✨ Feature Request', 
        'ui': '🎨 UI Issue',
        'calendar': '📅 Calendar Issue',
        'performance': '⚡ Performance Issue',
        'general': '💬 General Feedback'
      };
      
      const titlePrefix = titlePrefixes[feedbackType] || '💬 Feedback';
      const title = `${titlePrefix}: ${feedbackText.slice(0, 50)}${feedbackText.length > 50 ? '...' : ''}`;

      const [newFeedbackItem] = await db.insert(feedback).values({ 
        userId: userEmail, // Use email as user identifier
        title: title,
        description: feedbackText,
        status: "open", 
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      const feedbackId = newFeedbackItem.id;

      return res.status(201).json({ success: true, feedbackId });
    } catch (err: any) {
      console.error("Create feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else if (req.method === "PUT" || req.method === "PATCH") {
    // Update feedback status
    const { id, status, notes } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: "Feedback ID is required" });
    }
    
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    try {
      const [existingFeedback] = await db.select().from(feedback).where(eq(feedback.id, id));
      
      if (!existingFeedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }
      
      await db.update(feedback).set({ 
        status, 
        updatedAt: new Date()
      }).where(eq(feedback.id, id));
      
      // If status is "backlog", add to backlog collection
      if (status === "backlog") {
        await db.insert(backlog).values({ 
          originalId: id, 
          text: existingFeedback.description || existingFeedback.title, 
          createdAt: new Date(), 
          userId: userEmail 
        });
      }
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Update feedback error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}