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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

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

  console.log("[CALENDAR API] calendarId:", calendarId);
  console.log("[CALENDAR API] safeTimeMin:", safeTimeMin);
  console.log("[CALENDAR API] safeTimeMax:", safeTimeMax);
  console.log("[CALENDAR API] userTimezone:", userTimezone); // Log the timezone

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
          id: e.id || e.eventId || e.Id || Math.random().toString(36).slice(2),
          summary: e.subject || e.title || e.summary || "(No title)",
          start: {
            dateTime: e.start?.dateTime || e.startTime || e.start || undefined,
            date: e.start?.date || undefined,
          },
          end: e.end
            ? {
                dateTime: e.end.dateTime || e.endTime || e.end || undefined,
                date: e.end.date || undefined,
              }
            : undefined,
          source: "work",
          description: e.description || undefined, // Include description
          raw: e, // keep original for debugging if needed
        }));
        allEvents.push(...o365Events);
      } else {
        console.error("Failed to fetch O365 events:", o365Res.status);
      }
    } catch (e) {
      console.error("Error fetching O365 events:", e);
    }
  }

  const events: CalendarEvent[] = allEvents
    .sort((a, b) => {
      const da = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const db = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return da - db;
    })
    .map((e: any) => {
      // Format dateTime to the user's timezone
      const startDateTime = e.start?.dateTime;
      const endDateTime = e.end?.dateTime;

      const formattedStartDateTime = startDateTime
        ? formatInTimeZone(parseISO(startDateTime), userTimezone, 'yyyy-MM-dd HH:mm:ss zzz') // Format to user's timezone
        : undefined;

      const formattedEndDateTime = endDateTime
        ? formatInTimeZone(parseISO(endDateTime), userTimezone, 'yyyy-MM-dd HH:mm:ss zzz') // Format to user's timezone
        : undefined;

      return {
        id: e.id,
        summary: e.summary,
        start: { dateTime: formattedStartDateTime, date: e.start?.date },
        end: e.end ? { dateTime: formattedEndDateTime, date: e.end?.date } : undefined,
        source: e.source || undefined,
        description: e.description || undefined, // Include description
      };
    });

  return res.status(200).json(events);
}
