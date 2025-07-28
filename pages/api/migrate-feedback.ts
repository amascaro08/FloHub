import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    console.log("Starting feedback table migration...");

    // Add user_email column to feedback table
    await db.execute(sql`
      ALTER TABLE feedback 
      ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
    `);

    // Create index for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);
    `);

    console.log("Migration completed successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Feedback table migration completed - user_email column added" 
    });

  } catch (error: any) {
    console.error("Migration error:", error);
    return res.status(500).json({ 
      error: "Migration failed", 
      details: error.message 
    });
  }
}