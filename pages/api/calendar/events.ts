// pages/api/calendar/events.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

import { CalendarEvent, GetCalendarEventsResponse } from "@/types/calendar";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetCalendarEventsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1) Authenticate via JWT
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not signed in" });
  }
  const user = await getUserById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }
  // Get Google OAuth access token using the same logic as calendar.ts
  let accessToken = null;
  
  try {
    const { db } = await import("@/lib/drizzle");
    const { accounts } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");
    
    const googleAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, decoded.userId),
        eq(accounts.provider, "google")
      ),
      columns: {
        access_token: true,
        refresh_token: true,
        expires_at: true,
      }
    });
    
    if (googleAccount?.access_token) {
      const now = Math.floor(Date.now() / 1000);
      if (!googleAccount.expires_at || googleAccount.expires_at > now) {
        accessToken = googleAccount.access_token;
      }
    }
  } catch (error) {
    console.error("Error retrieving Google OAuth tokens:", error);
  }

  // 2) Get parameters from query
  const { calendarId, timeMin, timeMax, o365Url } = req.query;

  // Handle multiple calendar IDs
  const calendarIds = Array.isArray(calendarId) ? calendarId : 
                     typeof calendarId === 'string' ? [calendarId] : 
                     ['primary']; // Default to primary calendar

  try {
    const allEvents: any[] = [];

    // 3) Set time range for events from query parameters or defaults
    const timeMinISO = typeof timeMin === 'string' ? timeMin : new Date().toISOString();
    const timeMaxISO = typeof timeMax === 'string' ? timeMax : (() => {
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
      return threeMonthsLater.toISOString();
    })();

    // 4) Call Google Calendar API to list events for the specified calendar
    if (!o365Url) {
      // Skip Google Calendar calls if no access token
      if (!accessToken) {
        console.log("No Google access token available, skipping Google Calendar events");
      } else {
        for (const calId of calendarIds) {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?timeMin=${encodeURIComponent(timeMinISO)}&timeMax=${encodeURIComponent(timeMaxISO)}&orderBy=startTime`;

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
              title: event.summary || "No Title",
              summary: event.summary || "No Title", // Include both for compatibility
              start: event.start,
              end: event.end,
              description: event.description || "",
              calendarId: calId,
              source: "personal", // Default to personal for Google Calendar
              calendarName: "Google Calendar", // Default name
              tags: [], // Default empty tags
            }))
          : [];

        allEvents.push(...events);
        }
      }
    } else {
      // 5) Call O365 API to list events for the specified calendar
      try {
        const o365ApiRes = await fetch(`${o365Url}&timeMin=${timeMinISO}&timeMax=${timeMaxISO}`);

        if (!o365ApiRes.ok) {
          const err = await o365ApiRes.json();
          console.error("O365 Calendar API error fetching events:", o365ApiRes.status, err);
          // Don't return an error, just log it and continue with the Google Calendar events
        } else {
          const o365Body = await o365ApiRes.json();
          const o365Events: any[] = Array.isArray(o365Body) ? o365Body.map((event: any) => ({
            id: event.id,
            title: event.subject || "No Title",
            summary: event.subject || "No Title", // Include both for compatibility
            start: event.start,
            end: event.end,
            description: event.bodyPreview || "",
            calendarId: "o365",
            source: "work", // Default to work for O365 Calendar
            calendarName: "O365 Calendar", // Default name
            tags: [], // Default empty tags
          })) : [];

          allEvents.push(...o365Events);
        }
      } catch (o365Err: any) {
        console.error("Fetch O365 calendar events error:", o365Err);
        // Don't return an error, just log it and continue with the Google Calendar events
      }
    }

    // 6) Keep the original format to maintain compatibility with both old and new code
    const formattedEvents: CalendarEvent[] = allEvents.map((event: any) => ({
      id: event.id,
      title: event.title || event.summary || "No Title",
      summary: event.summary || event.title || "No Title",
      start: {
        dateTime: event.start.dateTime || (event.start instanceof Date ? event.start.toISOString() : null),
        date: event.start.date || null
      },
      end: {
        dateTime: event.end?.dateTime || (event.end instanceof Date ? event.end.toISOString() : null),
        date: event.end?.date || null
      },
      description: event.description || "",
      calendarId: event.calendarId || "primary",
      source: event.source || "personal",
      calendarName: event.calendarName || "Calendar",
      tags: event.tags || []
    }));

    return res.status(200).json({ events: formattedEvents || [] });
  } catch (err: any) {
    console.error("Fetch calendar events error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}