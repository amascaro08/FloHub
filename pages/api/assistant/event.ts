// pages/api/assistant/event.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession }                   from "next-auth/next";
import type { Session }                       from "next-auth";
import { authOptions }                        from "../auth/[...nextauth]";

type EventRequest = { eventId: string };
type EventResponse = { success: boolean; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EventResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const session = (await getServerSession(
    req,
    res,
    authOptions
  )) as Session | null;

  if (!session?.user?.email) {
    return res.status(401).json({ success: false, error: "Not signed in" });
  }

  const { eventId } = req.body as EventRequest;
  if (typeof eventId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }

  try {
    // TODO: process the event for session.user.email
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Event handler error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
