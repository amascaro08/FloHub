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
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // Decode the state parameter to get user email
    let userEmail = '';
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userEmail = decodedState.email;
      } catch (e) {
        console.error('Error decoding state:', e);
      }
    }

    // Get user from the request if state decoding failed
    if (!userEmail) {
      const decoded = auth(req);
      if (!decoded) {
        return res.status(401).json({ error: "Not signed in" });
      }
      const user = await getUserById(decoded.userId);
      if (!user?.email) {
        return res.status(401).json({ error: "User not found" });
      }
      userEmail = user.email;
    }

    // Exchange authorization code for tokens
    const tokens = await getGoogleTokens(code);
    
    if (!tokens.access_token) {
      console.error('No access token received from Google');
      return res.status(400).json({ error: "Failed to get access token" });
    }

    // Get user by email
    const user = await getUserById(userEmail);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Store or update the Google account in the database
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      ),
    });

    if (existingAccount) {
      // Update existing account
      await db.update(accounts)
        .set({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingAccount.refresh_token,
          expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
        })
        .where(eq(accounts.id, existingAccount.id));
    } else {
      // Create new account
      await db.insert(accounts).values({
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      });
    }

    // Create a new calendar source for Google Calendar
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
      const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings`, {
        headers: {
          Cookie: req.headers.cookie || "",
        },
      });
      
      if (userSettingsRes.ok) {
        const userSettings = await userSettingsRes.json();
        const updatedSources = userSettings.calendarSources 
          ? [...userSettings.calendarSources, newGoogleSource]
          : [newGoogleSource];
          
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings/update`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Cookie: req.headers.cookie || "",
          },
          body: JSON.stringify({
            ...userSettings,
            calendarSources: updatedSources,
          }),
        });
        
        console.log('Successfully added Google Calendar source');
      } else {
        console.error('Failed to fetch user settings:', userSettingsRes.status);
      }
    } catch (settingsError) {
      console.error("Error updating calendar settings:", settingsError);
      // Don't fail the whole flow if settings update fails
    }

    return res.redirect("/dashboard/settings?tab=calendar&success=google_connected");
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_failed");
  }
}
