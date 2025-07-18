import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
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

  const user = await auth(req);

  const userEmail = user?.email as string | undefined; // User email can be undefined for anonymous tracking
  const { eventType, eventData } = req.body;

  if (!eventType) {
    return res.status(400).json({ error: "Event type is required" });
  }

  try {
    await db.insert(analytics).values({
      userEmail,
      eventType,
      eventData: eventData || {},
    });
    return res.status(200).json({ message: "Analytics event tracked successfully" });
  } catch (error: any) {
    console.error("Error tracking analytics event:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}