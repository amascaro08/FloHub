import type { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO
import { CalendarSource } from '../../types/app'; // Import CalendarSource type

export type CalendarEvent = {
  id: string;
  calendarId: string; // Add calendarId field
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  source?: "personal" | "work";
  description?: string; // Add description field
  calendarName?: string; // Add calendar name
  tags?: string[]; // Add tags
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
    const { calendarId = "primary", timeMin, timeMax, o365Url, timezone, useCalendarSources = "true" } = req.query; // Extract timezone and useCalendarSources flag

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

    // Determine which calendar sources to use
    let calendarSources: CalendarSource[] = [];
    let legacyCalendarIds: string[] = [];
    let legacyO365Url: string | null = null;
    
    // If useCalendarSources is true, fetch user settings to get calendar sources
    if (useCalendarSources === "true") {
      try {
        // Fetch user settings to get calendar sources
        const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL || ""}/api/userSettings`, {
          headers: {
            Cookie: req.headers.cookie || "",
          },
        });
        
        if (userSettingsRes.ok) {
          const userSettings = await userSettingsRes.json();
          
          if (userSettings.calendarSources && userSettings.calendarSources.length > 0) {
            // Use only enabled calendar sources
            calendarSources = userSettings.calendarSources.filter((source: CalendarSource) => source.isEnabled);
          } else {
            // Fall back to legacy settings
            legacyCalendarIds = userSettings.selectedCals || [];
            legacyO365Url = userSettings.powerAutomateUrl || null;
          }
        } else {
          console.error("Failed to fetch user settings:", userSettingsRes.status);
          // Fall back to query parameters
          legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
          legacyO365Url = typeof o365Url === "string" ? o365Url : null;
        }
      } catch (e) {
        console.error("Error fetching user settings:", e);
        // Fall back to query parameters
        legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
        legacyO365Url = typeof o365Url === "string" ? o365Url : null;
      }
    } else {
      // Use query parameters directly
      legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
      legacyO365Url = typeof o365Url === "string" ? o365Url : null;
    }

    const allEvents: any[] = [];

    // Process Google Calendar sources
    const googleSources = calendarSources.filter(source => source.type === "google");
    const googleCalendarIds = googleSources.length > 0 
      ? googleSources.map(source => source.sourceId)
      : legacyCalendarIds;

    for (const id of googleCalendarIds) {
      const source = googleSources.find(s => s.sourceId === id);
      const tags = source?.tags || [];
      const sourceName = source?.name || "Google Calendar";
      
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
          // Determine if this is a work or personal calendar based on tags
          const isWork = tags.includes("work");
          const isPersonal = tags.includes("personal") || (!isWork && tags.length === 0);
          const source = isWork ? "work" : "personal";
          
          // Tag and normalize fields
          allEvents.push(...body.items.map((item: any) => ({
            id: item.id,
            calendarId: id, // Include the calendarId
            summary: item.summary || "No Title",
            start: item.start || { dateTime: "", timeZone: "" },
            end: item.end || { dateTime: "", timeZone: "" },
            source,
            description: item.description || "",
            calendarName: sourceName,
            tags,
          })));
        }
      } catch (e) {
        console.error("Error fetching events:", e);
      }
    }

    // Process O365 Calendar sources
    const o365Sources = calendarSources.filter(source => source.type === "o365");
    const o365Urls = o365Sources.length > 0 
      ? o365Sources.map(source => source.connectionData).filter(url => url && url.startsWith("http"))
      : (legacyO365Url && legacyO365Url.startsWith("http") ? [legacyO365Url] : []);

    for (const url of o365Urls) {
      if (!url) continue;
      
      const source = o365Sources.find(s => s.connectionData === url);
      const tags = source?.tags || ["work"]; // Default to work tag for O365
      const sourceName = source?.name || "Work Calendar (O365)";
      const isWork = tags.includes("work") || tags.length === 0; // Default to work if no tags
      
      console.log("Attempting to fetch O365 events from URL:", url);
      try {
        const o365Res = await fetch(url);
        console.log("O365 fetch response status:", o365Res.status);
        if (o365Res.ok) {
          const o365Data = await o365Res.json();
          console.log("O365 events data fetched:", o365Data);
          
          // Try to normalize O365 events to CalendarEvent shape
          const o365EventsRaw = Array.isArray(o365Data)
            ? o365Data
            : Array.isArray(o365Data.events)
            ? o365Data.events
            : [];
            
          console.log("O365 raw events:", o365EventsRaw);
          const o365Events: any[] = o365EventsRaw
            .map((e: any) => ({
              id: `o365_${e.startTime || e.title}_${Math.random().toString(36).substring(7)}`,
              calendarId: `o365_${source?.id || "default"}`,
              summary: e.title || "No Title (Work)",
              start: { dateTime: e.startTime },
              end: { dateTime: e.endTime },
              source: isWork ? "work" : "personal",
              description: e.description || "",
              calendarName: sourceName,
              tags,
            }))
            .filter((event: any) => {
              // Filter O365 events by timeMin and timeMax
              const eventStartTime = event.start.dateTime ? parseISO(event.start.dateTime) : null;
              const eventEndTime = event.end?.dateTime ? parseISO(event.end.dateTime) : null;

              if (!eventStartTime) return false; // Event must have a start time

              const startsAfterMin = eventStartTime.getTime() >= minDate.getTime();
              const endsBeforeMax = eventEndTime ? eventEndTime.getTime() <= maxDate.getTime() : true;
              const startsBeforeMinEndsAfterMin = eventStartTime.getTime() < minDate.getTime() && eventEndTime && eventEndTime.getTime() > minDate.getTime();

              return (startsAfterMin && endsBeforeMax) || startsBeforeMinEndsAfterMin;
            });
            
          console.log("O365 mapped and filtered events:", o365Events);
          allEvents.push(...o365Events);
        } else {
          console.error("Failed to fetch O365 events, status:", o365Res.status);
        }
      } catch (e) {
        console.error("Error fetching O365 events:", e);
      }
    }
    
    // Process Apple Calendar sources (placeholder for future implementation)
    const appleSources = calendarSources.filter(source => source.type === "apple");
    if (appleSources.length > 0) {
      console.log("Apple Calendar integration not yet implemented");
      // TODO: Implement Apple Calendar integration
    }
    
    // Process Other Calendar sources (placeholder for future implementation)
    const otherSources = calendarSources.filter(source => source.type === "other");
    if (otherSources.length > 0) {
      console.log("Other calendar types not yet implemented");
      // TODO: Implement other calendar types integration
    }

    return res.status(200).json(allEvents);
  } else if (req.method === "POST") {
    // Handle event creation
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.accessToken) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const accessToken = token.accessToken as string;

    const { calendarId, summary, start, end, description, source, tags } = req.body as {
      calendarId: string;
      summary: string;
      start: string;
      end: string;
      description?: string;
      source?: "personal" | "work";
      tags?: string[];
    };

    if (!summary || !start || !end) {
      return res.status(400).json({ error: "Missing required event fields" });
    }

    // TODO: Implement actual calendar event creation using accessToken and calendar API
    // For now, simulate event creation and return event object with generated id

    const newEvent = {
      id: `evt_${Date.now()}`,
      calendarId,
      summary,
      start: { dateTime: start },
      end: { dateTime: end },
      description: description || "",
      source: source || "personal",
      tags: tags || [],
    };

    // In a real implementation, you would call the calendar API here to create the event

    return res.status(201).json([newEvent]);
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
