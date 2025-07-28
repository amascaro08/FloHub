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
    'referer': req.headers['referer'],
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-forwarded-host': req.headers['x-forwarded-host'],
    'host': req.headers.host
  });
  
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    console.error('❌ Missing authorization code');
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    console.log('✅ Authorization code received');
    
    // Detect the request origin for proper redirect URI matching
    const protocol = req.headers['x-forwarded-proto'] || (req.connection as any)?.encrypted ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const requestOrigin = host ? `${protocol}://${host}` : undefined;
    
    console.log('Request origin detected for callback:', {
      protocol,
      host,
      requestOrigin
    });
    
    // Decode the state parameter to get user email and refresh flag
    let userEmail = '';
    let isRefresh = false;
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        userEmail = decodedState.email;
        isRefresh = decodedState.refresh || false;
        console.log('✅ State decoded, user email:', userEmail, 'refresh:', isRefresh);
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
    // Exchange authorization code for tokens with matching redirect URI
    const tokens = await getGoogleTokens(code, requestOrigin);
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

    console.log('🔄 Fetching all available Google calendars...');
    // Fetch all available calendars and create sources for each
    try {
      const calendarListRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      
      let newGoogleSources: CalendarSource[] = [];
      
      if (calendarListRes.ok) {
        const calendarList = await calendarListRes.json();
        console.log('✅ Found', calendarList.items?.length || 0, 'Google calendars');
        
        if (calendarList.items && Array.isArray(calendarList.items)) {
          newGoogleSources = calendarList.items.map((calendar: any, index: number) => ({
            id: `google_${calendar.id}_${Date.now() + index}`,
            name: calendar.summary || calendar.id,
            type: "google" as const,
            sourceId: calendar.id,
            tags: calendar.id === "primary" ? ["personal"] : ["shared"],
            isEnabled: true,
          }));
          
          console.log('Created calendar sources:', newGoogleSources.map(s => `${s.name} (${s.sourceId})`));
        }
      } else {
        console.warn('Failed to fetch calendar list, creating primary calendar source only');
        // Fallback to primary calendar only
        newGoogleSources = [{
          id: `google_primary_${Date.now()}`,
          name: "Google Calendar (Primary)",
          type: "google" as const,
          sourceId: "primary",
          tags: ["personal"],
          isEnabled: true,
        }];
      }
    
      console.log('🔄 Updating user settings with Google Calendar sources...');
      // Update user settings with the new calendar sources - use the detected origin
      const baseUrl = requestOrigin || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      console.log('Making request to:', `${baseUrl}/api/userSettings`);
      
      const userSettingsRes = await fetch(`${baseUrl}/api/userSettings`, {
        headers: {
          Cookie: req.headers.cookie || "",
        },
      });
      
      if (userSettingsRes.ok) {
        const userSettings = await userSettingsRes.json();
        console.log('Current calendar sources:', userSettings.calendarSources?.length || 0);
        
        // Remove existing Google sources and add new ones
        const nonGoogleSources = userSettings.calendarSources?.filter((source: any) => source.type !== 'google') || [];
        const updatedSources = [...nonGoogleSources, ...newGoogleSources];
        
        console.log('Updating to', updatedSources.length, 'total calendar sources (', newGoogleSources.length, 'Google +', nonGoogleSources.length, 'others)');
        
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
          console.log('✅ Successfully added', newGoogleSources.length, 'Google Calendar sources');
          
          // Verify the save by fetching settings again
          const verifyRes = await fetch(`${baseUrl}/api/userSettings`, {
            headers: {
              Cookie: req.headers.cookie || "",
            },
          });
          
          if (verifyRes.ok) {
            const verifiedSettings = await verifyRes.json();
            console.log('✅ Verified calendar sources saved:', verifiedSettings.calendarSources?.length || 0);
            
            // Double-check that Google sources are present
            const googleSourcesInDb = verifiedSettings.calendarSources?.filter((source: any) => source.type === 'google') || [];
            console.log('✅ Google sources in database:', googleSourcesInDb.length);
            
            if (googleSourcesInDb.length !== newGoogleSources.length) {
              console.error('❌ Mismatch in saved Google calendar sources!', {
                expected: newGoogleSources.length,
                actual: googleSourcesInDb.length
              });
            }
          } else {
            console.error('❌ Failed to verify settings save');
          }
        } else {
          const errorText = await updateRes.text();
          console.error('❌ Failed to update user settings:', updateRes.status, errorText);
        }
      } else {
        const errorText = await userSettingsRes.text();
        console.error('❌ Failed to fetch user settings:', userSettingsRes.status, errorText);
      }
    } catch (settingsError) {
      console.error("❌ Error updating calendar settings:", settingsError);
      // Don't fail the whole flow if settings update fails
    }

    console.log('🎉 Google OAuth flow completed successfully');
    const successMessage = isRefresh ? 'calendars_refreshed' : 'google_connected';
    return res.redirect(`/dashboard/settings?tab=calendar&success=${successMessage}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_failed");
  }
}
