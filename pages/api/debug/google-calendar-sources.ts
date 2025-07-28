import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { accounts, userSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface GoogleCalendarDebugInfo {
  user: {
    id: number;
    email: string;
  };
  googleAccount: {
    exists: boolean;
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    tokenExpired: boolean;
    expiresAt?: number;
  };
  googleCalendars: {
    canFetch: boolean;
    calendars: any[];
    error?: string;
  };
  userSettings: {
    exists: boolean;
    calendarSourcesCount: number;
    googleSourcesCount: number;
    calendarSources: any[];
  };
  recommendations: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GoogleCalendarDebugInfo | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    const debugInfo: GoogleCalendarDebugInfo = {
      user: {
        id: user.id,
        email: user.email
      },
      googleAccount: {
        exists: false,
        hasAccessToken: false,
        hasRefreshToken: false,
        tokenExpired: false
      },
      googleCalendars: {
        canFetch: false,
        calendars: []
      },
      userSettings: {
        exists: false,
        calendarSourcesCount: 0,
        googleSourcesCount: 0,
        calendarSources: []
      },
      recommendations: []
    };

    // Check Google account in database
    const googleAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      ),
    });

    if (googleAccount) {
      debugInfo.googleAccount.exists = true;
      debugInfo.googleAccount.hasAccessToken = !!googleAccount.access_token;
      debugInfo.googleAccount.hasRefreshToken = !!googleAccount.refresh_token;
      debugInfo.googleAccount.expiresAt = googleAccount.expires_at || undefined;
      
      const currentTime = Math.floor(Date.now() / 1000);
      debugInfo.googleAccount.tokenExpired = !!(googleAccount.expires_at && googleAccount.expires_at <= currentTime);

      // Try to fetch Google calendars if we have a valid token
      if (googleAccount.access_token && !debugInfo.googleAccount.tokenExpired) {
        try {
          const calendarListRes = await fetch(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList",
            { 
              headers: { Authorization: `Bearer ${googleAccount.access_token}` },
              timeout: 10000 // 10 second timeout
            }
          );
          
          if (calendarListRes.ok) {
            const calendarList = await calendarListRes.json();
            debugInfo.googleCalendars.canFetch = true;
            debugInfo.googleCalendars.calendars = calendarList.items || [];
          } else {
            debugInfo.googleCalendars.error = `HTTP ${calendarListRes.status}: ${calendarListRes.statusText}`;
            const errorText = await calendarListRes.text();
            debugInfo.googleCalendars.error += ` - ${errorText}`;
          }
        } catch (error) {
          debugInfo.googleCalendars.error = error instanceof Error ? error.message : 'Unknown error';
        }
      } else {
        debugInfo.googleCalendars.error = debugInfo.googleAccount.tokenExpired ? 'Access token expired' : 'No access token';
      }
    }

    // Check user settings
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user.email),
    });

    if (settings) {
      debugInfo.userSettings.exists = true;
      const calendarSources = (settings.calendarSources as any[]) || [];
      debugInfo.userSettings.calendarSourcesCount = calendarSources.length;
      debugInfo.userSettings.calendarSources = calendarSources;
      debugInfo.userSettings.googleSourcesCount = calendarSources.filter(
        (source: any) => source.type === 'google'
      ).length;
    }

    // Generate recommendations
    if (!debugInfo.googleAccount.exists) {
      debugInfo.recommendations.push('Connect your Google account through Settings → Calendar → Add Google Calendar');
    } else if (!debugInfo.googleAccount.hasAccessToken) {
      debugInfo.recommendations.push('Re-authenticate your Google account - access token is missing');
    } else if (debugInfo.googleAccount.tokenExpired) {
      debugInfo.recommendations.push('Re-authenticate your Google account - access token has expired');
    } else if (!debugInfo.googleCalendars.canFetch) {
      debugInfo.recommendations.push(`Cannot fetch calendars from Google: ${debugInfo.googleCalendars.error}`);
    } else if (debugInfo.googleCalendars.calendars.length === 0) {
      debugInfo.recommendations.push('No calendars found in your Google account - create at least one calendar in Google Calendar');
    } else if (debugInfo.userSettings.googleSourcesCount === 0) {
      debugInfo.recommendations.push('Google calendars found but not saved as sources - try disconnecting and reconnecting your Google account');
    } else {
      debugInfo.recommendations.push('Google Calendar integration appears to be working correctly');
    }

    return res.status(200).json(debugInfo);

  } catch (error) {
    console.error('Google Calendar debug error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}