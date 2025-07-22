import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleTokens } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";
import { getUserById, getUserByEmail } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { CalendarSource } from "@/types/app";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('🔥🔥🔥 GOOGLE OAUTH CALLBACK REACHED 🔥🔥🔥');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query params:', req.query);
  console.log('Headers:', {
    'user-agent': req.headers['user-agent'],
    'referer': req.headers['referer']
  });
  
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    console.error('❌ Missing authorization code');
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    console.log('✅ Authorization code received');
    
    // Decode the state parameter to get user email
    let userEmail = '';
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userEmail = decodedState.email;
        console.log('✅ State decoded, user email:', userEmail);
      } catch (e) {
        console.error('❌ Error decoding state:', e);
      }
    } else {
      console.log('⚠️ No state parameter provided');
    }

    // Get user from the request if state decoding failed
    if (!userEmail) {
      console.log('⚠️ No user email from state, trying auth token');
      const decoded = auth(req);
      if (!decoded) {
        console.error('❌ Not signed in');
        return res.status(401).json({ error: "Not signed in" });
      }
      const user = await getUserById(decoded.userId);
      if (!user?.email) {
        console.error('❌ User not found');
        return res.status(401).json({ error: "User not found" });
      }
      userEmail = user.email;
      console.log('✅ Got user email from auth token:', userEmail);
    }

    console.log('🔄 Exchanging authorization code for tokens...');
    // Exchange authorization code for tokens
    const tokens = await getGoogleTokens(code);
    console.log('✅ Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });
    
    if (!tokens.access_token) {
      console.error('❌ No access token received from Google');
      return res.status(400).json({ error: "Failed to get access token" });
    }

    console.log('🔍 Looking up user by email:', userEmail);
    // Get user by email
    const user = await getUserByEmail(userEmail);
    if (!user) {
      console.error('❌ User not found by email:', userEmail);
      return res.status(404).json({ error: "User not found" });
    }
    console.log('✅ User found:', user.id);

    console.log('🔍 Checking for existing Google account...');
    // Store or update the Google account in the database
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      ),
    });
    console.log('Existing account:', existingAccount ? 'Found' : 'Not found');

    if (existingAccount) {
      console.log('🔄 Updating existing Google account...');
      // Update existing account
      await db.update(accounts)
        .set({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingAccount.refresh_token,
          expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
        })
        .where(eq(accounts.id, existingAccount.id));
      console.log('✅ Updated existing Google account');
    } else {
      console.log('🔄 Creating new Google account...');
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
      console.log('✅ Created new Google account');
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
    
    console.log('🔄 Updating user settings with Google Calendar source...');
    // Update user settings with the new calendar source
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      console.log('Making request to:', `${baseUrl}/api/userSettings`);
      
      const userSettingsRes = await fetch(`${baseUrl}/api/userSettings`, {
        headers: {
          Cookie: req.headers.cookie || "",
        },
      });
      
      if (userSettingsRes.ok) {
        const userSettings = await userSettingsRes.json();
        console.log('Current calendar sources:', userSettings.calendarSources?.length || 0);
        
        // Check if Google source already exists
        const existingGoogleSource = userSettings.calendarSources?.find((source: any) => source.type === 'google');
        if (existingGoogleSource) {
          console.log('✅ Google Calendar source already exists, skipping addition');
        } else {
          const updatedSources = userSettings.calendarSources 
            ? [...userSettings.calendarSources, newGoogleSource]
            : [newGoogleSource];
            
          const updateRes = await fetch(`${baseUrl}/api/userSettings/update`, {
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
          
          if (updateRes.ok) {
            console.log('✅ Successfully added Google Calendar source');
          } else {
            console.error('❌ Failed to update user settings:', updateRes.status);
          }
        }
      } else {
        console.error('❌ Failed to fetch user settings:', userSettingsRes.status);
      }
    } catch (settingsError) {
      console.error("❌ Error updating calendar settings:", settingsError);
      // Don't fail the whole flow if settings update fails
    }

    console.log('🎉 Google OAuth flow completed successfully');
    return res.redirect("/dashboard/settings?tab=calendar&success=google_connected");
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_failed");
  }
}
