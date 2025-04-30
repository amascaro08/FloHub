import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO

export type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work";
  description?: string; // Add description field
};

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarEvent[] | ErrorRes>
) {
  if (req.method === "GET") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const accessToken = token.accessToken as string;
    const { calendarId = "primary", timeMin, timeMax, o365Url, timezone } = req.query; // Extract timezone

    // Normalize and validate dates
    const safeTimeMin = typeof timeMin === "string" ? timeMin : "";
    const safeTimeMax = typeof timeMax === "string" ? timeMax : "";
    const userTimezone = typeof timezone === "string" ? timezone : "UTC"; // Default to UTC if no timezone is provided


    if (!safeTimeMin || !safeTimeMax) {
      return res.status(400).json({ error: "Missing timeMin or timeMax" });
    }

    const minDate = new Date(safeTimeMin);
    const maxDate = new Date(safeTimeMax);

    if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for timeMin/timeMax" });
    }

    const calendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];

    const allEvents: any[] = [];

    for (const id of calendarIds) {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        id
      )}/events?timeMin=${encodeURIComponent(
        safeTimeMin
      )}&timeMax=${encodeURIComponent(
        safeTimeMax
      )}&singleEvents=true&orderBy=startTime`;

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
          // Tag as personal (Google)
          allEvents.push(...body.items.map((item: any) => ({ ...item, source: "personal" })));
        }
      } catch (e) {
        console.error("Error fetching events:", e);
      }
    }
//
    // Fetch O365 events if o365Url is provided
    if (typeof o365Url === "string" && o365Url.startsWith("http")) {
      try {
        const o365Res = await fetch(o365Url);
        if (o365Res.ok) {
          const o365Data = await o365Res.json();
          // Try to normalize O365 events to CalendarEvent shape
          // Assume o365Data is an array of events or has an "events" property
          const o365EventsRaw = Array.isArray(o365Data)
            ? o365Data
            : Array.isArray(o365Data.events)
            ? o365Data.events
            : [];
          const o365Events: any[] = o365EventsRaw.map((e: any) => ({
            id: e.id,
            summary: e.subject,
            start: { dateTime: e.start?.dateTime || e.start?.date },
            end: { dateTime: e.end?.dateTime || e.end?.date },
            source: "work",
            description: e.bodyPreview || "",
          }));
          allEvents.push(...o365Events);
        }
      } catch (e) {
        console.error("Error fetching O365 events:", e);
      }
    }

    return res.status(200).json(allEvents);
  } else if (req.method === "POST") {
    // Handle event creation
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const accessToken = token.accessToken as string;

    const { summary, start, end, description, source } = req.body as {
      summary: string;
      start: string;
      end: string;
      description?: string;
      source?: "personal" | "work";
    };

    if (!summary || !start || !end) {
      return res.status(400).json({ error: "Missing required event fields" });
    }

    // TODO: Implement actual calendar event creation using accessToken and calendar API
    // For now, simulate event creation and return event object with generated id

    const newEvent = {
      id: `evt_${Date.now()}`,
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
      description: description || "",
      source: source || "personal",
    };

    // In a real implementation, you would call the calendar API here to create the event

    return res.status(201).json([newEvent]);
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
