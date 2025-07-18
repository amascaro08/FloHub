import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = user.email;
  try {
    const rows = await db.select().from(userSettings).where(eq(userSettings.userEmail, userEmail));
    const docs = rows.map(row => ({ id: row.userEmail, data: row }));
    return res.status(200).json({ documents: docs });
  } catch (error) {
    console.error("Error listing user settings documents for", userEmail, error);
    return res.status(500).json({ error: "Failed to list user settings documents" });
  }
}