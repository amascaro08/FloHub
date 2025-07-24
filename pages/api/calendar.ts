import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { formatInTimeZone } from 'date-fns-tz'; // Import formatInTimeZone
import { parseISO } from 'date-fns'; // Import parseISO
import { CalendarSource } from '../../types/app'; // Import CalendarSource type
import { db } from '../../lib/drizzle';
import { accounts } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

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

type ErrorRes = { error: string; details?: any };

// Function to refresh Google access token
async function refreshGoogleToken(userId: number, refreshToken: string): Promise<string | null> {
  try {
    console.log('Attempting to refresh Google token for user:', userId);
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_SECRET || '',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh Google token:', response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    
    // Update the access token in the database
    await db.update(accounts)
      .set({
        access_token: tokenData.access_token,
        expires_at: tokenData.expires_in ? Math.floor(Date.now() / 1000) + tokenData.expires_in : null,
      })
      .where(and(
        eq(accounts.userId, userId),
        eq(accounts.provider, 'google')
      ));

    console.log('Successfully refreshed Google token for user:', userId);
    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

// Function to validate Google access token
async function validateGoogleToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken);
    return response.ok;
  } catch (error) {
    console.error('Error validating Google token:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ events: CalendarEvent[] } | ErrorRes>
) {
  // Handle CORS for production
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === "GET") {
      console.log("[calendar] Request cookies:", req.cookies);
      console.log("[calendar] Auth token:", req.cookies['auth-token']);
      const decoded = auth(req);
      console.log("[calendar] Auth decoded:", decoded);
      if (!decoded) {
        return res.status(401).json({ error: "Not signed in" });
      }
      
      const user = await getUserById(decoded.userId);
      if (!user?.email) {
        return res.status(401).json({ error: "User not found" });
      }

    console.log('Calendar API request for user:', user.email);

    // Get Google OAuth access token from user's accounts
    const googleAccount = user.accounts?.find(account => account.provider === 'google');
    let accessToken = googleAccount?.access_token;
    
    console.log('Google account found:', !!googleAccount);
    console.log('Initial access token exists:', !!accessToken);
    
    // Check if token is expired and refresh if needed
    if (googleAccount && accessToken) {
      const expiresAt = googleAccount.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      
      console.log('Token expires at:', expiresAt, 'Current time:', currentTime);
      
      if (expiresAt && expiresAt <= currentTime && googleAccount.refresh_token) {
        console.log('Google access token expired, attempting to refresh...');
        accessToken = await refreshGoogleToken(decoded.userId, googleAccount.refresh_token);
        if (!accessToken) {
          console.warn("Failed to refresh Google access token");
        }
      } else if (accessToken) {
        // Validate the existing token
        const isValid = await validateGoogleToken(accessToken);
        if (!isValid && googleAccount.refresh_token) {
          console.log('Google access token invalid, attempting to refresh...');
          accessToken = await refreshGoogleToken(decoded.userId, googleAccount.refresh_token);
        }
      }
    }
    
    const { calendarId = "primary", timeMin, timeMax, o365Url, timezone, useCalendarSources = "true" } = req.query;

    // Normalize and validate dates
    const safeTimeMin = typeof timeMin === "string" ? timeMin : "";
    const safeTimeMax = typeof timeMax === "string" ? timeMax : "";
    const userTimezone = typeof timezone === "string" ? timezone : "UTC";

    if (!safeTimeMin || !safeTimeMax) {
      return res.status(400).json({ error: "Missing timeMin or timeMax" });
    }

    const minDate = new Date(safeTimeMin);
    const maxDate = new Date(safeTimeMax);

    if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for timeMin/timeMax" });
    }

    console.log('Date range:', safeTimeMin, 'to', safeTimeMax);

    // Determine which calendar sources to use
    let calendarSources: CalendarSource[] = [];
    let legacyCalendarIds: string[] = [];
    let legacyO365Url: string | null = null;
    
    console.log('useCalendarSources flag:', useCalendarSources);
    
    // If useCalendarSources is true, fetch user settings to get calendar sources
    if (useCalendarSources === "true") {
      try {
        // Use the userSettings from the database directly instead of making an HTTP call
        const { db } = await import('../../lib/drizzle');
        const { userSettings } = await import('../../db/schema');
        const { eq } = await import('drizzle-orm');
        
        const userSettingsData = await db.query.userSettings.findFirst({
          where: eq(userSettings.user_email, user.email),
        });
        
        console.log('User settings loaded:', {
          hasCalendarSources: !!userSettingsData?.calendarSources,
          calendarSourcesCount: Array.isArray(userSettingsData?.calendarSources) ? userSettingsData.calendarSources.length : 0,
          hasSelectedCals: !!userSettingsData?.selectedCals,
          selectedCalsCount: Array.isArray(userSettingsData?.selectedCals) ? userSettingsData.selectedCals.length : 0,
          hasPowerAutomateUrl: !!userSettingsData?.powerAutomateUrl
        });
        
        if (Array.isArray(userSettingsData?.calendarSources) && userSettingsData.calendarSources.length > 0) {
          // Use only enabled calendar sources
          calendarSources = (userSettingsData.calendarSources as CalendarSource[]).filter((source: CalendarSource) => source.isEnabled);
          console.log('Enabled calendar sources:', calendarSources.length);
        } else {
          // Fall back to legacy settings
          legacyCalendarIds = Array.isArray(userSettingsData?.selectedCals) ? (userSettingsData.selectedCals as string[]) : ["primary"];
          legacyO365Url = userSettingsData?.powerAutomateUrl || null;
          console.log('Using legacy settings:', { legacyCalendarIds, hasLegacyO365Url: !!legacyO365Url });
        }
      } catch (e) {
        console.error("Error fetching user settings:", e);
        // Fall back to query parameters or defaults
        legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
        legacyO365Url = typeof o365Url === "string" ? o365Url : null;
      }
    } else {
      // Use query parameters directly
      legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
      legacyO365Url = typeof o365Url === "string" ? o365Url : null;
      console.log('Using query parameters directly');
    }

    const allEvents: any[] = [];

    // Process Google Calendar sources
    const googleSources = calendarSources.filter(source => source.type === "google");
    const googleCalendarIds = googleSources.length > 0 
      ? googleSources.map(source => source.sourceId).filter((id): id is string => id !== undefined)
      : legacyCalendarIds.filter((id): id is string => id !== undefined);

    console.log('Google calendar IDs to process:', googleCalendarIds);

    // Process O365 Calendar sources
    const o365Sources = calendarSources.filter(source => source.type === "o365");
    
    // Process PowerAutomate URL sources
    let o365Urls: string[] = [];
    
    // First, check calendar sources
    if (o365Sources.length > 0) {
      o365Urls = o365Sources
        .filter(source => source.connectionData && !source.connectionData.startsWith("oauth:"))
        .map(source => source.connectionData)
        .filter((url): url is string => typeof url === "string" && url.startsWith("http"));
    }
    
    // Then check legacy O365 URL from settings
    if (o365Urls.length === 0 && legacyO365Url && legacyO365Url.startsWith("http")) {
      o365Urls.push(legacyO365Url);
    }
    
    // Finally check query parameters
    if (o365Urls.length === 0 && typeof o365Url === "string" && o365Url.startsWith("http")) {
      o365Urls.push(o365Url);
    }

    console.log('O365 URLs to process:', o365Urls);

    // Check if we have any calendar sources to process
    if (googleCalendarIds.length === 0 && o365Urls.length === 0) {
      console.log("No calendar sources found");
      
      // If no access token and no O365 URLs, return empty events
      if (!accessToken) {
        console.log("No access token available, returning empty events");
        return res.status(200).json({ events: [] });
      }
      
      // If we have access token but no calendar sources, use primary calendar as fallback
      if (accessToken) {
        googleCalendarIds.push("primary");
        console.log("Using primary calendar as fallback");
      }
    }

    // Process Google Calendar sources in parallel for better performance
    const googlePromises = googleCalendarIds.map(async (id) => {
      const source = googleSources.find(s => s.sourceId === id);
      const tags = source?.tags || [];
      const sourceName = source?.name || "Google Calendar";
      
      // Skip Google Calendar requests if no access token is available
      if (!accessToken) {
        console.warn(`Skipping Google Calendar ${id} - no access token available`);
        return [];
      }
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        id
      )}/events?timeMin=${encodeURIComponent(
        safeTimeMin
      )}&timeMax=${encodeURIComponent(
        safeTimeMax
      )}&singleEvents=true&orderBy=startTime&maxResults=250`; // Limit results for performance

      console.log(`Fetching Google Calendar events for ${id}...`);

      try {
        const gres = await fetch(url, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Cache-Control': 'max-age=60' // Cache for 60 seconds
          },
        });

        if (!gres.ok) {
          const err = await gres.json();
          console.error(`Google Calendar API error for ${id}:`, gres.status, err);
          
          // If unauthorized, try to refresh token once more
          if (gres.status === 401 && googleAccount?.refresh_token) {
            console.log('Unauthorized, attempting final token refresh...');
            const newToken = await refreshGoogleToken(decoded.userId, googleAccount.refresh_token);
            if (newToken) {
              // Retry the request with new token
              const retryRes = await fetch(url, {
                headers: { Authorization: `Bearer ${newToken}` },
              });
              if (retryRes.ok) {
                const retryBody = await retryRes.json();
                if (Array.isArray(retryBody.items)) {
                  const isWork = tags.includes("work");
                  const isPersonal = tags.includes("personal") || (!isWork && tags.length === 0);
                  const eventSource = isWork ? "work" : "personal";
                  
                  const events = retryBody.items.map((item: any) => ({
                    id: item.id,
                    calendarId: id,
                    summary: item.summary || "No Title",
                    start: item.start || { dateTime: "", timeZone: "" },
                    end: item.end || { dateTime: "", timeZone: "" },
                    source: eventSource,
                    description: item.description || "",
                    calendarName: sourceName,
                    tags,
                  }));
                  console.log(`Successfully fetched ${retryBody.items.length} events for ${id} after token refresh`);
                  return events;
                }
              }
            }
          }
          return [];
        }

        const body = await gres.json();
        if (Array.isArray(body.items)) {
          // Determine if this is a work or personal calendar based on tags
          const isWork = tags.includes("work");
          const isPersonal = tags.includes("personal") || (!isWork && tags.length === 0);
          const eventSource = isWork ? "work" : "personal";
          
          // Tag and normalize fields
          const events = body.items.map((item: any) => ({
            id: item.id,
            calendarId: id, // Include the calendarId
            summary: item.summary || "No Title",
            start: item.start || { dateTime: "", timeZone: "" },
            end: item.end || { dateTime: "", timeZone: "" },
            source: eventSource,
            description: item.description || "",
            calendarName: sourceName,
            tags,
          }));
          console.log(`Successfully fetched ${body.items.length} events for ${id}`);
          return events;
        }
        return [];
      } catch (e) {
        console.error(`Error fetching events for calendar ${id}:`, e);
        return [];
      }
    });

    // Wait for all Google Calendar requests to complete
    const googleResults = await Promise.all(googlePromises);
    googleResults.forEach(events => allEvents.push(...events));

    // Process O365/Power Automate URLs
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
          console.log("O365 events data type:", typeof o365Data, "Array?", Array.isArray(o365Data));
          
          // Try to normalize O365 events to CalendarEvent shape
          const o365EventsRaw = Array.isArray(o365Data)
            ? o365Data
            : Array.isArray(o365Data.events)
            ? o365Data.events
            : o365Data.value || []; // Some APIs return data in 'value' field
            
          console.log("O365 raw events count:", o365EventsRaw.length);
          const o365Events: any[] = o365EventsRaw
            .map((e: any) => ({
              id: `o365_${e.startTime || e.title || e.subject}_${Math.random().toString(36).substring(7)}`,
              calendarId: `o365_${source?.id || "default"}`,
              summary: e.title || e.subject || "No Title (Work)",
              start: { dateTime: e.startTime || e.start?.dateTime },
              end: { dateTime: e.endTime || e.end?.dateTime },
              source: isWork ? "work" : "personal",
              description: e.description || e.body || "",
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
            
          console.log("O365 mapped and filtered events count:", o365Events.length);
          allEvents.push(...o365Events);
        } else {
          const errorText = await o365Res.text();
          console.error("Failed to fetch O365 events, status:", o365Res.status, "Response:", errorText);
        }
      } catch (e) {
        console.error("Error fetching O365 events:", e);
      }
    }

    console.log(`Total events fetched: ${allEvents.length}`);
    return res.status(200).json({ events: allEvents });
  } else if (req.method === "POST") {
    // Handle event creation
    const decodedPOST = auth(req);
    if (!decodedPOST) {
      return res.status(401).json({ error: "Not signed in" });
    }
    const user = await getUserById(decodedPOST.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }
    // Get Google OAuth access token from user's accounts
    const googleAccount = user.accounts?.find(account => account.provider === 'google');
    let accessToken = googleAccount?.access_token;
    
    // Check if token is expired and refresh if needed
    if (googleAccount && accessToken) {
      const expiresAt = googleAccount.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (expiresAt && expiresAt <= currentTime && googleAccount.refresh_token) {
        console.log('Google access token expired, attempting to refresh...');
        accessToken = await refreshGoogleToken(decodedPOST.userId, googleAccount.refresh_token);
        if (!accessToken) {
          console.warn("Failed to refresh Google access token");
        }
      }
    }
    
    if (!accessToken && !req.body.calendarId?.startsWith('o365_')) {
      return res.status(400).json({ error: "No Google access token available for event creation" });
    }

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
      
      return res.status(201).json({ events: [newEvent as any] });
    } catch (error) {
      console.error("Error creating event:", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  } catch (error) {
    console.error("Calendar API error:", error);
    return res.status(200).json({ events: [] }); // Return empty events instead of 500 error
  }
}
