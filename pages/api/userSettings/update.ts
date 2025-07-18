import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
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
    let userEmail = Array.isArray(userId) ? userId[0] : userId;

    if (!userEmail) {
      const user = await auth(req);
      if (!user?.email) {
        return res.status(401).json({ error: "Not signed in" });
      }
      userEmail = user.email;
    }
    const newSettings: UserSettings = req.body;

    const settingsData = {
      selectedCals: newSettings.selectedCals || [],
      defaultView: newSettings.defaultView || 'month',
      customRange: newSettings.customRange || { start: '', end: '' },
      powerAutomateUrl: newSettings.powerAutomateUrl || '',
      globalTags: newSettings.globalTags || [],
      activeWidgets: newSettings.activeWidgets || [],
      floCatStyle: newSettings.floCatStyle || 'default',
      floCatPersonality: newSettings.floCatPersonality || [],
      preferredName: newSettings.preferredName || '',
      tags: newSettings.tags || [],
      widgets: newSettings.widgets || [],
      calendarSettings: newSettings.calendarSettings || { calendars: [] },
      notificationSettings: newSettings.notificationSettings || { subscribed: false },
      layouts: newSettings.layouts || {},
      calendarSources: newSettings.calendarSources || [],
      timezone: newSettings.timezone || 'UTC',
      floCatSettings: newSettings.floCatSettings || { enabledCapabilities: [] },
    };

    await db
      .insert(userSettings)
      .values({
        userEmail: userEmail as string,
        ...settingsData,
      })
      .onConflictDoUpdate({
        target: userSettings.userEmail,
        set: settingsData,
      });

    return res.status(204).end();
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}