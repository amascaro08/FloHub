import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests and require a secret key for security
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { secret } = req.body;
  if (secret !== process.env.MIGRATION_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Starting feedback table migration...");

    // Add GitHub issue tracking fields if they don't exist
    await db.execute(sql`
      ALTER TABLE feedback 
      ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
      ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
      ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE;
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_github_issue_number ON feedback(github_issue_number);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_completed_at ON feedback(completed_at);
    `);

    console.log("Migration completed successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Feedback table migration completed successfully" 
    });

  } catch (error: any) {
    console.error("Migration error:", error);
    return res.status(500).json({ 
      error: "Migration failed", 
      details: error.message 
    });
  }
}