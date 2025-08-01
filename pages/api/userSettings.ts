import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "../../lib/auth";
import { getUserById } from "../../lib/user";
import { db } from "../../lib/drizzle";
import { userSettings } from "../../db/schema";
import { eq } from "drizzle-orm";
import { UserSettings } from "../../types/app"; // Import UserSettings from typese
import { encryptUserSettingsFields, decryptUserSettingsFields } from "../../lib/contentSecurity";

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
      
      // Decrypt sensitive fields
      console.log("=== GET REQUEST DEBUG ===");
      console.log("Raw data from DB:", JSON.stringify(data, null, 2));
      const decryptedData = decryptUserSettingsFields(data);
      console.log("Raw journalCustomActivities from DB:", data.journalCustomActivities);
      console.log("Decrypted journalCustomActivities:", decryptedData.journalCustomActivities);
      console.log("Full decrypted data:", JSON.stringify(decryptedData, null, 2));
      
      // Ensure arrays are properly handled
      const ensureArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      
      const settings: UserSettings = {
        selectedCals: ensureArray(decryptedData.selectedCals),
        defaultView: decryptedData.defaultView as UserSettings['defaultView'] || "month",
        customRange: (decryptedData.customRange as any) || { start: "", end: "" },
        powerAutomateUrl: decryptedData.powerAutomateUrl || "",
        // PostgreSQL arrays come back as arrays, no special processing needed
        globalTags: Array.isArray(decryptedData.globalTags) ? decryptedData.globalTags : [],
        activeWidgets: ensureArray(decryptedData.activeWidgets) || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        hiddenWidgets: ensureArray(decryptedData.hiddenWidgets),
        floCatStyle: decryptedData.floCatStyle as UserSettings['floCatStyle'] || "default",
        // PostgreSQL arrays come back as arrays, no special processing needed
        floCatPersonality: Array.isArray(decryptedData.floCatPersonality) ? decryptedData.floCatPersonality : [],
        preferredName: decryptedData.preferredName || "",
        // PostgreSQL arrays come back as arrays, no special processing needed
        tags: Array.isArray(decryptedData.tags) ? decryptedData.tags : [],
        widgets: ensureArray(decryptedData.widgets),
        calendarSettings: (decryptedData.calendarSettings as any) || { calendars: [] },
        notificationSettings: (decryptedData.notificationSettings as any) || { subscribed: false },
        calendarSources: (decryptedData.calendarSources as any) || [],
        timezone: decryptedData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        floCatSettings: (decryptedData.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (decryptedData.layouts as any) || {},
        layoutTemplate: decryptedData.layoutTemplate || "primary-secondary",
        slotAssignments: (decryptedData.slotAssignments as any) || { primary: "calendar", secondary: "ataglance" },
        // Journal settings
        journalReminderEnabled: decryptedData.journalReminderEnabled ?? false,
        journalReminderTime: decryptedData.journalReminderTime || '20:00',
        journalPinProtection: decryptedData.journalPinProtection ?? false,
        journalPinHash: decryptedData.journalPinHash || undefined,
        journalExportFormat: (decryptedData.journalExportFormat as 'json' | 'csv') || 'json',
        journalAutoSave: decryptedData.journalAutoSave ?? true,
        journalDailyPrompts: decryptedData.journalDailyPrompts ?? true,
        journalMoodTracking: decryptedData.journalMoodTracking ?? true,
        journalActivityTracking: decryptedData.journalActivityTracking ?? true,
        journalSleepTracking: decryptedData.journalSleepTracking ?? true,
        journalWeeklyReflections: decryptedData.journalWeeklyReflections ?? false,
        journalCustomActivities: (decryptedData.journalCustomActivities as any) || [],
        journalDisabledActivities: (decryptedData.journalDisabledActivities as any) || [],
        // Notes settings
        notesGrouping: (decryptedData.notesGrouping as any) || 'month',
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

      // Encrypt sensitive fields before saving
      console.log("=== PUT/PATCH REQUEST DEBUG ===");
      console.log("Updates received:", JSON.stringify(updates, null, 2));
      const encryptedUpdates = encryptUserSettingsFields(updates);
      console.log("Encrypted updates:", JSON.stringify(encryptedUpdates, null, 2));

      // Prepare updates with proper timezone handling
      const preparedUpdates = {
        ...encryptedUpdates,
        // Ensure timezone is never null due to NOT NULL constraint
        timezone: updates.timezone || existingSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      let result;
      if (existingSettings) {
        // Update existing settings
        [result] = await db.update(userSettings)
          .set(preparedUpdates)
          .where(eq(userSettings.user_email, user_email))
          .returning();
      } else {
        // Create new settings
        [result] = await db.insert(userSettings)
          .values({
            user_email,
            ...preparedUpdates,
          })
          .returning();
      }

      // Decrypt the result for the response
      const decryptedResult = decryptUserSettingsFields(result);

      // Ensure arrays are properly handled
      const ensureArray = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };
      
      // Return the updated settings in the same format as GET
      const updatedSettings: UserSettings = {
        selectedCals: ensureArray(decryptedResult.selectedCals),
        defaultView: decryptedResult.defaultView as UserSettings['defaultView'] || "month",
        customRange: (decryptedResult.customRange as any) || { start: "", end: "" },
        powerAutomateUrl: decryptedResult.powerAutomateUrl || "",
        // PostgreSQL arrays come back as arrays, no special processing needed
        globalTags: Array.isArray(decryptedResult.globalTags) ? decryptedResult.globalTags : [],
        activeWidgets: ensureArray(decryptedResult.activeWidgets) || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        hiddenWidgets: ensureArray(decryptedResult.hiddenWidgets),
        floCatStyle: decryptedResult.floCatStyle as UserSettings['floCatStyle'] || "default",
        // PostgreSQL arrays come back as arrays, no special processing needed
        floCatPersonality: Array.isArray(decryptedResult.floCatPersonality) ? decryptedResult.floCatPersonality : [],
        preferredName: decryptedResult.preferredName || "",
        // PostgreSQL arrays come back as arrays, no special processing needed
        tags: Array.isArray(decryptedResult.tags) ? decryptedResult.tags : [],
        widgets: ensureArray(decryptedResult.widgets),
        calendarSettings: (decryptedResult.calendarSettings as any) || { calendars: [] },
        notificationSettings: (decryptedResult.notificationSettings as any) || { subscribed: false },
        calendarSources: (decryptedResult.calendarSources as any) || [],
        timezone: decryptedResult.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        floCatSettings: (decryptedResult.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (decryptedResult.layouts as any) || {},
        layoutTemplate: decryptedResult.layoutTemplate || "primary-secondary",
        slotAssignments: (decryptedResult.slotAssignments as any) || { primary: "calendar", secondary: "ataglance" },
        // Journal settings
        journalReminderEnabled: decryptedResult.journalReminderEnabled ?? false,
        journalReminderTime: decryptedResult.journalReminderTime || '20:00',
        journalPinProtection: decryptedResult.journalPinProtection ?? false,
        journalPinHash: decryptedResult.journalPinHash || undefined,
        journalExportFormat: (decryptedResult.journalExportFormat as 'json' | 'csv') || 'json',
        journalAutoSave: decryptedResult.journalAutoSave ?? true,
        journalDailyPrompts: decryptedResult.journalDailyPrompts ?? true,
        journalMoodTracking: decryptedResult.journalMoodTracking ?? true,
        journalActivityTracking: decryptedResult.journalActivityTracking ?? true,
        journalSleepTracking: decryptedResult.journalSleepTracking ?? true,
        journalWeeklyReflections: decryptedResult.journalWeeklyReflections ?? false,
        journalCustomActivities: (decryptedResult.journalCustomActivities as any) || [],
        journalDisabledActivities: (decryptedResult.journalDisabledActivities as any) || [],
        // Notes settings
        notesGrouping: (decryptedResult.notesGrouping as any) || 'month',
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