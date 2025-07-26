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
          defaultCalendarView: "month",
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

      console.log("Raw data from database:", data);
      console.log("selectedCals from database:", data.selectedCals);
      console.log("selectedCals type:", typeof data.selectedCals);
      
      const settings: UserSettings = {
        selectedCals: (data.selectedCals as string[]) || [], // Ensure it's an array
        defaultView: data.defaultView as UserSettings['defaultView'] || "month",
        defaultCalendarView: (data.defaultCalendarView as 'day' | 'week' | 'month') || "month",
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
        calendarSources: (data.calendarSources as any) || [],
        timezone: data.timezone || "UTC",
        floCatSettings: (data.floCatSettings as any) || { enabledCapabilities: [] },
        layouts: (data.layouts as any) || {},
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
}