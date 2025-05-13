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

    // Process Google Calendar sources from additional accounts
    const additionalGoogleSources = calendarSources.filter(
      source => source.type === "google" && source.connectionData?.startsWith("oauth:")
    );
    
    if (additionalGoogleSources.length > 0) {
      for (const source of additionalGoogleSources) {
        if (!source.isEnabled) continue;
        
        const accountLabel = source.connectionData?.replace("oauth:", "") || "Additional";
        const tags = source.tags || [];
        const sourceName = source.name || `Google Calendar (${accountLabel})`;
        
        try {
          // In a real implementation, we would fetch the tokens for this account and use them
          // For now, we'll add a placeholder event
          if (process.env.NODE_ENV === "development" || req.query.showPlaceholders === "true") {
            const placeholderEvent = {
              id: `google_additional_${source.id}_${Date.now()}`,
              calendarId: source.sourceId,
              summary: `Events from ${sourceName}`,
              start: { dateTime: new Date().toISOString() },
              end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
              source: tags.includes("work") ? "work" : "personal",
              description: `This is a placeholder for events from your additional Google account (${accountLabel}).`,
              calendarName: sourceName,
              tags,
            };
            
            allEvents.push(placeholderEvent);
          }
          
          console.log(`Added placeholder for additional Google account: ${accountLabel}`);
        } catch (e) {
          console.error(`Error processing additional Google account ${accountLabel}:`, e);
        }
      }
    }

    // Process O365 Calendar sources
    const o365Sources = calendarSources.filter(source => source.type === "o365");
    
    // Process PowerAutomate URL sources
    const o365Urls = o365Sources.length > 0
      ? o365Sources
          .filter(source => source.connectionData && !source.connectionData.startsWith("oauth:"))
          .map(source => source.connectionData)
          .filter(url => url && url.startsWith("http"))
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
    
    // Process OAuth O365 sources
    const o365OAuthSources = o365Sources.filter(source =>
      source.connectionData && source.connectionData.startsWith("oauth:")
    );
    
    if (o365OAuthSources.length > 0) {
      for (const source of o365OAuthSources) {
        if (!source.isEnabled) continue;
        
        const tags = source.tags || ["work"]; // Default to work tag for O365
        const sourceName = source.name || "Microsoft 365 (OAuth)";
        const isWork = tags.includes("work") || tags.length === 0; // Default to work if no tags
        
        try {
          // In a real implementation, we would fetch events from Microsoft Graph API
          // For now, we'll try to use our Microsoft API endpoint
          const msCalendarId = source.sourceId;
          
          if (msCalendarId) {
            try {
              // Try to fetch events from our Microsoft API endpoint
              const msEventsUrl = `/api/calendar/microsoft/events?calendarId=${encodeURIComponent(msCalendarId)}&timeMin=${encodeURIComponent(safeTimeMin)}&timeMax=${encodeURIComponent(safeTimeMax)}`;
              
              const msEventsRes = await fetch(`${process.env.NEXTAUTH_URL}${msEventsUrl}`, {
                headers: {
                  Cookie: req.headers.cookie || "",
                },
              });
              
              if (msEventsRes.ok) {
                const msEvents = await msEventsRes.json();
                if (Array.isArray(msEvents)) {
                  // Add the events to our list
                  allEvents.push(...msEvents);
                  console.log(`Added ${msEvents.length} events from Microsoft Calendar:`, sourceName);
                  continue; // Skip the placeholder
                }
              }
            } catch (msError) {
              console.error("Error fetching Microsoft events:", msError);
            }
          }
          
          // If we couldn't fetch real events, add a placeholder
          // Add a placeholder event to show the OAuth calendar in the UI
          const placeholderEvent = {
            id: `o365_oauth_${source.id}_${Date.now()}`,
            calendarId: `o365_${source.id}`,
            summary: "Microsoft OAuth Calendar Integration",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
            source: isWork ? "work" : "personal",
            description: "This is a placeholder for Microsoft OAuth Calendar integration. In a production environment, this would fetch real events from Microsoft Graph API.",
            calendarName: sourceName,
            tags,
          };
          
          // Only add the placeholder if we're in development mode or if explicitly requested
          if (process.env.NODE_ENV === "development" || req.query.showPlaceholders === "true") {
            allEvents.push(placeholderEvent);
          }
          
          console.log("Added placeholder for Microsoft OAuth Calendar:", sourceName);
        } catch (e) {
          console.error("Error processing Microsoft OAuth Calendar source:", e);
        }
      }
    }
    
    // Process Apple Calendar sources
    const appleSources = calendarSources.filter(source => source.type === "apple");
    if (appleSources.length > 0) {
      for (const source of appleSources) {
        if (!source.isEnabled) continue;
        
        const tags = source.tags || [];
        const sourceName = source.name || "Apple Calendar";
        const isWork = tags.includes("work");
        const isPersonal = tags.includes("personal") || (!isWork && tags.length === 0);
        
        try {
          // For Apple Calendar integration, we would need to implement a server-side
          // integration with Apple's Calendar API or use a proxy service.
          // Since this is beyond the scope of this implementation, we'll add a placeholder
          // event to show the calendar in the UI
          
          const placeholderEvent = {
            id: `apple_placeholder_${source.id}`,
            calendarId: `apple_${source.id}`,
            summary: "Apple Calendar Integration",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
            source: isWork ? "work" : "personal",
            description: "This is a placeholder for Apple Calendar integration. To see your actual Apple Calendar events, you'll need to set up calendar sync in your device settings.",
            calendarName: sourceName,
            tags,
          };
          
          // Only add the placeholder if we're in development mode or if explicitly requested
          if (process.env.NODE_ENV === "development" || req.query.showPlaceholders === "true") {
            allEvents.push(placeholderEvent);
          }
          
          console.log("Added placeholder for Apple Calendar:", sourceName);
        } catch (e) {
          console.error("Error processing Apple Calendar source:", e);
        }
      }
    }
    
    // Process Other Calendar sources
    const otherSources = calendarSources.filter(source => source.type === "other");
    if (otherSources.length > 0) {
      for (const source of otherSources) {
        if (!source.isEnabled) continue;
        
        const tags = source.tags || [];
        const sourceName = source.name || "Other Calendar";
        const isWork = tags.includes("work");
        const isPersonal = tags.includes("personal") || (!isWork && tags.length === 0);
        
        try {
          // For other calendar types, we would need to implement specific integrations
          // based on the calendar type. Since this is beyond the scope of this implementation,
          // we'll add a placeholder event to show the calendar in the UI
          
          const placeholderEvent = {
            id: `other_placeholder_${source.id}`,
            calendarId: `other_${source.id}`,
            summary: "External Calendar Integration",
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() }, // 1 hour later
            source: isWork ? "work" : "personal",
            description: "This is a placeholder for external calendar integration. To see your actual events, you'll need to set up calendar sync with this provider.",
            calendarName: sourceName,
            tags,
          };
          
          // Only add the placeholder if we're in development mode or if explicitly requested
          if (process.env.NODE_ENV === "development" || req.query.showPlaceholders === "true") {
            allEvents.push(placeholderEvent);
          }
          
          console.log("Added placeholder for Other Calendar:", sourceName);
        } catch (e) {
          console.error("Error processing Other Calendar source:", e);
        }
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

    // Determine which calendar API to use based on calendarId
    if (calendarId.startsWith('o365_')) {
      // For O365 calendars, we would need to use the Microsoft Graph API
      // This is beyond the scope of this implementation
      return res.status(501).json({ error: "Creating events in O365 calendars is not yet implemented" });
    } else if (calendarId.startsWith('apple_')) {
      // For Apple calendars, we would need to use Apple's Calendar API
      // This is beyond the scope of this implementation
      return res.status(501).json({ error: "Creating events in Apple calendars is not yet implemented" });
    } else if (calendarId.startsWith('other_')) {
      // For other calendar types, we would need specific implementations
      // This is beyond the scope of this implementation
      return res.status(501).json({ error: "Creating events in this calendar type is not yet implemented" });
    }
    
    // For Google Calendar, use the Google Calendar API
    try {
      // Build the event object for Google Calendar API
      const eventData: any = {
        summary,
        description: description || "",
        start: {
          dateTime: start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: end,
          timeZone: 'UTC',
        },
      };
      
      // Add extended properties for tags and source
      if (tags && tags.length > 0) {
        eventData.extendedProperties = eventData.extendedProperties || {};
        eventData.extendedProperties.private = eventData.extendedProperties.private || {};
        eventData.extendedProperties.private.tags = JSON.stringify(tags);
      }
      
      if (source) {
        eventData.extendedProperties = eventData.extendedProperties || {};
        eventData.extendedProperties.private = eventData.extendedProperties.private || {};
        eventData.extendedProperties.private.source = source;
      }
      
      // Call the Google Calendar API to create the event
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error creating event:", errorData);
        return res.status(response.status).json({ error: errorData.error?.message || "Failed to create event" });
      }
      
      const newEvent = await response.json();
      
      // Add our custom fields to the response
      newEvent.source = source || "personal";
      newEvent.tags = tags || [];
      
      return res.status(201).json([newEvent as any]);
    } catch (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
