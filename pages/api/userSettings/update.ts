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
      timezone: newSettings.timezone,
      globalTags: newSettings.globalTags,
      tags: newSettings.tags,
      hasCalendarSources: !!newSettings.calendarSources,
      calendarSourcesCount: newSettings.calendarSources?.length || 0,
      calendarSourceTypes: newSettings.calendarSources?.map(s => s.type) || []
    });

    // This will be handled later when we get existing settings for merge

    // Get existing settings first for proper merging

    // Get existing settings to preserve data and ensure proper handling
    let existingSettings: any = {};
    try {
      const existing = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email as string),
      });
      existingSettings = existing || {};
      console.log('📋 Existing settings loaded for merge');
    } catch (error) {
      console.log('📋 No existing settings found, using defaults');
    }

    const settingsData: any = {
      defaultView: newSettings.defaultView || existingSettings.defaultView || 'month',
      powerAutomateUrl: newSettings.powerAutomateUrl !== undefined ? newSettings.powerAutomateUrl : existingSettings.powerAutomateUrl,
      selectedCals: newSettings.selectedCals !== undefined ? newSettings.selectedCals : (existingSettings.selectedCals || []),
      globalTags: newSettings.globalTags !== undefined ? newSettings.globalTags : (existingSettings.globalTags || []),
      activeWidgets: newSettings.activeWidgets !== undefined ? newSettings.activeWidgets : (existingSettings.activeWidgets || []),
      hiddenWidgets: newSettings.hiddenWidgets !== undefined ? newSettings.hiddenWidgets : (existingSettings.hiddenWidgets || []),
      floCatStyle: newSettings.floCatStyle || existingSettings.floCatStyle || 'default',
      floCatPersonality: newSettings.floCatPersonality !== undefined ? newSettings.floCatPersonality : (existingSettings.floCatPersonality || []),
      preferredName: newSettings.preferredName !== undefined ? newSettings.preferredName : existingSettings.preferredName,
      tags: newSettings.tags !== undefined ? newSettings.tags : (existingSettings.tags || []),
      widgets: newSettings.widgets !== undefined ? newSettings.widgets : (existingSettings.widgets || []),
      calendarSettings: newSettings.calendarSettings !== undefined ? newSettings.calendarSettings : (existingSettings.calendarSettings || { calendars: [] }),
      notificationSettings: newSettings.notificationSettings !== undefined ? newSettings.notificationSettings : (existingSettings.notificationSettings || { subscribed: false }),
      layouts: newSettings.layouts !== undefined ? newSettings.layouts : (existingSettings.layouts || {}),
      layoutTemplate: newSettings.layoutTemplate !== undefined ? newSettings.layoutTemplate : existingSettings.layoutTemplate,
      slotAssignments: newSettings.slotAssignments !== undefined ? newSettings.slotAssignments : existingSettings.slotAssignments,
      calendarSources: newSettings.calendarSources !== undefined ? newSettings.calendarSources : (existingSettings.calendarSources || []),
      // Ensure timezone is never null due to NOT NULL constraint
      timezone: newSettings.timezone || existingSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      floCatSettings: newSettings.floCatSettings !== undefined ? newSettings.floCatSettings : (existingSettings.floCatSettings || { enabledCapabilities: [] }),
      customRange: newSettings.customRange !== undefined ? newSettings.customRange : existingSettings.customRange,
      // Journal settings
      journalReminderEnabled: newSettings.journalReminderEnabled !== undefined ? newSettings.journalReminderEnabled : existingSettings.journalReminderEnabled,
      journalReminderTime: newSettings.journalReminderTime !== undefined ? newSettings.journalReminderTime : existingSettings.journalReminderTime,
      journalPinProtection: newSettings.journalPinProtection !== undefined ? newSettings.journalPinProtection : existingSettings.journalPinProtection,
      journalPinHash: newSettings.journalPinHash !== undefined ? newSettings.journalPinHash : existingSettings.journalPinHash,
      journalExportFormat: newSettings.journalExportFormat !== undefined ? newSettings.journalExportFormat : existingSettings.journalExportFormat,
      journalAutoSave: newSettings.journalAutoSave !== undefined ? newSettings.journalAutoSave : existingSettings.journalAutoSave,
      journalDailyPrompts: newSettings.journalDailyPrompts !== undefined ? newSettings.journalDailyPrompts : existingSettings.journalDailyPrompts,
      journalMoodTracking: newSettings.journalMoodTracking !== undefined ? newSettings.journalMoodTracking : existingSettings.journalMoodTracking,
      journalActivityTracking: newSettings.journalActivityTracking !== undefined ? newSettings.journalActivityTracking : existingSettings.journalActivityTracking,
      journalSleepTracking: newSettings.journalSleepTracking !== undefined ? newSettings.journalSleepTracking : existingSettings.journalSleepTracking,
      journalWeeklyReflections: newSettings.journalWeeklyReflections !== undefined ? newSettings.journalWeeklyReflections : existingSettings.journalWeeklyReflections,
      journalCustomActivities: newSettings.journalCustomActivities !== undefined ? newSettings.journalCustomActivities : existingSettings.journalCustomActivities,
      journalDisabledActivities: newSettings.journalDisabledActivities !== undefined ? newSettings.journalDisabledActivities : existingSettings.journalDisabledActivities,
      notesGrouping: newSettings.notesGrouping !== undefined ? newSettings.notesGrouping : existingSettings.notesGrouping,
    };

    console.log('📝 Prepared settings for database:', {
      timezone: settingsData.timezone,
      globalTagsLength: settingsData.globalTags?.length || 0,
      tagsLength: settingsData.tags?.length || 0,
      calendarSourcesLength: settingsData.calendarSources?.length || 0
    });

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
      const savedGlobalTags = savedData.globalTags as string[];
      const savedTags = savedData.tags as string[];
      
      console.log('✅ Verification: Settings in database:', {
        timezone: savedData.timezone,
        globalTagsLength: savedGlobalTags?.length || 0,
        tagsLength: savedTags?.length || 0,
        calendarSourcesLength: savedCalendarSources?.length || 0
      });
      
      // Check for mismatches
      if (settingsData.timezone !== savedData.timezone) {
        console.error('❌ Timezone mismatch!', {
          expected: settingsData.timezone,
          actual: savedData.timezone
        });
      }
      if ((settingsData.globalTags?.length || 0) !== (savedGlobalTags?.length || 0)) {
        console.error('❌ Global tags count mismatch!', {
          expected: settingsData.globalTags?.length || 0,
          actual: savedGlobalTags?.length || 0,
          expectedTags: settingsData.globalTags,
          actualTags: savedGlobalTags
        });
      }
      if ((settingsData.tags?.length || 0) !== (savedTags?.length || 0)) {
        console.error('❌ Tags count mismatch!', {
          expected: settingsData.tags?.length || 0,
          actual: savedTags?.length || 0,
          expectedTags: settingsData.tags,
          actualTags: savedTags
        });
      }
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