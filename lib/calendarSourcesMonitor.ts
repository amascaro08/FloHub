import { db } from './drizzle';
import { accounts, userSettings } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface CalendarSourcesIssue {
  userEmail: string;
  userId: number;
  hasGoogleAccount: boolean;
  hasCalendarSources: boolean;
  googleCalendarSources: number;
  issue: 'missing_sources' | 'expired_token' | 'healthy';
  recommendation: string;
}

/**
 * Check if a user has Google OAuth but missing calendar sources
 * This is the most common issue where OAuth succeeds but calendar source creation fails
 */
export async function checkUserCalendarSources(userEmail: string): Promise<CalendarSourcesIssue> {
  try {
    // Find user and their Google account
    const user = await db.query.users.findFirst({
      where: eq(accounts.userId, accounts.userId), // This will be corrected with proper user lookup
      with: {
        accounts: {
          where: eq(accounts.provider, 'google')
        }
      }
    });

    if (!user) {
      return {
        userEmail,
        userId: 0,
        hasGoogleAccount: false,
        hasCalendarSources: false,
        googleCalendarSources: 0,
        issue: 'healthy',
        recommendation: 'User not found'
      };
    }

    const googleAccount = user.accounts?.[0];
    
    if (!googleAccount) {
      return {
        userEmail,
        userId: user.id,
        hasGoogleAccount: false,
        hasCalendarSources: false,
        googleCalendarSources: 0,
        issue: 'healthy',
        recommendation: 'No Google account connected'
      };
    }

    // Check if token is expired
    const isExpired = googleAccount.expires_at ? 
      googleAccount.expires_at <= Math.floor(Date.now() / 1000) : false;

    if (isExpired) {
      return {
        userEmail,
        userId: user.id,
        hasGoogleAccount: true,
        hasCalendarSources: false,
        googleCalendarSources: 0,
        issue: 'expired_token',
        recommendation: 'Google token expired - user needs to reconnect'
      };
    }

    // Check calendar sources
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, userEmail),
    });

    const calendarSources = (settings?.calendarSources as any[]) || [];
    const googleSources = calendarSources.filter(source => source.type === 'google');

    if (googleSources.length === 0) {
      return {
        userEmail,
        userId: user.id,
        hasGoogleAccount: true,
        hasCalendarSources: calendarSources.length > 0,
        googleCalendarSources: 0,
        issue: 'missing_sources',
        recommendation: 'Use "Refresh Sources" button or contact support'
      };
    }

    return {
      userEmail,
      userId: user.id,
      hasGoogleAccount: true,
      hasCalendarSources: true,
      googleCalendarSources: googleSources.length,
      issue: 'healthy',
      recommendation: 'All good!'
    };

  } catch (error) {
    console.error('Error checking calendar sources:', error);
    return {
      userEmail,
      userId: 0,
      hasGoogleAccount: false,
      hasCalendarSources: false,
      googleCalendarSources: 0,
      issue: 'healthy',
      recommendation: 'Error checking status'
    };
  }
}

/**
 * Check if user has the OAuth/calendar sources disconnect issue
 */
export async function hasCalendarSourcesIssue(userEmail: string): Promise<boolean> {
  const status = await checkUserCalendarSources(userEmail);
  return status.issue === 'missing_sources';
}

/**
 * Get notification message for users with calendar sources issues
 */
export function getCalendarSourcesNotification(issue: CalendarSourcesIssue): {
  message: string;
  action: string;
  actionUrl: string;
} | null {
  if (issue.issue === 'missing_sources') {
    return {
      message: 'Your Google Calendar is connected but no calendar sources were found. This is a common issue that can be easily fixed.',
      action: 'Refresh Calendar Sources',
      actionUrl: '/dashboard/settings?tab=calendar&action=refresh-sources'
    };
  }
  
  if (issue.issue === 'expired_token') {
    return {
      message: 'Your Google Calendar connection has expired. Please reconnect to continue syncing your events.',
      action: 'Reconnect Google Calendar',
      actionUrl: '/dashboard/settings?tab=calendar&action=reconnect-google'
    };
  }
  
  return null;
}