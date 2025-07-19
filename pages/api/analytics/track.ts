import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { analytics, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

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
  } catch (error: any) {
    console.error("Error tracking analytics event:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}