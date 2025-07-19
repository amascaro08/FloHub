import { OAuth2Client } from 'google-auth-library';

// Google OAuth scopes needed for calendar access
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
];

// Google OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  get clientId() {
    return process.env.GOOGLE_OAUTH_ID || process.env.GOOGLE_CLIENT_ID || '';
  },
  get clientSecret() {
    return process.env.GOOGLE_OAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  },
  get redirectUri() {
    if (process.env.NODE_ENV === 'production') {
      // Use NEXTAUTH_URL environment variable or fallback to flohub.vercel.app
      const baseUrl = process.env.NEXTAUTH_URL || 'https://flohub.vercel.app';
      return `${baseUrl}/api/auth/callback/google-additional`;
    }
    return 'http://localhost:3000/api/auth/callback/google-additional';
  }
};

/**
 * Generate Google OAuth URL for authentication
 */
export function getGoogleOAuthUrl(state: string): string {
  // Access environment variables directly to ensure we get the latest values
  const clientId = process.env.GOOGLE_OAUTH_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL;
  const redirectUri = baseUrl ? `${baseUrl}/api/auth/callback/google-additional` : '';
  
  console.log("Google OAuth Config:", {
    clientId: clientId ? "Set" : "Not set",
    clientSecret: clientSecret ? "Set" : "Not set",
    redirectUri
  });
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth configuration is missing required parameters. Please set GOOGLE_OAUTH_ID/GOOGLE_CLIENT_ID, GOOGLE_OAUTH_SECRET/GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL environment variables.');
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
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
    throw new Error('Google OAuth configuration is missing required parameters. Please check GOOGLE_OAUTH_ID and GOOGLE_OAUTH_SECRET environment variables.');
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