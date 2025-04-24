// pages/api/calendar/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";

// NOTE: ensure your OAuth scope includes   https://www.googleapis.com/auth/calendar.readonly

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { id: string; summary: string }[]
    | { error: string }
  >
) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  // 1) List calendars from Google
  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    }
  );
  if (!resp.ok) {
    const err = await resp.json();
    return res.status(500).json({ error: err.error?.message || "Google API error" });
  }
  const body = await resp.json();
  const out = (body.items || []).map((c: any) => ({
    id:      c.id,
    summary: c.summary,
  }));
  return res.status(200).json(out);
}
