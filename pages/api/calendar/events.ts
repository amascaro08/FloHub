// pages/api/calendar/events.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";

export type CalendarEvent = {
  id: string;
  title: string; // Changed summary to title
  start: Date;
  end: Date;
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

  if (!calendarId) {
    return res.status(400).json({ error: "Calendar ID is required" });
  }

  const calendarIds = typeof calendarId === 'string' ? calendarId.split(',') : Array.isArray(calendarId) ? calendarId : [];

  if (calendarIds.length === 0) {
    return res.status(400).json({ error: "Calendar ID is required" });
  }

  try {
    // 3) Call Google Calendar API to list events for the specified calendar
    const allEvents: any[] = [];

    // Set time range for events (e.g., next 3 months)
    const now = new Date();
    const timeMin = now.toISOString();
    const threeMonthsLater = new Date(now.setMonth(now.getMonth() + 3));
    const timeMax = threeMonthsLater.toISOString();

    for (const calId of calendarIds) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;

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
      const events: any[] = Array.isArray(body.items)
        ? body.items.map((event: any) => ({
            id: event.id,
            summary: event.summary || "No Title",
            start: event.start,
            end: event.end,
            description: event.description, // Include the description
          }))
        : [];

      allEvents.push(...events);
    }

    // Ensure start and end are Dates and has title
    const formattedEvents: CalendarEvent[] = allEvents.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date),
      end: event.end?.dateTime ? new Date(event.end.dateTime) : event.end?.date ? new Date(event.end.date) : new Date(),
      description: event.description,
    }));

    return res.status(200).json({ events: formattedEvents });

  } catch (err: any) {
    console.error("Fetch calendar events error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}