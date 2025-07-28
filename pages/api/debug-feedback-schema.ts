import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests and require a debug key for security
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { debug } = req.query;
  if (debug !== process.env.DEBUG_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log("Checking feedback table structure...");

    // Get table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'feedback' 
      ORDER BY ordinal_position;
    `);

    // Get some sample data (without sensitive info)
    const sampleData = await db.execute(sql`
      SELECT id, user_id, title, status, created_at, github_issue_number
      FROM feedback 
      LIMIT 5;
    `);

    // Check if any data exists
    const rowCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM feedback;
    `);

    return res.status(200).json({
      success: true,
      tableStructure: tableInfo.rows,
      sampleData: sampleData.rows,
      totalRows: rowCount.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("Debug schema error:", error);
    return res.status(500).json({ 
      error: "Failed to check schema", 
      details: error.message 
    });
  }
}