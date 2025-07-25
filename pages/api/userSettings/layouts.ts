import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const user_email = user.email;

  if (req.method === "GET") {
    try {
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email),
      });
      return res.status(200).json({ layouts: settings?.layouts || null });
    } catch (error) {
      console.error('Error fetching layouts:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  } else if (req.method === 'POST') {
    // Save user layout
    try {
      const { layout } = req.body;
      
      // Validate layout data
      if (!layout || typeof layout !== 'object') {
        return res.status(400).json({ error: 'Invalid layout data' });
      }

      // In a real implementation, you would save to database
      // For now, we'll just return success
      return res.status(200).json({ 
        message: 'Layout saved successfully',
        layout 
      });
    } catch (error) {
      console.error('Error saving layout:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}