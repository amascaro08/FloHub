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
      console.log("Querying user settings for email:", user_email);
      const data = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, user_email),
      });

      console.log("Raw user settings data from DB:", data);
      if (data) {
        console.log("activeWidgets from DB:", data.activeWidgets);
        console.log("activeWidgets type:", typeof data.activeWidgets);
        console.log("activeWidgets length:", Array.isArray(data.activeWidgets) ? data.activeWidgets.length : 'not an array');
      }

      if (!data) {
        const defaultSettings: UserSettings = {
          selectedCals: ["primary"],
          defaultView: "month",
          customRange: { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
          powerAutomateUrl: "",
          globalTags: [],
          activeWidgets: ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
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
          timezone: "UTC",
          floCatSettings: { enabledCapabilities: [] },
          layouts: {},
        };
        console.log("User settings not found for", user_email, "- returning default settings");
        return res.status(200).json(defaultSettings);
      }

      const settings: UserSettings = {
        selectedCals: (data.selectedCals as string[]) || [], // Ensure it's an array
        defaultView: data.defaultView as UserSettings['defaultView'] || "month",
        customRange: (data.customRange as any) || { start: "", end: "" }, // Ensure it's an object
        powerAutomateUrl: data.powerAutomateUrl || "",
        globalTags: (data.globalTags as string[]) || [],
        activeWidgets: (data.activeWidgets as string[]) && (data.activeWidgets as string[]).length > 0 
          ? (data.activeWidgets as string[]) 
          : ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        floCatStyle: data.floCatStyle as UserSettings['floCatStyle'] || "default",
        floCatPersonality: (data.floCatPersonality as string[]) || [],
        preferredName: data.preferredName || "",
        tags: (data.tags as string[]) || [],
        widgets: (data.widgets as string[]) || [],
        calendarSettings: (data.calendarSettings as any) || { calendars: [] },
        notificationSettings: (data.notificationSettings as any) || { subscribed: false },
        calendarSources: (data.calendarSources as any) || [],
        timezone: data.timezone || "UTC",
        floCatSettings: (data.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (data.layouts as any) || {},
      };

      console.log("User settings loaded for", user_email, "activeWidgets:", settings.activeWidgets);
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching user settings for", user_email, error);
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  } else if (req.method === "POST") {
    try {
      const defaultWidgets = ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"];
      
      // Update the user settings with default widgets
      await db.insert(userSettings).values({
        user_email: user_email,
        activeWidgets: defaultWidgets,
      }).onConflictDoUpdate({
        target: userSettings.user_email,
        set: { activeWidgets: defaultWidgets },
      });

      console.log("Updated user settings with default widgets for", user_email);
      return res.status(200).json({ message: "User settings updated with default widgets" });
    } catch (error) {
      console.error("Error updating user settings for", user_email, error);
      return res.status(500).json({ error: "Failed to update user settings" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}