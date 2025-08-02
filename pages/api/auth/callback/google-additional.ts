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
    
    // CRITICAL: Get current authenticated user FIRST to prevent account mixing
    const decoded = auth(req);
    if (!decoded) {
      console.error('❌ No authenticated user found in callback - potential security issue');
      return res.status(401).json({ error: "No authenticated user session found" });
    }
    
    const currentUser = await getUserById(decoded.userId);
    if (!currentUser?.email) {
      console.error('❌ Authenticated user not found in database');
      return res.status(401).json({ error: "Authenticated user not found" });
    }
    
    console.log('✅ Current authenticated user:', currentUser.email);
    
    // Decode the state parameter to get user email and validate it matches current user
    let stateUserEmail = '';
    let isRefresh = false;
    if (state && typeof state === 'string') {
      try {
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        stateUserEmail = decodedState.email;
        isRefresh = decodedState.refresh || false;
        console.log('✅ State decoded, state email:', stateUserEmail, 'refresh:', isRefresh);
        
        // CRITICAL SECURITY CHECK: Ensure state email matches current authenticated user
        if (stateUserEmail && stateUserEmail !== currentUser.email) {
          console.error('❌ SECURITY VIOLATION: State email does not match authenticated user', {
            stateEmail: stateUserEmail,
            authenticatedEmail: currentUser.email
          });
          return res.status(403).json({ error: "State validation failed - account mismatch" });
        }
      } catch (e) {
        console.error('❌ Error decoding state:', e);
        // Continue with current user if state is invalid
      }
    } else {
      console.log('⚠️ No state parameter provided, using authenticated user');
    }

    // Use the authenticated user's email (most secure approach)
    const userEmail = currentUser.email;
    console.log('✅ Using authenticated user email for OAuth: [SANITIZED]');

    console.log('🔄 Exchanging authorization code for tokens...');
    // Exchange authorization code for tokens with matching redirect URI
    const tokens = await getGoogleTokens(code, requestOrigin);
    console.log('✅ Tokens received:', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token });
    
    if (!tokens.access_token) {
      console.error('❌ No access token received from Google');
      return res.status(400).json({ error: "Failed to get access token" });
    }

    console.log('🔍 Using authenticated user for OAuth completion: [SANITIZED]');
    // SECURITY: Use the authenticated user directly (no lookup by email from state)
    const user = currentUser;
    console.log('✅ Using authenticated user: [SANITIZED]');

    // Get Google user info to obtain the proper provider account ID
    console.log('🔍 Fetching Google user profile for proper account identification...');
    let googleUserInfo: any = null;
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      
      if (userInfoResponse.ok) {
        googleUserInfo = await userInfoResponse.json();
        console.log('✅ Google user info received:', {
          hasId: !!googleUserInfo.id,
          hasEmail: !!googleUserInfo.email,
          verified_email: googleUserInfo.verified_email
        });
      } else {
        console.error('❌ Failed to fetch Google user info:', userInfoResponse.status);
        // Continue without user info - will use fallback provider account ID
      }
    } catch (error) {
      console.error('❌ Error fetching Google user info:', error);
      // Continue without user info - will use fallback provider account ID
    }

    console.log('🔍 Checking for existing Google account for authenticated user...');
    // Store or update the Google account in the database - SCOPED TO AUTHENTICATED USER
    const googleAccountId = googleUserInfo?.id || 'google'; // Use Google user ID or fallback
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id), // Use authenticated user's ID
        eq(accounts.provider, 'google'),
        eq(accounts.providerAccountId, googleAccountId) // Also match by provider account ID
      ),
    });
    console.log('Existing account for authenticated user:', existingAccount ? 'Found' : 'Not found');

    if (existingAccount) {
      console.log('🔄 Updating existing Google account for authenticated user...');
      // Update existing account
      await db.update(accounts)
        .set({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || existingAccount.refresh_token,
          expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
          providerAccountId: googleAccountId, // Update provider account ID if we got new info
        })
        .where(and(
          eq(accounts.id, existingAccount.id),
          eq(accounts.userId, user.id) // Double-check user ID for security
        ));
      console.log('✅ Updated existing Google account for authenticated user');
    } else {
      console.log('🔄 Creating new Google account for authenticated user...');
      // Create new account - SCOPED TO AUTHENTICATED USER
      await db.insert(accounts).values({
        userId: user.id, // Use authenticated user's ID
        type: 'oauth',
        provider: 'google',
        providerAccountId: googleAccountId, // Use proper Google user ID
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in ? Math.floor(Date.now() / 1000) + tokens.expires_in : null,
      });
      console.log('✅ Created new Google account for authenticated user');
    }

    // Verify that the token was actually saved
    console.log('🔍 Verifying token storage...');
    const verifyAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.provider, 'google')
      ),
    });
    
    if (verifyAccount?.access_token) {
      console.log('✅ Access token verified in database:', {
        hasToken: !!verifyAccount.access_token,
        hasRefreshToken: !!verifyAccount.refresh_token,
        expiresAt: verifyAccount.expires_at,
        hasProviderAccountId: !!verifyAccount.providerAccountId
      });
    } else {
      console.error('❌ CRITICAL: Access token not found in database after save!');
      console.error('Database verification result: [SANITIZED - contains sensitive data]');
    }

    console.log('🔄 Fetching all available Google calendars for authenticated user...');
    // Fetch all available calendars and create sources for each
    try {
      const calendarListRes = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      
      let newGoogleSources: CalendarSource[] = [];
      
      if (calendarListRes.ok) {
        const calendarList = await calendarListRes.json();
        console.log('✅ Found', calendarList.items?.length || 0, 'Google calendars for authenticated user');
        
        if (calendarList.items && Array.isArray(calendarList.items)) {
          newGoogleSources = calendarList.items.map((calendar: any, index: number) => ({
            id: `google_${calendar.id}_${Date.now() + index}`,
            name: calendar.summary || calendar.id,
            type: "google" as const,
            sourceId: calendar.id,
            tags: calendar.id === "primary" ? ["personal"] : ["shared"],
            isEnabled: true,
          }));
          
          console.log('Created calendar sources for authenticated user:', newGoogleSources.map((s: CalendarSource) => `${s.name} (${s.sourceId})`));
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
    
          console.log('🔄 Updating user settings with Google Calendar sources for authenticated user...');
    // Update user settings with the new calendar sources - SCOPED TO AUTHENTICATED USER
    const baseUrl = requestOrigin || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    console.log('Making request to:', `${baseUrl}/api/userSettings`);
    
         // Enhanced resilience with retry logic to prevent OAuth/calendar source disconnect
     let updateSuccess = false;
     let finalAttempt = 0;
     const maxRetries = 3;
     
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       finalAttempt = attempt;
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}: Updating calendar sources...`);
        
        // Use authenticated session to update settings (more secure than passing cookies)
        const userSettingsRes = await fetch(`${baseUrl}/api/userSettings`, {
          headers: {
            Cookie: req.headers.cookie || "",
            'X-User-Email': userEmail, // Additional verification header
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout per attempt
        });
        
        if (!userSettingsRes.ok) {
          throw new Error(`Failed to fetch user settings: ${userSettingsRes.status} ${userSettingsRes.statusText}`);
        }
        
        const userSettings = await userSettingsRes.json();
        console.log('Current calendar sources for authenticated user:', userSettings.calendarSources?.length || 0);
        
        // Remove existing Google sources and add new ones - USER SCOPED
        const nonGoogleSources = userSettings.calendarSources?.filter((source: any) => source.type !== 'google') || [];
        const updatedSources = [...nonGoogleSources, ...newGoogleSources];
        
        console.log('Updating to', updatedSources.length, 'total calendar sources for authenticated user (', newGoogleSources.length, 'Google +', nonGoogleSources.length, 'others)');
        
        const updateRes = await fetch(`${baseUrl}/api/userSettings/update`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Cookie: req.headers.cookie || "",
            'X-User-Email': userEmail, // Additional verification header
          },
          body: JSON.stringify({
            ...userSettings,
            calendarSources: updatedSources,
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout per attempt
        });
        
        if (!updateRes.ok) {
          const errorText = await updateRes.text();
          throw new Error(`Failed to update user settings: ${updateRes.status} ${errorText}`);
        }
        
        console.log('✅ Successfully added', newGoogleSources.length, 'Google Calendar sources for authenticated user');
        
        // Enhanced verification logging
        console.log('🔍 Sources that should be saved:', newGoogleSources.map((s: CalendarSource) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          sourceId: s.sourceId,
          enabled: s.isEnabled
        })));
        
        // Verify the save by fetching settings again
        const verifyRes = await fetch(`${baseUrl}/api/userSettings`, {
          headers: {
            Cookie: req.headers.cookie || "",
            'X-User-Email': userEmail, // Additional verification header
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout for verification
        });
        
        if (verifyRes.ok) {
          const verifiedSettings = await verifyRes.json();
          console.log('✅ Verified calendar sources saved for authenticated user:', verifiedSettings.calendarSources?.length || 0);
          
          // Double-check that Google sources are present
          const googleSourcesInDb = verifiedSettings.calendarSources?.filter((source: any) => source.type === 'google') || [];
          console.log('✅ Google sources in database for authenticated user:', googleSourcesInDb.length);
          
          console.log('🔍 Actual sources in database:', googleSourcesInDb.map((s: CalendarSource) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            sourceId: s.sourceId,
            enabled: s.isEnabled
          })));
          
          if (googleSourcesInDb.length !== newGoogleSources.length) {
            console.error('❌ Mismatch in saved Google calendar sources for authenticated user!', {
              expected: newGoogleSources.length,
              actual: googleSourcesInDb.length,
              user: userEmail,
              expectedSources: newGoogleSources.map((s: CalendarSource) => s.name),
              actualSources: googleSourcesInDb.map((s: CalendarSource) => s.name)
            });
            
            // Don't fail the OAuth flow, but log the issue for monitoring
            console.log('⚠️ Calendar sources mismatch, but OAuth will continue. User can use "Refresh Sources" to fix this.');
          } else {
            console.log('✅ Calendar sources verification successful - all sources saved correctly!');
          }
          
          updateSuccess = true;
          break; // Success, exit retry loop
          
        } else {
          console.error('❌ Failed to verify settings save for authenticated user, but update may have succeeded');
          updateSuccess = true; // Assume success if update worked but verification failed
          break;
        }
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error('❌ All attempts failed to update calendar sources');
          // Don't fail the OAuth flow - user can manually refresh sources later
          console.log('⚠️ OAuth will continue without calendar sources. User can use "Refresh Sources" button to fix this.');
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          console.log(`⏳ Waiting ${attempt} second(s) before retry...`);
        }
      }
    }
    
              // Log completion stats for monitoring
     console.log('📊 OAuth completion stats:', {
       oauthCompleted: true,
       userEmail,
       sourcesAttempted: newGoogleSources.length,
       updateSuccess,
       attempts: finalAttempt,
       maxRetries,
       timestamp: new Date().toISOString()
     });
    } catch (settingsError) {
      console.error("❌ Error updating calendar settings for authenticated user:", settingsError);
      // Don't fail the whole flow if settings update fails
    }

    console.log('🎉 Google OAuth flow completed successfully for authenticated user:', userEmail);
    const successMessage = isRefresh ? 'calendars_refreshed' : 'google_connected';
    return res.redirect(`/dashboard/settings?tab=calendar&success=${successMessage}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect("/dashboard/settings?tab=calendar&error=oauth_failed");
  }
}
