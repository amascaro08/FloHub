// pages/api/calendar/list.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

type CalItem = { id: string; summary: string };
type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalItem[] | ErrorRes>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const accessToken = user.accounts[0]?.access_token;

  // Call Google Calendar API
  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!resp.ok) {
    const err = await resp.json();
    return res
      .status(resp.status)
      .json({ error: err.error?.message || "Google Calendar error" });
  }

  const body = await resp.json();
  const items = Array.isArray(body.items)
    ? body.items.map((c: any) => ({ id: c.id, summary: c.summary }))
    : [];

  return res.status(200).json(items);
}
