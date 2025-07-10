import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { query } from "@/lib/neon";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const userEmail = token?.email as string | undefined; // User email can be undefined for anonymous tracking
  const { eventType, eventData } = req.body;

  if (!eventType) {
    return res.status(400).json({ error: "Event type is required" });
  }

  try {
    await query(
      `INSERT INTO analytics (user_email, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [userEmail, eventType, eventData || {}]
    );
    return res.status(200).json({ message: "Analytics event tracked successfully" });
  } catch (error: any) {
    console.error("Error tracking analytics event:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}