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
  try {
    // Disable caching to always return freshest data
    res.setHeader('Cache-Control', 'no-store');
    console.log('UserSettings API called, method:', req.method);
    
    const decoded = auth(req);
    if (!decoded) {
      console.log('Authentication failed in userSettings API');
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log('Auth successful, userId:', decoded.userId);
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      console.log('User not found for userId:', decoded.userId);
      return res.status(401).json({ error: "User not found" });
    }
    
    console.log('User found:', user.email);
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
        activeWidgets: (data.activeWidgets as string[]) || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        floCatStyle: data.floCatStyle as UserSettings['floCatStyle'] || "default",
        floCatPersonality: (data.floCatPersonality as string[]) || [],
        preferredName: data.preferredName || "",
        tags: (data.tags as string[]) || [],
        widgets: (data.widgets as string[]) || [],
        calendarSettings: (data.calendarSettings as any) || { calendars: [] },
        notificationSettings: (data.notificationSettings as any) || { subscribed: false },
      };

      console.log("User settings loaded for", user_email, settings);
      return res.status(200).json(settings);
    } catch (error) {
      console.error("Error fetching user settings for", user_email, error);
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  } catch (error) {
    console.error('Error in userSettings API:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}