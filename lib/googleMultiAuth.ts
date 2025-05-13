import { OAuth2Client } from 'google-auth-library';

// Google OAuth scopes needed for calendar access
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
];

// Google OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/google-additional` : '',
};

/**
 * Generate Google OAuth URL for authentication
 */
export function getGoogleOAuthUrl(state: string): string {
  const { clientId, redirectUri } = GOOGLE_OAUTH_CONFIG;
  
  // For development/demo purposes, use mock OAuth flow if environment variables are not set
  if (!clientId || !redirectUri) {
    console.warn('Google OAuth configuration is missing required parameters, using mock flow');
    // Return a URL that will redirect back to the settings page with a mock token
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXTAUTH_URL || '';
    return `${baseUrl}/dashboard/settings?mockAuth=google&state=${encodeURIComponent(state)}`;
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    state,
    prompt: 'consent', // Force consent screen to ensure we get a refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getGoogleTokens(code: string): Promise<any> {
  const { clientId, clientSecret, redirectUri } = GOOGLE_OAUTH_CONFIG;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration is missing required parameters');
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Store Google OAuth token in the database
 */
export async function storeGoogleToken(userId: string, accountLabel: string, tokens: any): Promise<void> {
  // In a real implementation, you would store the tokens in your database
  console.log(`Storing Google tokens for user ${userId} with label ${accountLabel}`);
}

/**
 * Get Google OAuth token from the database
 */
export async function getGoogleToken(userId: string, accountLabel: string): Promise<any | null> {
  // In a real implementation, you would retrieve the tokens from your database
  console.log(`Getting Google tokens for user ${userId} with label ${accountLabel}`);
  return null;
}

/**
 * Refresh Google OAuth token
 */
export async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const { clientId, clientSecret } = GOOGLE_OAUTH_CONFIG;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth configuration is missing required parameters');
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}