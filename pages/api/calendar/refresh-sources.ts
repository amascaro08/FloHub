import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { userSettings, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { CalendarSource } from "@/types/app";

/**
 * API endpoint to refresh Google Calendar sources
 * This fixes the common issue where OAuth succeeds but calendar sources are missing
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: "User not found" });
    }

    console.log(`🔄 Refreshing calendar sources for: [SANITIZED]`);

    // Find Google OAuth account - look for the most recent one with a valid token
    const googleAccounts = await db.query.accounts.findMany({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      ),
      orderBy: accounts.id // Get most recent first
    });

    console.log(`🔍 Found ${googleAccounts.length} Google account(s) for user [SANITIZED]`);
    
    // Find the first account with a valid access token
    const googleAccount = googleAccounts.find(account => account.access_token);
    
    if (!googleAccount) {
      console.log('❌ No Google accounts found or no accounts have access tokens');
      console.log('Available accounts:', googleAccounts.map(acc => ({
        id: acc.id,
        hasToken: !!acc.access_token,
        hasRefreshToken: !!acc.refresh_token,
        providerAccountId: acc.providerAccountId,
        expiresAt: acc.expires_at
      })));
      
      return res.status(400).json({ 
        error: "No Google account connected",
        action: "connect_google",
        message: "Please connect your Google Calendar first"
      });
    }

    console.log('✅ Using Google account:', {
      id: googleAccount.id,
      hasToken: !!googleAccount.access_token,
      hasRefreshToken: !!googleAccount.refresh_token,
      providerAccountId: googleAccount.providerAccountId,
      expiresAt: googleAccount.expires_at
    });

    if (!googleAccount.access_token) {
      return res.status(400).json({ 
        error: "No Google access token",
        action: "reconnect_google",
        message: "Please reconnect your Google Calendar"
      });
    }

    // Check if token is expired
    const isExpired = googleAccount.expires_at ? 
      googleAccount.expires_at <= Math.floor(Date.now() / 1000) : false;

    if (isExpired) {
      return res.status(400).json({ 
        error: "Google token expired",
        action: "reconnect_google",
        message: "Your Google Calendar connection has expired. Please reconnect."
      });
    }

          console.log(`✅ Valid Google token found for: [SANITIZED]`);

    // Fetch Google calendars
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${googleAccount.access_token}` } }
    );

    if (!calendarResponse.ok) {
      if (calendarResponse.status === 401) {
        return res.status(400).json({ 
          error: "Google token invalid",
          action: "reconnect_google",
          message: "Your Google Calendar token is invalid. Please reconnect."
        });
      }
      
      console.error('Google Calendar API error:', calendarResponse.status);
      return res.status(500).json({ 
        error: "Failed to fetch Google calendars",
        details: `API returned ${calendarResponse.status}`
      });
    }

    const calendarData = await calendarResponse.json();
    const calendars = calendarData.items || [];
    
    console.log(`📅 Found ${calendars.length} Google calendars`);

    if (calendars.length === 0) {
      return res.status(400).json({ 
        error: "No Google calendars found",
        message: "Your Google account doesn't have any calendars. Please create a calendar in Google Calendar first."
      });
    }

    // Get current user settings
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user.email),
    });

    // Create settings if they don't exist
    if (!settings) {
              console.log(`📝 Creating user settings for: [SANITIZED]`);
      await db.insert(userSettings).values({
        user_email: user.email,
        calendarSources: [],
        defaultView: 'month',
        globalTags: [],
        activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        floCatStyle: 'default',
        floCatPersonality: [],
        preferredName: '',
        tags: [],
        widgets: [],
        calendarSettings: { calendars: [] },
        notificationSettings: { subscribed: false },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        floCatSettings: { enabledCapabilities: [] },
        layouts: {},
        layoutTemplate: 'primary-secondary',
        slotAssignments: { primary: "calendar", secondary: "ataglance" },
      });
      
      settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user.email),
      });
    }

    // Process calendar sources
    const currentSources = settings?.calendarSources as CalendarSource[] || [];
    const currentGoogleSources = currentSources.filter(source => source.type === 'google');
    const nonGoogleSources = currentSources.filter(source => source.type !== 'google');

    console.log(`📊 Current sources: ${currentSources.length} total, ${currentGoogleSources.length} Google`);

    // Create new Google calendar sources
    const newGoogleSources: CalendarSource[] = calendars.map((calendar: any, index: number) => ({
      id: `google_${calendar.id}_${Date.now() + index}`,
      name: calendar.summary || calendar.id,
      type: "google" as const,
      sourceId: calendar.id,
      tags: calendar.id === "primary" ? ["personal"] : ["shared"],
      color: calendar.id === "primary" ? "#FF6B6B" : "#00C9A7", // Red for personal, teal for shared/work
      isEnabled: true,
    }));

    // Combine with existing non-Google sources
    const updatedSources = [...nonGoogleSources, ...newGoogleSources];

    console.log(`🔄 Updating calendar sources: ${updatedSources.length} total (${newGoogleSources.length} new Google sources)`);

    // Update user settings
    await db.update(userSettings)
      .set({
        calendarSources: updatedSources
      })
      .where(eq(userSettings.user_email, user.email));

    console.log(`✅ Successfully refreshed Google calendar sources for: [SANITIZED]`);

    // Verify the update
    const updatedSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user.email),
    });

    const verifiedSources = updatedSettings?.calendarSources as CalendarSource[] || [];
    const verifiedGoogleSources = verifiedSources.filter(source => source.type === 'google');

    return res.status(200).json({
      success: true,
      message: `Successfully refreshed Google Calendar sources`,
      data: {
        calendarsFound: calendars.length,
        sourcesCreated: newGoogleSources.length,
        totalSources: verifiedSources.length,
        googleSources: verifiedGoogleSources.length,
        calendarNames: newGoogleSources.map(s => s.name)
      }
    });

  } catch (error) {
    console.error('Error refreshing calendar sources:', error);
    return res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}