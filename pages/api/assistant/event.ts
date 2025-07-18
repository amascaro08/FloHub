// pages/api/assistant/event.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

type EventRequest  = { eventId: string };
type EventResponse = { success: boolean; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EventResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  // ── 1) Authenticate ───────────────────────────────────────────────────
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ success: false, error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ success: false, error: "User not found" });
  }

  // ── 2) Validate payload ─────────────────────────────────────────────
  const { eventId } = req.body as EventRequest;
  if (typeof eventId !== "string") {
    return res.status(400).json({ success: false, error: "Invalid payload" });
  }

  try {
    // ── 3) Process (e.g. delete or modify the event) ──────────────────
    // await deleteEventForUser(email, eventId);
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("Event handler error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
