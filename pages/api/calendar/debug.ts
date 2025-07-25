import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
const ical = require('node-ical');

type DebugInfo = {
  user: {
    authenticated: boolean;
    email?: string;
    hasGoogleAccount: boolean;
    googleTokenExists: boolean;
    googleTokenExpired?: boolean;
  };
  environment: {
    googleClientId: boolean;
    googleClientSecret: boolean;
    nextAuthUrl: boolean;
  };
  userSettings: {
    calendarSources: any[];
    powerAutomateUrl: string | null;
    selectedCals: string[];
  };
  apis: {
    userSettingsStatus: number;
    calendarListStatus?: number;
    calendarEventsStatus?: number;
  };
  calendarSourcesDebug: {
    google: {
      eventCount: number;
      status: string;
      error?: string;
    };
    o365: {
      eventCount: number;
      sources: Array<{
        name: string;
        url: string;
        eventCount: number;
        status: string;
        error?: string;
      }>;
    };
    ical: {
      eventCount: number;
      sources: Array<{
        name: string;
        url: string;
        eventCount: number;
        status: string;
        error?: string;
        calendarInfo?: any;
      }>;
    };
  };
  errors: string[];
};

async function debugCalendarSources(debugInfo: DebugInfo, user: any, errors: string[]) {
  const calendarSources = debugInfo.userSettings.calendarSources || [];
  
  // Debug Google Calendar
  if (debugInfo.user.hasGoogleAccount && debugInfo.user.googleTokenExists) {
    try {
      const googleSources = calendarSources.filter(source => source.type === "google");
      const googleCalendarIds = googleSources.length > 0 
        ? googleSources.map(source => source.sourceId).filter(id => id !== undefined)
        : ["primary"];

      let totalGoogleEvents = 0;
      
      if (googleCalendarIds.length > 0) {
        const googleAccount = user.accounts?.find((account: any) => account.provider === 'google');
        let accessToken = googleAccount?.access_token;
        
        // Check if token is expired and refresh if needed
        if (googleAccount && accessToken) {
          const expiresAt = googleAccount.expires_at;
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (expiresAt && expiresAt <= currentTime) {
            debugInfo.calendarSourcesDebug.google.status = 'token_expired';
            debugInfo.calendarSourcesDebug.google.error = 'Google access token expired';
          } else {
            // Test fetching events from primary calendar
            try {
              const now = new Date();
              const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
              const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
              
              const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&maxResults=250`;
              
              const response = await fetch(url, {
                headers: { 
                  Authorization: `Bearer ${accessToken}`,
                },
                signal: AbortSignal.timeout(10000), // 10 second timeout
              });
              
              if (response.ok) {
                const data = await response.json();
                totalGoogleEvents = data.items?.length || 0;
                debugInfo.calendarSourcesDebug.google.status = 'success';
              } else {
                debugInfo.calendarSourcesDebug.google.status = 'api_error';
                debugInfo.calendarSourcesDebug.google.error = `HTTP ${response.status}`;
              }
            } catch (error: any) {
              debugInfo.calendarSourcesDebug.google.status = 'fetch_error';
              debugInfo.calendarSourcesDebug.google.error = error.message;
            }
          }
        }
      }
      
      debugInfo.calendarSourcesDebug.google.eventCount = totalGoogleEvents;
    } catch (error: any) {
      debugInfo.calendarSourcesDebug.google.status = 'error';
      debugInfo.calendarSourcesDebug.google.error = error.message;
    }
  } else {
    debugInfo.calendarSourcesDebug.google.status = 'not_connected';
  }

  // Debug O365/PowerAutomate sources
  const o365Sources = calendarSources.filter(source => source.type === "o365");
  let totalO365Events = 0;
  
  for (const source of o365Sources) {
    const sourceDebug = {
      name: source.name || 'Unnamed O365 Source',
      url: source.connectionData || '',
      eventCount: 0,
      status: 'unknown',
      error: undefined as string | undefined,
    };
    
    if (source.connectionData) {
      try {
        const response = await fetch(source.connectionData, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });
        
        if (response.ok) {
          const data = await response.json();
          const events = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : data.value || []);
          sourceDebug.eventCount = events.length;
          sourceDebug.status = 'success';
          totalO365Events += events.length;
        } else {
          sourceDebug.status = 'api_error';
          sourceDebug.error = `HTTP ${response.status}`;
        }
      } catch (error: any) {
        sourceDebug.status = 'fetch_error';
        sourceDebug.error = error.message;
      }
    } else {
      sourceDebug.status = 'no_url';
      sourceDebug.error = 'No connection data configured';
    }
    
    debugInfo.calendarSourcesDebug.o365.sources.push(sourceDebug);
  }
  
  debugInfo.calendarSourcesDebug.o365.eventCount = totalO365Events;

  // Debug iCal sources
  const icalSources = calendarSources.filter(source => source.type === "ical");
  let totalIcalEvents = 0;
  
  for (const source of icalSources) {
    const sourceDebug = {
      name: source.name || 'Unnamed iCal Source',
      url: source.connectionData || '',
      eventCount: 0,
      status: 'unknown',
      error: undefined as string | undefined,
      calendarInfo: undefined as any,
    };
    
    if (source.connectionData) {
      try {
        // Convert webcal:// to https://
        let processedUrl = source.connectionData;
        if (processedUrl.startsWith('webcal://')) {
          processedUrl = 'https://' + processedUrl.substring(9);
        }
        
        const events = await ical.async.fromURL(processedUrl, {
          timeout: 10000, // 10 second timeout for debug
          headers: {
            'User-Agent': 'FloHub Calendar Integration/1.0'
          },
          // Additional axios timeout configuration
          timeoutErrorMessage: 'iCal debug request timeout',
        });

        let eventCount = 0;
        const calendarInfo: any = {};
        
        for (const key in events) {
          const event = events[key];
          
          if (event.type === 'VEVENT') {
            eventCount++;
          } else if (event.type === 'VCALENDAR') {
            // Extract calendar metadata
            if (event['X-WR-CALNAME']) {
              calendarInfo.name = event['X-WR-CALNAME'];
            }
            if (event['X-WR-CALDESC']) {
              calendarInfo.description = event['X-WR-CALDESC'];
            }
            if (event['X-WR-TIMEZONE']) {
              calendarInfo.timezone = event['X-WR-TIMEZONE'];
            }
          }
        }
        
        sourceDebug.eventCount = eventCount;
        sourceDebug.status = 'success';
        sourceDebug.calendarInfo = calendarInfo;
        totalIcalEvents += eventCount;
        
      } catch (error: any) {
        sourceDebug.status = 'fetch_error';
        if (error.code === 'ENOTFOUND') {
          sourceDebug.error = 'URL not found or unreachable';
        } else if (error.code === 'ETIMEDOUT') {
          sourceDebug.error = 'Request timed out';
        } else {
          sourceDebug.error = error.message;
        }
      }
    } else {
      sourceDebug.status = 'no_url';
      sourceDebug.error = 'No connection data configured';
    }
    
    debugInfo.calendarSourcesDebug.ical.sources.push(sourceDebug);
  }
  
  debugInfo.calendarSourcesDebug.ical.eventCount = totalIcalEvents;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DebugInfo>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ 
      user: { authenticated: false, hasGoogleAccount: false, googleTokenExists: false },
      environment: { googleClientId: false, googleClientSecret: false, nextAuthUrl: false },
      userSettings: { calendarSources: [], powerAutomateUrl: null, selectedCals: [] },
      apis: { userSettingsStatus: 0 },
      calendarSourcesDebug: {
        google: { eventCount: 0, status: 'not_tested' },
        o365: { eventCount: 0, sources: [] },
        ical: { eventCount: 0, sources: [] },
      },
      errors: ["Method not allowed"]
    });
  }

  const errors: string[] = [];
  const debugInfo: DebugInfo = {
    user: {
      authenticated: false,
      hasGoogleAccount: false,
      googleTokenExists: false,
    },
    environment: {
      googleClientId: !!(process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_ID),
      googleClientSecret: !!(process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_SECRET),
      nextAuthUrl: !!process.env.NEXTAUTH_URL,
    },
    userSettings: {
      calendarSources: [],
      powerAutomateUrl: null,
      selectedCals: [],
    },
    apis: {
      userSettingsStatus: 0,
    },
    calendarSourcesDebug: {
      google: {
        eventCount: 0,
        status: 'not_tested',
      },
      o365: {
        eventCount: 0,
        sources: [],
      },
      ical: {
        eventCount: 0,
        sources: [],
      },
    },
    errors,
  };

  // Check authentication
  const decoded = auth(req);
  if (!decoded) {
    errors.push("User not authenticated");
    return res.status(200).json(debugInfo);
  }

  debugInfo.user.authenticated = true;

  try {
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      errors.push("User not found in database");
      return res.status(200).json(debugInfo);
    }

    debugInfo.user.email = user.email;

    // Check Google account
    const googleAccount = user.accounts?.find(account => account.provider === 'google');
    debugInfo.user.hasGoogleAccount = !!googleAccount;
    debugInfo.user.googleTokenExists = !!googleAccount?.access_token;
    
    if (googleAccount?.expires_at) {
      const currentTime = Math.floor(Date.now() / 1000);
      debugInfo.user.googleTokenExpired = googleAccount.expires_at <= currentTime;
    }

    // Test user settings API
    try {
      const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings`, {
        headers: {
          Authorization: req.headers.authorization || "",
          Cookie: req.headers.cookie || "",
        },
      });
      
      debugInfo.apis.userSettingsStatus = userSettingsRes.status;
      
      if (userSettingsRes.ok) {
        const userSettings = await userSettingsRes.json();
        debugInfo.userSettings = {
          calendarSources: userSettings.calendarSources || [],
          powerAutomateUrl: userSettings.powerAutomateUrl || null,
          selectedCals: userSettings.selectedCals || [],
        };
      } else {
        errors.push(`User settings API returned status ${userSettingsRes.status}`);
      }
    } catch (error) {
      errors.push(`Error fetching user settings: ${error}`);
      debugInfo.apis.userSettingsStatus = 500;
    }

    // Test calendar list API
    if (debugInfo.user.googleTokenExists) {
      try {
        const calendarListRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/list`, {
          headers: {
            Authorization: req.headers.authorization || "",
            Cookie: req.headers.cookie || "",
          },
        });
        
        debugInfo.apis.calendarListStatus = calendarListRes.status;
        
        if (!calendarListRes.ok) {
          const errorText = await calendarListRes.text();
          errors.push(`Calendar list API error: ${calendarListRes.status} - ${errorText}`);
        }
      } catch (error) {
        errors.push(`Error testing calendar list API: ${error}`);
      }
    }

    // Test calendar events API
    try {
      const now = new Date();
      const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      
      const calendarEventsRes = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&useCalendarSources=true`,
        {
          headers: {
            Authorization: req.headers.authorization || "",
            Cookie: req.headers.cookie || "",
          },
        }
      );
      
      debugInfo.apis.calendarEventsStatus = calendarEventsRes.status;
      
      if (!calendarEventsRes.ok) {
        const errorText = await calendarEventsRes.text();
        errors.push(`Calendar events API error: ${calendarEventsRes.status} - ${errorText}`);
      }
    } catch (error) {
      errors.push(`Error testing calendar events API: ${error}`);
    }

    // Debug individual calendar sources
    await debugCalendarSources(debugInfo, user, errors);

  } catch (error) {
    errors.push(`Error in debug process: ${error}`);
  }

  // Environment checks
  if (!debugInfo.environment.googleClientId) {
    errors.push("Missing GOOGLE_CLIENT_ID or GOOGLE_OAUTH_ID environment variable");
  }
  if (!debugInfo.environment.googleClientSecret) {
    errors.push("Missing GOOGLE_CLIENT_SECRET or GOOGLE_OAUTH_SECRET environment variable");
  }
  if (!debugInfo.environment.nextAuthUrl) {
    errors.push("Missing NEXTAUTH_URL environment variable");
  }

  return res.status(200).json(debugInfo);
}