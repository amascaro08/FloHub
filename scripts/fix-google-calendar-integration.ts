import { db } from '../lib/drizzle';
import { accounts, users, userSettings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Comprehensive script to diagnose and fix Google Calendar integration issues
 * This script addresses the common issue where OAuth succeeds but calendar sources are missing
 */

interface FixOptions {
  userEmail: string;
  diagnosticOnly?: boolean; // If true, only diagnose without fixing
  forceRefresh?: boolean; // If true, recreate all Google calendar sources
  testConnection?: boolean; // If true, test the Google API connection
}

interface DiagnosticResult {
  userExists: boolean;
  hasGoogleAccount: boolean;
  googleAccountDetails?: any;
  hasCalendarSources: boolean;
  calendarSourcesCount: number;
  googleCalendarSourcesCount: number;
  tokenValid?: boolean;
  apiAccessible?: boolean;
  errors: string[];
  recommendations: string[];
}

async function diagnoseUserCalendarIntegration(userEmail: string): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    userExists: false,
    hasGoogleAccount: false,
    hasCalendarSources: false,
    calendarSourcesCount: 0,
    googleCalendarSourcesCount: 0,
    errors: [],
    recommendations: []
  };

  console.log(`🔍 Diagnosing calendar integration for: ${userEmail}`);

  try {
    // 1. Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      with: {
        accounts: true
      }
    });

    if (!user) {
      result.errors.push('User not found in database');
      result.recommendations.push('Verify the email address is correct');
      return result;
    }

    result.userExists = true;
    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    // 2. Check Google OAuth account
    const googleAccount = user.accounts?.find(account => account.provider === 'google');
    
    if (!googleAccount) {
      result.errors.push('No Google OAuth account found');
      result.recommendations.push('User needs to complete Google OAuth flow');
      result.recommendations.push('Go to Settings > Calendar > Add Google Calendar');
      return result;
    }

    result.hasGoogleAccount = true;
    result.googleAccountDetails = {
      id: googleAccount.id,
      provider: googleAccount.provider,
      hasAccessToken: !!googleAccount.access_token,
      hasRefreshToken: !!googleAccount.refresh_token,
      expiresAt: googleAccount.expires_at,
      isExpired: googleAccount.expires_at ? googleAccount.expires_at <= Math.floor(Date.now() / 1000) : null
    };

    console.log(`✅ Google account found:`, result.googleAccountDetails);

    // 3. Check token validity
    if (!googleAccount.access_token) {
      result.errors.push('Google access token missing');
      result.recommendations.push('Re-authenticate with Google Calendar');
    } else if (result.googleAccountDetails.isExpired && !googleAccount.refresh_token) {
      result.errors.push('Google token expired and no refresh token available');
      result.recommendations.push('Re-authenticate with Google Calendar');
    }

    // 4. Test API connection if we have a token
    if (googleAccount.access_token && !result.googleAccountDetails.isExpired) {
      try {
        const apiResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/users/me/calendarList",
          { headers: { Authorization: `Bearer ${googleAccount.access_token}` } }
        );
        
        if (apiResponse.ok) {
          result.apiAccessible = true;
          result.tokenValid = true;
          console.log(`✅ Google API accessible`);
        } else if (apiResponse.status === 401) {
          result.tokenValid = false;
          result.errors.push('Google token invalid or expired');
          result.recommendations.push('Re-authenticate with Google Calendar');
        } else {
          result.errors.push(`Google API error: ${apiResponse.status}`);
        }
      } catch (error) {
        result.errors.push(`Failed to test Google API: ${error}`);
      }
    }

    // 5. Check user settings for calendar sources
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, userEmail),
    });

    if (!settings) {
      result.errors.push('No user settings found');
      result.recommendations.push('User settings need to be initialized');
      return result;
    }

    const calendarSources = settings.calendarSources as any[] || [];
    result.hasCalendarSources = calendarSources.length > 0;
    result.calendarSourcesCount = calendarSources.length;
    
    const googleSources = calendarSources.filter(source => source.type === 'google');
    result.googleCalendarSourcesCount = googleSources.length;

    console.log(`📊 Calendar sources: ${result.calendarSourcesCount} total, ${result.googleCalendarSourcesCount} Google`);

    // 6. Generate recommendations
    if (result.hasGoogleAccount && result.tokenValid && result.googleCalendarSourcesCount === 0) {
      result.errors.push('Google account connected but no calendar sources found');
      result.recommendations.push('Calendar sources need to be created from Google calendars');
      result.recommendations.push('This is the most common issue - OAuth succeeds but source creation fails');
    }

    if (result.hasGoogleAccount && !result.tokenValid) {
      result.recommendations.push('Google token needs refresh or re-authentication');
    }

    if (result.googleCalendarSourcesCount > 0) {
      console.log(`✅ Google calendar sources found:`, googleSources.map(s => s.name));
    }

  } catch (error) {
    result.errors.push(`Diagnostic error: ${error}`);
  }

  return result;
}

async function fixGoogleCalendarIntegration(userEmail: string, forceRefresh: boolean = false): Promise<boolean> {
  console.log(`🔧 Fixing Google Calendar integration for: ${userEmail}`);

  try {
    // Get user and Google account
    const user = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
      with: {
        accounts: true
      }
    });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      return false;
    }

    const googleAccount = user.accounts?.find(account => account.provider === 'google');
    if (!googleAccount || !googleAccount.access_token) {
      console.error(`❌ No valid Google account found for: ${userEmail}`);
      return false;
    }

    // Test token and refresh if needed
    let accessToken = googleAccount.access_token;
    const isExpired = googleAccount.expires_at ? googleAccount.expires_at <= Math.floor(Date.now() / 1000) : false;

    if (isExpired && googleAccount.refresh_token) {
      console.log(`🔄 Refreshing expired Google token...`);
      // Here you would implement token refresh logic
      // For now, we'll indicate the token needs refresh
      console.log(`⚠️ Token expired - user needs to re-authenticate`);
      return false;
    }

    // Fetch Google calendars
    console.log(`📅 Fetching Google calendars...`);
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calendarResponse.ok) {
      console.error(`❌ Failed to fetch Google calendars: ${calendarResponse.status}`);
      return false;
    }

    const calendarData = await calendarResponse.json();
    const calendars = calendarData.items || [];
    
    console.log(`✅ Found ${calendars.length} Google calendars`);

    // Get current user settings
    let settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, userEmail),
    });

    if (!settings) {
      console.log(`📝 Creating user settings for: ${userEmail}`);
      await db.insert(userSettings).values({
        user_email: userEmail,
        calendarSources: []
      });
      
      settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.user_email, userEmail),
      });
    }

    // Process calendar sources
    const currentSources = settings?.calendarSources as any[] || [];
    const currentGoogleSources = currentSources.filter(source => source.type === 'google');
    const nonGoogleSources = currentSources.filter(source => source.type !== 'google');

    console.log(`📊 Current sources: ${currentSources.length} total, ${currentGoogleSources.length} Google`);

    if (forceRefresh || currentGoogleSources.length === 0) {
      // Create new Google calendar sources
      const newGoogleSources = calendars.map((calendar: any, index: number) => ({
        id: `google_${calendar.id}_${Date.now() + index}`,
        name: calendar.summary || calendar.id,
        type: "google" as const,
        sourceId: calendar.id,
        tags: calendar.id === "primary" ? ["personal"] : ["shared"],
        isEnabled: true,
      }));

      const updatedSources = [...nonGoogleSources, ...newGoogleSources];

      console.log(`🔄 Updating calendar sources: ${updatedSources.length} total (${newGoogleSources.length} new Google sources)`);

      // Update user settings
      await db.update(userSettings)
        .set({
          calendarSources: updatedSources
        })
        .where(eq(userSettings.user_email, userEmail));

      console.log(`✅ Successfully created ${newGoogleSources.length} Google calendar sources`);
      return true;
    } else {
      console.log(`ℹ️ Google calendar sources already exist, no update needed`);
      return true;
    }

  } catch (error) {
    console.error(`❌ Error fixing Google Calendar integration:`, error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 Google Calendar Integration Fix & Diagnostic Tool

Usage: npm run fix-google-calendar <user-email> [options]

Options:
  --diagnose-only     Only run diagnostics, don't fix anything
  --force-refresh     Recreate all Google calendar sources
  --test-connection   Test Google API connection

Examples:
  npm run fix-google-calendar user@example.com
  npm run fix-google-calendar user@example.com --diagnose-only
  npm run fix-google-calendar user@example.com --force-refresh
    `);
    process.exit(1);
  }

  const userEmail = args[0];
  const options: FixOptions = {
    userEmail,
    diagnosticOnly: args.includes('--diagnose-only'),
    forceRefresh: args.includes('--force-refresh'),
    testConnection: args.includes('--test-connection'),
  };

  console.log('🚀 Starting Google Calendar integration fix...');
  console.log('Options:', options);

  // Always run diagnostics first
  const diagnostic = await diagnoseUserCalendarIntegration(userEmail);
  
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log(`User exists: ${diagnostic.userExists ? '✅' : '❌'}`);
  console.log(`Has Google account: ${diagnostic.hasGoogleAccount ? '✅' : '❌'}`);
  console.log(`Has calendar sources: ${diagnostic.hasCalendarSources ? '✅' : '❌'}`);
  console.log(`Google calendar sources: ${diagnostic.googleCalendarSourcesCount}`);
  
  if (diagnostic.googleAccountDetails) {
    console.log('Google account details:', diagnostic.googleAccountDetails);
  }

  if (diagnostic.errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    diagnostic.errors.forEach(error => console.log(`  • ${error}`));
  }

  if (diagnostic.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    diagnostic.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }

  // Fix if not diagnostic-only mode
  if (!options.diagnosticOnly && diagnostic.hasGoogleAccount) {
    console.log('\n🔧 APPLYING FIXES...');
    const fixed = await fixGoogleCalendarIntegration(userEmail, options.forceRefresh);
    
    if (fixed) {
      console.log('✅ Google Calendar integration fixed successfully!');
      console.log('\n📝 NEXT STEPS:');
      console.log('1. User should refresh their browser');
      console.log('2. Go to Settings > Calendar to verify connection');
      console.log('3. Check calendar page for events');
    } else {
      console.log('❌ Failed to fix Google Calendar integration');
      console.log('User may need to re-authenticate with Google');
    }
  }

  process.exit(0);
}

// Export for use as a module
export { diagnoseUserCalendarIntegration, fixGoogleCalendarIntegration };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}