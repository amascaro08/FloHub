// pages/api/calendar/list.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
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
