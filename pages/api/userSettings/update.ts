import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

import { userSettings } from "@/db/schema";
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
        user_email: user_email as string,
        ...settingsData,
      })
      .onConflictDoUpdate({
        target: userSettings.user_email,
        set: settingsData,
      });

    return res.status(204).end();
  } catch (error: any) {
    console.error("Error updating user settings:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}