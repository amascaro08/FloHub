import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "../../lib/auth";
import { getUserById } from "../../lib/user";
import { db } from "../../lib/drizzle";
import { userSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { UserSettings } from "../../types/app"; // Import UserSettings from typese

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSettings | ErrorRes>
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

  // Disable caching to always return freshest data
  res.setHeader('Cache-Control', 'no-store');
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: "User not found" });
  }
  const user_email = user.email;
  // Use a more general settings document instead of just "calendar"

  if (req.method === "GET") {
    try {
      const data = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email),
      });

      if (!data) {
        const defaultSettings: UserSettings = {
          selectedCals: ["primary"],
          defaultView: "month",
          customRange: { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
          powerAutomateUrl: "",
          globalTags: [],
          activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
          hiddenWidgets: [],
          floCatStyle: "default",
          floCatPersonality: [],
          preferredName: "",
          tags: [],
          widgets: [],
          calendarSettings: {
            calendars: [],
          },
          notificationSettings: {
            subscribed: false,
          },
          calendarSources: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          floCatSettings: { enabledCapabilities: [] },
          layouts: {},
          layoutTemplate: "primary-secondary",
          slotAssignments: {
            primary: "calendar",
            secondary: "ataglance"
          },
          // Journal settings defaults
          journalReminderEnabled: false,
          journalReminderTime: '20:00',
          journalPinProtection: false,
          journalPinHash: undefined,
          journalExportFormat: 'json',
          journalAutoSave: true,
          journalDailyPrompts: true,
          journalMoodTracking: true,
          journalActivityTracking: true,
          journalSleepTracking: true,
          journalWeeklyReflections: false,
          journalCustomActivities: [],
          journalDisabledActivities: [],
        };
        console.log("User settings not found for", user_email, "- returning default settings");
        return res.status(200).json(defaultSettings);
      }

      console.log("Raw data from database:", data);
      console.log("selectedCals from database:", data.selectedCals);
      console.log("selectedCals type:", typeof data.selectedCals);
      
      const settings: UserSettings = {
        selectedCals: (data.selectedCals as string[]) || [], // Ensure it's an array
        defaultView: data.defaultView as UserSettings['defaultView'] || "month",
        customRange: (data.customRange as any) || { start: "", end: "" }, // Ensure it's an object
        powerAutomateUrl: data.powerAutomateUrl || "",
        globalTags: (data.globalTags as string[]) || [],
        activeWidgets: (data.activeWidgets as string[]) || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        hiddenWidgets: (data.hiddenWidgets as string[]) || [],
        floCatStyle: data.floCatStyle as UserSettings['floCatStyle'] || "default",
        floCatPersonality: (data.floCatPersonality as string[]) || [],
        preferredName: data.preferredName || "",
        tags: (data.tags as string[]) || [],
        widgets: (data.widgets as string[]) || [],
        calendarSettings: (data.calendarSettings as any) || { calendars: [] },
        notificationSettings: (data.notificationSettings as any) || { subscribed: false },
        calendarSources: (data.calendarSources as any) || [],
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        floCatSettings: (data.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (data.layouts as any) || {},
        layoutTemplate: data.layoutTemplate || "primary-secondary",
        slotAssignments: (data.slotAssignments as any) || { primary: "calendar", secondary: "ataglance" },
        // Journal settings
        journalReminderEnabled: data.journalReminderEnabled ?? false,
        journalReminderTime: data.journalReminderTime || '20:00',
        journalPinProtection: data.journalPinProtection ?? false,
        journalPinHash: data.journalPinHash || undefined,
        journalExportFormat: (data.journalExportFormat as 'json' | 'csv') || 'json',
        journalAutoSave: data.journalAutoSave ?? true,
        journalDailyPrompts: data.journalDailyPrompts ?? true,
        journalMoodTracking: data.journalMoodTracking ?? true,
        journalActivityTracking: data.journalActivityTracking ?? true,
        journalSleepTracking: data.journalSleepTracking ?? true,
        journalWeeklyReflections: data.journalWeeklyReflections ?? false,
        journalCustomActivities: (data.journalCustomActivities as any) || [],
        journalDisabledActivities: (data.journalDisabledActivities as any) || [],
        // Notes settings
        notesGrouping: (data.notesGrouping as any) || 'month',
      };

      console.log("User settings loaded for", user_email, settings);
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching user settings for", user_email, error);
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  }

  // ── PUT/PATCH: update user settings ──────────────────────────────
  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const updates = req.body as Partial<UserSettings>;
      
      // Check if user settings exist
      const existingSettings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email),
      });

      let result;
      if (existingSettings) {
        // Update existing settings
        [result] = await db.update(userSettings)
          .set(updates)
          .where(eq(userSettings.user_email, user_email))
          .returning();
      } else {
        // Create new settings
        [result] = await db.insert(userSettings)
          .values({
            user_email,
            ...updates,
          })
          .returning();
      }

      // Return the updated settings in the same format as GET
      const updatedSettings: UserSettings = {
        selectedCals: (result.selectedCals as string[]) || [],
        defaultView: result.defaultView as UserSettings['defaultView'] || "month",
        customRange: (result.customRange as any) || { start: "", end: "" },
        powerAutomateUrl: result.powerAutomateUrl || "",
        globalTags: (result.globalTags as string[]) || [],
        activeWidgets: (result.activeWidgets as string[]) || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        hiddenWidgets: (result.hiddenWidgets as string[]) || [],
        floCatStyle: result.floCatStyle as UserSettings['floCatStyle'] || "default",
        floCatPersonality: (result.floCatPersonality as string[]) || [],
        preferredName: result.preferredName || "",
        tags: (result.tags as string[]) || [],
        widgets: (result.widgets as string[]) || [],
        calendarSettings: (result.calendarSettings as any) || { calendars: [] },
        notificationSettings: (result.notificationSettings as any) || { subscribed: false },
        calendarSources: (result.calendarSources as any) || [],
        timezone: result.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        floCatSettings: (result.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (result.layouts as any) || {},
        layoutTemplate: result.layoutTemplate || "primary-secondary",
        slotAssignments: (result.slotAssignments as any) || { primary: "calendar", secondary: "ataglance" },
        // Journal settings
        journalReminderEnabled: result.journalReminderEnabled ?? false,
        journalReminderTime: result.journalReminderTime || '20:00',
        journalPinProtection: result.journalPinProtection ?? false,
        journalPinHash: result.journalPinHash || undefined,
        journalExportFormat: (result.journalExportFormat as 'json' | 'csv') || 'json',
        journalAutoSave: result.journalAutoSave ?? true,
        journalDailyPrompts: result.journalDailyPrompts ?? true,
        journalMoodTracking: result.journalMoodTracking ?? true,
        journalActivityTracking: result.journalActivityTracking ?? true,
        journalSleepTracking: result.journalSleepTracking ?? true,
        journalWeeklyReflections: result.journalWeeklyReflections ?? false,
        journalCustomActivities: (result.journalCustomActivities as any) || [],
        journalDisabledActivities: (result.journalDisabledActivities as any) || [],
        // Notes settings
        notesGrouping: (result.notesGrouping as any) || 'month',
      };

      console.log("User settings updated for", user_email, updatedSettings);
      return res.status(200).json(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings for", user_email, error);
      return res.status(500).json({ error: "Failed to update user settings" });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH"]);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}