import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "../../lib/neon";
import { UserSettings } from "../../types/app"; // Import UserSettings from types

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSettings | ErrorRes>
) {
  // Disable caching to always return freshest data
  res.setHeader('Cache-Control', 'no-store');
  const user = await auth(req);
  if (!user?.email) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const userEmail = user.email;
  // Use a more general settings document instead of just "calendar"

  if (req.method === "GET") {
    try {
      const { rows } = await query('SELECT * FROM user_settings WHERE user_email = $1', [userEmail]);

      if (rows.length === 0) {
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
        console.log("User settings not found for", userEmail, "- returning default settings");
        return res.status(200).json(defaultSettings);
      }

      const data = rows[0];
      const userSettings: UserSettings = {
        selectedCals: data.selected_cals || [], // Ensure it's an array
        defaultView: data.default_view || "month",
        customRange: data.custom_range || { start: "", end: "" }, // Ensure it's an object
        powerAutomateUrl: data.power_automate_url || "",
        globalTags: data.global_tags || [],
        activeWidgets: data.active_widgets || ["tasks", "calendar", "ataglance", "quicknote", "habit-tracker"],
        floCatStyle: data.flo_cat_style || "default",
        floCatPersonality: data.flo_cat_personality || [],
        preferredName: data.preferred_name || "",
        tags: data.tags || [],
        widgets: data.widgets || [],
        calendarSettings: data.calendar_settings || { calendars: [] },
        notificationSettings: data.notification_settings || { subscribed: false },
      };

      console.log("User settings loaded for", userEmail, userSettings);
      return res.status(200).json(userSettings);
    } catch (error) {
      console.error("Error fetching user settings for", userEmail, error);
      return res.status(500).json({ error: "Failed to fetch user settings" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}