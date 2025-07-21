import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleTokens } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { CalendarSource } from "@/types/app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... existing code ...

  try {
    // ... existing OAuth logic ...

    // Move the calendar source creation here, BEFORE the redirect
    const newGoogleSource: CalendarSource = {
      id: `google_${Date.now()}`,
      name: "Google Calendar", 
      type: "google",
      sourceId: "primary",
      tags: ["personal"],
      isEnabled: true,
    };
    
    // Update user settings with the new calendar source
    try {
      const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL}/api/userSettings`);
      if (userSettingsRes.ok) {
        const userSettings = await userSettingsRes.json();
        const updatedSources = userSettings.calendarSources 
          ? [...userSettings.calendarSources, newGoogleSource]
          : [newGoogleSource];
          
        await fetch(`${process.env.NEXTAUTH_URL}/api/userSettings/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...userSettings,
            calendarSources: updatedSources,
          }),
        });
      }
    } catch (settingsError) {
      console.error("Error updating calendar settings:", settingsError);
      // Don't fail the whole flow if settings update fails
    }

    return res.redirect("/dashboard/settings?tab=calendar&success=google_connected");
  } catch (error) {
    // ... error handling ...
  }
}

// Remove any code that exists here - everything should be inside the handler function
