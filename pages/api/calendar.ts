// pages/api/calendar.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";

export type CalendarEvent = {
  id:      string;
  summary: string;
  start:   { dateTime?: string; date?: string };
  end?:    { dateTime?: string; date?: string };
};

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarEvent[] | ErrorRes>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Authenticate
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const accessToken = token.accessToken as string;

  // Parse query params
  const { calendarId, timeMin, timeMax } = req.query;
  const ids = Array.isArray(calendarId)
    ? calendarId
    : typeof calendarId === "string"
    ? [calendarId]
    : [];

  if (
    ids.length === 0 ||
    typeof timeMin !== "string" ||
    typeof timeMax !== "string"
  ) {
    return res
      .status(400)
      .json({ error: "Missing or invalid calendarId/timeMin/timeMax" });
  }

  // Fetch & aggregate events
  const allEvents: any[] = [];
  for (const id of ids) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      id
    )}/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const gres = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!gres.ok) {
      const err = await gres.json();
      return res
        .status(gres.status)
        .json({ error: err.error?.message || "Google Calendar error" });
    }
    const body = await gres.json();
    if (Array.isArray(body.items)) {
      allEvents.push(...body.items);
    }
  }

  // Sort chronologically
  allEvents.sort((a, b) => {
    const da = new Date(a.start.dateTime || a.start.date || 0).getTime();
    const db = new Date(b.start.dateTime || b.start.date || 0).getTime();
    return da - db;
  });

  // Return minimal shape
  const out: CalendarEvent[] = allEvents.map((e: any) => ({
    id:      e.id,
    summary: e.summary,
    start:   { dateTime: e.start.dateTime, date: e.start.date },
    end:     e.end ? { dateTime: e.end.dateTime, date: e.end.date } : undefined,
  }));

  return res.status(200).json(out);
}
