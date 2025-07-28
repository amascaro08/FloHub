import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Test 1: Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'feedback'
      );
    `);

    // Test 2: Get table structure
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'feedback' 
      ORDER BY ordinal_position;
    `);

    // Test 3: Try a simple count query
    let count = null;
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM feedback;`);
      count = countResult.rows[0];
    } catch (countError: any) {
      count = { error: countError.message };
    }

    // Test 4: Try to select with user_id column specifically
    let userIdTest = null;
    try {
      const userIdResult = await db.execute(sql`
        SELECT user_id FROM feedback LIMIT 1;
      `);
      userIdTest = { success: true, sample: userIdResult.rows[0] };
    } catch (userIdError: any) {
      userIdTest = { error: userIdError.message };
    }

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      tests: {
        tableExists: tableExists.rows[0],
        columns: columns.rows,
        count: count,
        userIdColumnTest: userIdTest
      }
    });

  } catch (error: any) {
    console.error("Debug error:", error);
    return res.status(500).json({ 
      error: "Debug failed", 
      details: error.message 
    });
  }
}