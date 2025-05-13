import { AuthenticationProvider, AuthenticationProviderOptions } from '@microsoft/microsoft-graph-client';

// Microsoft Graph API scopes needed for calendar access
export const MICROSOFT_SCOPES = [
  'User.Read',
  'Calendars.Read',
  'Calendars.ReadWrite',
];

// Microsoft OAuth configuration
export const MICROSOFT_OAUTH_CONFIG = {
  get clientId() {
    return process.env.MICROSOFT_CLIENT_ID || '';
  },
  get authority() {
    return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`;
  },
  get redirectUri() {
    return process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/microsoft` : '';
  }
};

// Custom authentication provider for Microsoft Graph API
export class MicrosoftAuthProvider implements AuthenticationProvider {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Get access token for Microsoft Graph API
   */
  public async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

/**
 * Generate Microsoft OAuth URL for authentication
 */
export function getMicrosoftOAuthUrl(state: string): string {
  // Access environment variables directly to ensure we get the latest values
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
  const baseUrl = process.env.NEXTAUTH_URL;
  const redirectUri = baseUrl ? `${baseUrl}/api/auth/callback/microsoft` : '';
  const authority = `https://login.microsoftonline.com/${tenantId}`;
  
  console.log("Microsoft OAuth Config:", {
    clientId: clientId ? "Set" : "Not set",
    tenantId,
    redirectUri
  });
  
  if (!clientId || !redirectUri) {
    throw new Error('Microsoft OAuth configuration is missing required parameters. Please set MICROSOFT_CLIENT_ID, MICROSOFT_TENANT_ID, and NEXTAUTH_URL environment variables.');
  }

  const scopes = encodeURIComponent(MICROSOFT_SCOPES.join(' '));
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const encodedState = encodeURIComponent(state);

  return `${authority}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodedRedirectUri}&scope=${scopes}&state=${encodedState}&response_mode=query`;
}

/**
 * Store Microsoft OAuth token in the database
 */
export async function storeMicrosoftToken(userId: string, tokens: any): Promise<void> {
  // In a real implementation, you would store the tokens in your database
  console.log(`Storing Microsoft tokens for user ${userId}`);
}

/**
 * Get Microsoft OAuth token from the database
 */
export async function getMicrosoftToken(userId: string): Promise<any | null> {
  // In a real implementation, you would retrieve the tokens from your database
  console.log(`Getting Microsoft tokens for user ${userId}`);
  return null;
}

/**
 * Refresh Microsoft OAuth token
 */
export async function refreshMicrosoftToken(refreshToken: string): Promise<any> {
  const { clientId, authority } = MICROSOFT_OAUTH_CONFIG;
  
  if (!clientId) {
    throw new Error('Microsoft OAuth configuration is missing required parameters');
  }

  const tokenEndpoint = `${authority}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');
  params.append('scope', MICROSOFT_SCOPES.join(' '));
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to refresh Microsoft token: ${response.statusText}`);
  }
  
  return await response.json();
}