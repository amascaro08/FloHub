import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { query } from "@/lib/neon";
import { UserSettings } from "@/types/app";

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
    const userEmail = Array.isArray(userId) ? userId[0] : userId;

    if (!userEmail) {
      const user = await auth(req);
      if (!user?.email) {
        return res.status(401).json({ error: "Not signed in" });
      }
    }
    const newSettings: UserSettings = req.body;

    // Check if settings exist for the user
    const { rows: existingSettings } = await query(
      'SELECT * FROM user_settings WHERE user_email = $1',
      [userEmail]
    );

    if (existingSettings.length > 0) {
      // Update existing settings
      await query(
        `UPDATE user_settings SET
          selected_cals = $1,
          default_view = $2,
          custom_range = $3,
          power_automate_url = $4,
          global_tags = $5,
          active_widgets = $6,
          flo_cat_style = $7,
          flo_cat_personality = $8,
          preferred_name = $9,
          tags = $10,
          widgets = $11,
          calendar_settings = $12,
          notification_settings = $13,
          layouts = $14,
          calendar_sources = $15,
          timezone = $16,
          flo_cat_settings = $17
        WHERE user_email = $18`,
        [
          newSettings.selectedCals || [],
          newSettings.defaultView || 'month',
          newSettings.customRange || { start: '', end: '' },
          newSettings.powerAutomateUrl || '',
          newSettings.globalTags || [],
          newSettings.activeWidgets || [],
          newSettings.floCatStyle || 'default',
          newSettings.floCatPersonality || [],
          newSettings.preferredName || '',
          newSettings.tags || [],
          newSettings.widgets || [],
          newSettings.calendarSettings || { calendars: [] },
          newSettings.notificationSettings || { subscribed: false },
          newSettings.layouts || {},
          newSettings.calendarSources || [],
          newSettings.timezone || 'UTC',
          newSettings.floCatSettings || { enabledCapabilities: [] },
          userEmail,
        ]
      );
    } else {
      // Insert new settings
      await query(
        `INSERT INTO user_settings (user_email, selected_cals, default_view, custom_range, power_automate_url, global_tags, active_widgets, flo_cat_style, flo_cat_personality, preferred_name, tags, widgets, calendar_settings, notification_settings, layouts, calendar_sources, timezone, flo_cat_settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          userEmail,
          newSettings.selectedCals || [],
          newSettings.defaultView || 'month',
          newSettings.customRange || { start: '', end: '' },
          newSettings.powerAutomateUrl || '',
          newSettings.globalTags || [],
          newSettings.activeWidgets || [],
          newSettings.floCatStyle || 'default',
          newSettings.floCatPersonality || [],
          newSettings.preferredName || '',
          newSettings.tags || [],
          newSettings.widgets || [],
          newSettings.calendarSettings || { calendars: [] },
          newSettings.notificationSettings || { subscribed: false },
          newSettings.layouts || {},
          newSettings.calendarSources || [],
          newSettings.timezone || 'UTC',
          newSettings.floCatSettings || { enabledCapabilities: [] },
        ]
      );
    }

    return res.status(204).end();
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}