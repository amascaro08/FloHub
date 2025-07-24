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

// Cache for Power Automate URL responses
interface PowerAutomateCache {
  [url: string]: {
    data: any[];
    timestamp: number;
    ttl: number;
  };
}

const powerAutomateCache: PowerAutomateCache = {};
const POWER_AUTOMATE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Helper function to check if cache is valid
const isPowerAutomateCacheValid = (url: string): boolean => {
  const cached = powerAutomateCache[url];
  if (!cached) return false;
  return Date.now() - cached.timestamp < cached.ttl;
};

// Helper function to get cached Power Automate data
const getCachedPowerAutomateData = (url: string): any[] | null => {
  if (isPowerAutomateCacheValid(url)) {
    return powerAutomateCache[url].data;
  }
  return null;
};

// Helper function to cache Power Automate data
const cachePowerAutomateData = (url: string, data: any[]): void => {
  powerAutomateCache[url] = {
    data,
    timestamp: Date.now(),
    ttl: POWER_AUTOMATE_CACHE_TTL,
  };
};

// Helper function for timeout protection
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

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
      const decoded = auth(req);
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
          legacyCalendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
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
        const gres = await fetchWithTimeout(url, {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Cache-Control': 'max-age=60' // Cache for 60 seconds
          },
        }, 8000); // 8 second timeout for Google API

        if (gres.ok) {
          const body = await gres.json();
          const eventSource = tags.includes("work") ? "work" : "personal";
          
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

    // Process O365/Power Automate URLs in parallel with caching
    const o365Promises = o365Urls.map(async (url) => {
      if (!url) return [];
      
      const source = o365Sources.find(s => s.connectionData === url);
      const tags = source?.tags || ["work"]; // Default to work tag for O365
      const sourceName = source?.name || "Work Calendar (O365)";
      const isWork = tags.includes("work") || tags.length === 0; // Default to work if no tags
      
      console.log("Attempting to fetch O365 events from URL:", url);
      
      // Check cache first
      const cachedData = getCachedPowerAutomateData(url);
      if (cachedData) {
        console.log("Using cached O365 data for URL:", url);
        return cachedData.map((event: any) => ({
          ...event,
          calendarName: sourceName,
          tags,
        }));
      }

      try {
        const o365Res = await fetchWithTimeout(url, {}, 10000); // 10 second timeout for Power Automate
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
          
          // Process recurring events - some Power Automate flows return series info
          const expandedEvents: any[] = [];
          
          o365EventsRaw.forEach((e: any) => {
            // Handle both single events and recurring event instances
            if (e.recurrence || e.isRecurring || e.seriesMasterId) {
              // This is a recurring event or part of a series
              console.log("Processing recurring event:", e.title || e.subject);
              
              // Check if this is a series master or instance
              if (e.seriesMasterId && e.seriesMasterId !== e.id) {
                // This is an instance of a recurring series
                expandedEvents.push(e);
              } else if (!e.seriesMasterId) {
                // This might be a series master or single occurrence
                // Add it as-is, Power Automate should have already expanded instances
                expandedEvents.push(e);
              }
            } else {
              // Regular single event
              expandedEvents.push(e);
            }
          });
          
          console.log("Expanded events count:", expandedEvents.length);
          
          const o365Events: any[] = expandedEvents
            .map((e: any) => ({
              id: `o365_${e.startTime || e.start?.dateTime || e.title || e.subject}_${Math.random().toString(36).substring(7)}`,
              calendarId: `o365_${source?.id || "default"}`,
              summary: e.title || e.subject || "No Title (Work)",
              start: { 
                dateTime: e.startTime || e.start?.dateTime || e.start?.date,
                date: e.start?.date // Handle all-day events
              },
              end: { 
                dateTime: e.endTime || e.end?.dateTime || e.end?.date,
                date: e.end?.date // Handle all-day events
              },
              source: isWork ? "work" : "personal",
              description: e.description || e.body || "",
              calendarName: sourceName,
              tags,
              // Preserve recurring event metadata
              isRecurring: e.recurrence || e.isRecurring || !!e.seriesMasterId,
              seriesMasterId: e.seriesMasterId,
              recurrence: e.recurrence
            }))
            .filter((event: any) => {
              // Enhanced filtering for O365 events by timeMin and timeMax
              const eventStart = event.start.dateTime || event.start.date;
              const eventEnd = event.end?.dateTime || event.end?.date;
              
              if (!eventStart) {
                console.warn("Event missing start time:", event.summary);
                return false; // Event must have a start time
              }

              const eventStartTime = parseISO(eventStart);
              const eventEndTime = eventEnd ? parseISO(eventEnd) : null;

              if (isNaN(eventStartTime.getTime())) {
                console.warn("Invalid start time format:", eventStart, "for event:", event.summary);
                return false;
              }

              // More flexible date filtering for recurring events
              const startsAfterMin = eventStartTime.getTime() >= minDate.getTime();
              const startsBeforeMax = eventStartTime.getTime() <= maxDate.getTime();
              const endsAfterMin = eventEndTime ? eventEndTime.getTime() >= minDate.getTime() : true;
              const overlapsRange = startsAfterMin || (startsBeforeMax && endsAfterMin);

              // For recurring events, we want to be more inclusive
              if (event.isRecurring) {
                // Include if the event starts before our max date and doesn't end before our min date
                return startsBeforeMax && endsAfterMin;
              }

              // For single events, use the existing logic but more flexible
              return overlapsRange;
            });
            
          console.log("O365 mapped and filtered events count:", o365Events.length);
          
          // Cache the processed data
          cachePowerAutomateData(url, o365Events);
          
          return o365Events;
        } else {
          const errorText = await o365Res.text();
          console.error("Failed to fetch O365 events, status:", o365Res.status, "Response:", errorText);
          return [];
        }
      } catch (e) {
        console.error("Error fetching O365 events:", e);
        return [];
      }
    });

    // Wait for all requests to complete in parallel
    const [googleResults, o365Results] = await Promise.all([
      Promise.all(googlePromises),
      Promise.all(o365Promises)
    ]);

    // Combine all results
    googleResults.forEach(events => allEvents.push(...events));
    o365Results.forEach(events => allEvents.push(...events));

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
