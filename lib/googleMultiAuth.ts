import { OAuth2Client } from 'google-auth-library';

// Google OAuth scopes needed for calendar access
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.profile', // Needed to get Google user ID
  'https://www.googleapis.com/auth/userinfo.email', // Needed to verify user email
];

// Google OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  get clientId() {
    return process.env.GOOGLE_OAUTH_ID || process.env.GOOGLE_CLIENT_ID || '';
  },
  get clientSecret() {
    return process.env.GOOGLE_OAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
  },
  getRedirectUri(baseUrl?: string) {
    // Use provided baseUrl (detected from request) or fall back to NEXTAUTH_URL
    const targetUrl = baseUrl || process.env.NEXTAUTH_URL;
    if (targetUrl) {
      return `${targetUrl}/api/auth/callback/google-additional`;
    }
    // Fallback for development
    return 'http://localhost:3000/api/auth/callback/google-additional';
  }
};

/**
 * Generate Google OAuth URL for authentication with dynamic domain detection
 */
export function getGoogleOAuthUrl(state: string, requestOrigin?: string): string {
  // Access environment variables directly to ensure we get the latest values
  const clientId = process.env.GOOGLE_OAUTH_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  
  // Determine the base URL from request origin or fallback to NEXTAUTH_URL
  let baseUrl = requestOrigin;
  if (!baseUrl) {
    baseUrl = process.env.NEXTAUTH_URL;
  }
  
  const redirectUri = GOOGLE_OAUTH_CONFIG.getRedirectUri(baseUrl);
  
  console.log("Google OAuth Config:", {
    clientId: clientId ? "Set" : "Not set",
    clientSecret: clientSecret ? "Set" : "Not set",
    redirectUri,
    requestOrigin: requestOrigin || "Not provided",
    usingDynamicDomain: !!requestOrigin
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
 * Exchange authorization code for tokens with dynamic redirect URI
 */
export async function getGoogleTokens(code: string, requestOrigin?: string): Promise<any> {
  console.log('🔄 getGoogleTokens called with code:', code.substring(0, 10) + '...');
  
  const { clientId, clientSecret } = GOOGLE_OAUTH_CONFIG;
  const redirectUri = GOOGLE_OAUTH_CONFIG.getRedirectUri(requestOrigin);
  
  console.log('OAuth Config:', {
    clientId: clientId ? clientId.substring(0, 10) + '...' : 'Not set',
    clientSecret: clientSecret ? 'Set' : 'Not set',
    redirectUri,
    requestOrigin: requestOrigin || "Not provided"
  });
  
  if (!clientId || !clientSecret || !redirectUri) {
    console.error('❌ Google OAuth configuration is missing required parameters');
    throw new Error('Google OAuth configuration is missing required parameters');
  }

  const oauth2Client = new OAuth2Client(
    clientId,
    clientSecret,
    redirectUri
  );

  console.log('🔄 Exchanging code for tokens...');
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✅ Tokens received from Google:', { 
      hasAccessToken: !!tokens.access_token, 
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: (tokens as any).expires_in 
    });
    return tokens;
  } catch (error) {
    console.error('❌ Error getting tokens from Google:', error);
    throw error;
  }
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