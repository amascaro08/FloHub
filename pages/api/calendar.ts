import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO

export type CalendarEvent = {
  id: string;
  calendarId: string; // Add calendarId field
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
          // Tag as personal (Google) and normalize fields
          allEvents.push(...body.items.map((item: any) => ({
            id: item.id,
            calendarId: id, // Include the calendarId
            summary: item.summary || "No Title",
            start: item.start || { dateTime: "", timeZone: "" },
            end: item.end || { dateTime: "", timeZone: "" },
            source: "personal",
            description: item.description || "",
          })));
        }
      } catch (e) {
        console.error("Error fetching events:", e);
      }
    }
//
    // Fetch O365 events if o365Url is provided
    if (typeof o365Url === "string" && o365Url.startsWith("http")) {
      console.log("Attempting to fetch O365 events from URL:", o365Url); // Log the URL
      try {
        const o365Res = await fetch(o365Url);
        console.log("O365 fetch response status:", o365Res.status); // Log the response status
        if (o365Res.ok) {
          const o365Data = await o365Res.json();
          console.log("O365 events data fetched:", o365Data); // Log raw data
          // Try to normalize O365 events to CalendarEvent shape
          // Assume o365Data is an array of events or has an "events" property
          const o365EventsRaw = Array.isArray(o365Data)
            ? o365Data
            : Array.isArray(o365Data.events)
            ? o365Data.events
            : [];
          console.log("O365 raw events:", o365EventsRaw); // Added logging for raw O365 events
          const o365Events: any[] = o365EventsRaw
            .map((e: any) => ({
              id: `o365_${e.startTime || e.title}_${Math.random().toString(36).substring(7)}`, // Generate ID from available fields
              summary: e.title || "No Title (Work)", // Map title to summary
              start: { dateTime: e.startTime }, // Map startTime
              end: { dateTime: e.endTime }, // Map endTime
              source: "work",
              description: e.description || "", // Map description
            }))
            .filter((event: any) => {
              // Filter O365 events by timeMin and timeMax
              const eventStartTime = event.start.dateTime ? parseISO(event.start.dateTime) : null;
              const eventEndTime = event.end?.dateTime ? parseISO(event.end.dateTime) : null;

              if (!eventStartTime) return false; // Event must have a start time

              const startsAfterMin = eventStartTime.getTime() >= minDate.getTime();
              const endsBeforeMax = eventEndTime ? eventEndTime.getTime() <= maxDate.getTime() : true; // If no end time, assume it's within range
              const startsBeforeMinEndsAfterMin = eventStartTime.getTime() < minDate.getTime() && eventEndTime && eventEndTime.getTime() > minDate.getTime();

              return (startsAfterMin && endsBeforeMax) || startsBeforeMinEndsAfterMin;
            });
          console.log("O365 mapped and filtered events:", o365Events); // Added logging for mapped and filtered O365 events
          allEvents.push(...o365Events);
        } else {
          console.error("Failed to fetch O365 events, status:", o365Res.status);
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

    const { calendarId, summary, start, end, description, source } = req.body as {
      calendarId: string; // Include calendarId in the type
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
      calendarId, // Include calendarId in the new event object
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
