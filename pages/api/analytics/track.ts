import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { analytics } from "@/db/schema";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const decoded = auth(req);
  let user_email: string | undefined;
  if (decoded) {
    const user = await getUserById(decoded.userId);
    user_email = user?.email;
  }
  const { eventType, eventData } = req.body;

  if (!eventType) {
    return res.status(400).json({ error: "Event type is required" });
  }

  try {
    await db.insert(analytics).values({
      user_email,
      eventType,
      eventData: eventData || {},
    });
    return res.status(200).json({ message: "Analytics event tracked successfully" });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
}