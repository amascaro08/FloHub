// pages/api/calendar/events.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  description?: string; // Add optional description field
};

export type GetCalendarEventsResponse = {
  events?: CalendarEvent[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetCalendarEventsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Authenticate via JWT
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.accessToken) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const accessToken = token.accessToken as string;

  // 2) Get calendarId from query parameters
  const { calendarId } = req.query;

  if (!calendarId || typeof calendarId !== 'string') {
    return res.status(400).json({ error: "Calendar ID is required" });
  }

  try {
    // 3) Call Google Calendar API to list events for the specified calendar

    // Set time range for events (e.g., next 3 months)
    const now = new Date();
    const timeMin = now.toISOString();
    const threeMonthsLater = new Date(now.setMonth(now.getMonth() + 3));
    const timeMax = threeMonthsLater.toISOString();


    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

    const apiRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!apiRes.ok) {
      const err = await apiRes.json();
      console.error("Google Calendar API error fetching events:", apiRes.status, err);
      return res.status(apiRes.status).json({ error: err.error?.message || "Google API error fetching events" });
    }

    const body = await apiRes.json();
    const events: CalendarEvent[] = Array.isArray(body.items)
      ? body.items.map((event: any) => ({
          id: event.id,
          summary: event.summary || "No Title",
          start: event.start,
          end: event.end,
          description: event.description, // Include the description
        }))
      : [];

    return res.status(200).json({ events: events });

  } catch (err: any) {
    console.error("Fetch calendar events error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}