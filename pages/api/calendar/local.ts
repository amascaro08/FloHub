import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { calendarEvents, userSettings } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { CalendarEvent } from "@/types/calendar";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://flohub.xyz',
    'https://www.flohub.xyz',
    'https://flohub.vercel.app'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not signed in" });
    }

    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    // Get user's timezone from settings
    let userTimezone;
    try {
      const userSettingsData = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user.email),
        columns: { timezone: true },
      });
      userTimezone = userSettingsData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn("[API] Failed to fetch user timezone, using browser default");
      userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    if (req.method === "GET") {
      const { timeMin, timeMax } = req.query;

      // Parse date range
      const startDate = timeMin ? new Date(timeMin as string) : new Date();
      const endDate = timeMax ? new Date(timeMax as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      console.log('Fetching local events for user:', user.email, 'from', startDate, 'to', endDate);

      try {
        // Fetch local calendar events for the user within the date range
        const localEvents = await db.select()
          .from(calendarEvents)
          .where(
            and(
              eq(calendarEvents.user_email, user.email),
              // Filter by date range - we'll do a more sophisticated filter in JavaScript
              // since the start field is JSONB
            )
          );

        console.log('Raw local events found:', localEvents.length);

        // Filter events by date range and convert to CalendarEvent format
        const filteredEvents: CalendarEvent[] = localEvents
          .filter(event => {
            // Parse the start date from JSONB
            const startData = event.start as any;
            let eventStart: Date;
            
            if (startData?.dateTime) {
              eventStart = new Date(startData.dateTime);
            } else if (startData?.date) {
              eventStart = new Date(startData.date);
            } else {
              return false; // Skip events without valid start time
            }

            // Check if event is within the date range
            return eventStart >= startDate && eventStart <= endDate;
          })
          .map(event => {
            const startData = event.start as any;
            const endData = event.end as any;
            
            return {
              id: event.id,
              summary: event.summary,
              description: event.description || undefined,
              location: event.location || undefined,
              start: {
                dateTime: startData?.dateTime || undefined,
                date: startData?.date || undefined,
                timeZone: startData?.timeZone || undefined,
              },
              end: endData ? {
                dateTime: endData?.dateTime || undefined,
                date: endData?.date || undefined,
                timeZone: endData?.timeZone || undefined,
              } : undefined,
              calendarId: event.calendarId || 'flohub_local',
              source: (event.source as "personal" | "work") || "personal",
              calendarName: "FloHub Local",
              tags: event.tags || [],
              isRecurring: event.isRecurring || false,
              seriesMasterId: event.seriesMasterId || undefined,
              instanceIndex: event.instanceIndex || undefined,
              created: event.createdAt?.toISOString(),
              updated: event.updatedAt?.toISOString(),
            };
          });

        console.log('Filtered local events:', filteredEvents.length);

        return res.status(200).json({ events: filteredEvents });
      } catch (error) {
        console.error('Error fetching local events:', error);
        return res.status(500).json({ error: "Failed to fetch local events" });
      }
    }

    if (req.method === "POST") {
      const { summary, description, location, start, end, source, tags } = req.body;

      if (!summary || !start) {
        return res.status(400).json({ error: "Summary and start time are required" });
      }

      // Generate a unique ID for the event
      const eventId = `flohub_local_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Prepare the start and end time objects
      const startObj = {
        dateTime: start,
        timeZone: userTimezone,
      };

      const endObj = end ? {
        dateTime: end,
        timeZone: userTimezone,
      } : undefined;

      try {
        // Insert the new event into the database
        const newEventData = {
          id: eventId,
          user_email: user.email,
          summary,
          description: description || null,
          location: location || null,
          start: startObj,
          end: endObj,
          calendarId: 'flohub_local',
          source: source || 'personal',
          tags: tags || [],
          isRecurring: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(calendarEvents).values(newEventData);

        console.log('Created local event:', eventId);

        // Return the created event in CalendarEvent format
        const responseEvent: CalendarEvent = {
          id: eventId,
          summary,
          description: description || undefined,
          location: location || undefined,
          start: startObj,
          end: endObj,
          calendarId: 'flohub_local',
          source: source || "personal",
          calendarName: "FloHub Local",
          tags: tags || [],
          isRecurring: false,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };

        return res.status(201).json(responseEvent);
      } catch (error) {
        console.error('Error creating local event:', error);
        return res.status(500).json({ error: "Failed to create local event" });
      }
    }

    if (req.method === "PUT") {
      const { id } = req.query;
      const { summary, description, location, start, end, source, tags } = req.body;

      if (!id || !summary || !start) {
        return res.status(400).json({ error: "ID, summary and start time are required" });
      }

      // Prepare the updated data
      const startObj = {
        dateTime: start,
        timeZone: userTimezone,
      };

      const endObj = end ? {
        dateTime: end,
        timeZone: userTimezone,
      } : undefined;

      try {
        // Update the event in the database
        const updateData = {
          summary,
          description: description || null,
          location: location || null,
          start: startObj,
          end: endObj,
          source: source || 'personal',
          tags: tags || [],
          updatedAt: new Date(),
        };

        const result = await db.update(calendarEvents)
          .set(updateData)
          .where(and(
            eq(calendarEvents.id, id as string),
            eq(calendarEvents.user_email, user.email)
          ));

        console.log('Updated local event:', id);

        // Return the updated event
        const responseEvent: CalendarEvent = {
          id: id as string,
          summary,
          description: description || undefined,
          location: location || undefined,
          start: startObj,
          end: endObj,
          calendarId: 'flohub_local',
          source: source || "personal",
          calendarName: "FloHub Local",
          tags: tags || [],
          isRecurring: false,
          updated: new Date().toISOString(),
        };

        return res.status(200).json(responseEvent);
      } catch (error) {
        console.error('Error updating local event:', error);
        return res.status(500).json({ error: "Failed to update local event" });
      }
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      try {
        // Delete the event from the database
        await db.delete(calendarEvents)
          .where(and(
            eq(calendarEvents.id, id as string),
            eq(calendarEvents.user_email, user.email)
          ));

        console.log('Deleted local event:', id);

        return res.status(200).json({ message: "Event deleted successfully" });
      } catch (error) {
        console.error('Error deleting local event:', error);
        return res.status(500).json({ error: "Failed to delete local event" });
      }
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });

  } catch (error) {
    console.error("Local calendar API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}