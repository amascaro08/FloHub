import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

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
  errors: string[];
};

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