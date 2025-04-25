import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
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

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }

  const accessToken = token.accessToken as string;
  const { calendarId = "primary", timeMin, timeMax } = req.query;

  if (typeof timeMin !== "string" || typeof timeMax !== "string") {
    return res.status(400).json({ error: "Missing or invalid timeMin/timeMax" });
  }

  const calendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];

  const allEvents: any[] = [];
  for (const id of calendarIds) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      id
    )}/events?timeMin=${encodeURIComponent(
      timeMin
    )}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    try {
      const gres = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!gres.ok) {
        const err = await gres.json();
        console.error(`Google Calendar API error for ${id}:`, err);
        continue;
      }

      const body = await gres.json();
      if (Array.isArray(body.items)) {
        allEvents.push(...body.items);
      }
    } catch (e) {
      console.error("Error fetching events:", e);
    }
  }

  const events: CalendarEvent[] = allEvents
    .sort((a, b) => {
      const da = new Date(a.start.dateTime || a.start.date || 0).getTime();
      const db = new Date(b.start.dateTime || b.start.date || 0).getTime();
      return da - db;
    })
    .map((e: any) => ({
      id: e.id,
      summary: e.summary,
      start: { dateTime: e.start.dateTime, date: e.start.date },
      end: e.end ? { dateTime: e.end.dateTime, date: e.end.date } : undefined,
    }));

  return res.status(200).json(events);
}
