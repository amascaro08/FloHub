// pages/api/calendar.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getToken }                            from "next-auth/jwt";

type Event = {
  id:      string;
  summary: string;
  start:   { dateTime?: string; date?: string };
  end?:    { dateTime?: string; date?: string };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Event[] | { error: string }>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Auth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const accessToken = token.accessToken as string;

  // 2) Parse query
  const { calendarId, timeMin, timeMax } = req.query;
  const ids = Array.isArray(calendarId)
    ? calendarId
    : calendarId
    ? [calendarId]
    : [];

  if (ids.length === 0 || typeof timeMin !== "string" || typeof timeMax !== "string") {
    return res.status(400).json({ error: "Missing or invalid query parameters" });
  }

  // 3) Fetch & aggregate
  const allEvents: any[] = [];
  for (const id of ids) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      id
    )}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(
      timeMax
    )}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || "Google API error" });
    }
    const body = await response.json();
    if (Array.isArray(body.items)) {
      allEvents.push(...body.items);
    }
  }

  // 4) Sort and trim
  allEvents.sort((a, b) => {
    const da = new Date(a.start.dateTime || a.start.date || 0).getTime();
    const db = new Date(b.start.dateTime || b.start.date || 0).getTime();
    return da - db;
  });

  // 5) Return minimal shape
  const events: Event[] = allEvents.map((e: any) => ({
    id:      e.id,
    summary: e.summary,
    start:   { dateTime: e.start.dateTime, date: e.start.date },
    end:     e.end ? { dateTime: e.end.dateTime, date: e.end.date } : undefined,
  }));

  return res.status(200).json(events);
}
