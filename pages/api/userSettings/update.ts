import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { userSettings } from "@/db/schema";
import { UserSettings } from "@/types/app";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userId } = req.query;
    let user_email = Array.isArray(userId) ? userId[0] : userId;

    if (!user_email) {
      const decoded = auth(req);
      if (!decoded) {
        return res.status(401).json({ error: "Not signed in" });
      }
      const user = await getUserById(decoded.userId);
      if (!user?.email) {
        return res.status(401).json({ error: "User not found" });
      }
      user_email = user.email;
    }
    
    const newSettings: UserSettings = req.body;
    console.log('📥 Settings data received:', {
      hasCalendarSources: !!newSettings.calendarSources,
      calendarSourcesCount: newSettings.calendarSources?.length || 0,
      calendarSourceTypes: newSettings.calendarSources?.map(s => s.type) || []
    });

    // Get existing settings to preserve calendar sources if needed
    let existingCalendarSources: any[] = [];
    try {
      const existingData = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email as string),
      });
      existingCalendarSources = (existingData?.calendarSources as any[]) || [];
      console.log('📋 Existing calendar sources count:', existingCalendarSources.length);
    } catch (error) {
      console.log('📋 No existing settings found, starting fresh');
    }

    // Safeguard: Don't accidentally clear calendar sources
    let finalCalendarSources = newSettings.calendarSources || [];
    if (finalCalendarSources.length === 0 && existingCalendarSources.length > 0) {
      // If we're trying to set empty sources but had existing ones, preserve the existing ones
      // unless this is an explicit deletion (check if calendarSources was explicitly set to [])
      if (newSettings.calendarSources === undefined) {
        console.log('🛡️ Preserving existing calendar sources (update did not include calendarSources)');
        finalCalendarSources = existingCalendarSources;
      } else {
        console.log('⚠️ Explicitly clearing calendar sources');
      }
    }

    const settingsData: Partial<UserSettings> = {
      defaultView: newSettings.defaultView || 'month',
      powerAutomateUrl: newSettings.powerAutomateUrl || undefined,
      selectedCals: newSettings.selectedCals || [],
      globalTags: newSettings.globalTags || [],
      activeWidgets: newSettings.activeWidgets || [],
      hiddenWidgets: newSettings.hiddenWidgets || [],
      floCatStyle: newSettings.floCatStyle || 'default',
      floCatPersonality: newSettings.floCatPersonality || [],
      preferredName: newSettings.preferredName || '',
      tags: newSettings.tags || [],
      widgets: newSettings.widgets || [],
      calendarSettings: newSettings.calendarSettings || { calendars: [] },
      notificationSettings: newSettings.notificationSettings || { subscribed: false },
      layouts: newSettings.layouts || {},
      layoutTemplate: newSettings.layoutTemplate || undefined,
      slotAssignments: newSettings.slotAssignments || undefined,
      calendarSources: finalCalendarSources,
      timezone: newSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      floCatSettings: newSettings.floCatSettings || { enabledCapabilities: [] },
    };

    console.log('📝 Prepared calendar sources for database:', settingsData.calendarSources?.length || 0);

    const result = await db
      .insert(userSettings)
      .values({
        user_email: user_email as string,
        ...settingsData,
      })
      .onConflictDoUpdate({
        target: userSettings.user_email,
        set: settingsData,
      });

    console.log('✅ Settings update completed for:', user_email);
    console.log('✅ Database operation result:', result);

    // Verify the save by reading back the data
    const savedData = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, user_email as string),
    });
    
    if (savedData) {
      const savedCalendarSources = savedData.calendarSources as any[];
      console.log('✅ Verification: Calendar sources in database:', savedCalendarSources?.length || 0);
      
      if ((settingsData.calendarSources?.length || 0) !== (savedCalendarSources?.length || 0)) {
        console.error('❌ Calendar sources count mismatch!', {
          expected: settingsData.calendarSources?.length || 0,
          actual: savedCalendarSources?.length || 0
        });
      }
    } else {
      console.error('❌ Could not verify settings save - data not found');
    }

    return res.status(204).end();
  } catch (error) {
    console.error("Error updating user settings:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
}