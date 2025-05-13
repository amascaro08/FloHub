import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { MICROSOFT_OAUTH_CONFIG, storeMicrosoftToken } from '../../../../lib/microsoftAuth';

/**
 * API endpoint to handle Microsoft OAuth callback
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the current user session
    const session = await getSession({ req });
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, error_description);
      return res.redirect(`/dashboard/settings?error=${encodeURIComponent(error_description as string || 'Authentication failed')}`);
    }

    // Validate the state parameter
    if (!state) {
      return res.redirect('/dashboard/settings?error=Invalid state parameter');
    }

    // Decode the state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch (e) {
      return res.redirect('/dashboard/settings?error=Invalid state data');
    }

    // Validate the user ID in the state
    if (stateData.userId !== session.user.email) {
      return res.redirect('/dashboard/settings?error=User mismatch');
    }

    // Exchange the authorization code for access and refresh tokens
    if (!code) {
      return res.redirect('/dashboard/settings?error=No authorization code provided');
    }

    const { clientId, redirectUri } = MICROSOFT_OAUTH_CONFIG;
    
    const tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('code', code as string);
    params.append('redirect_uri', redirectUri);
    params.append('grant_type', 'authorization_code');
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Failed to exchange code for tokens:', errorData);
      return res.redirect(`/dashboard/settings?error=${encodeURIComponent(errorData.error_description || 'Failed to exchange code for tokens')}`);
    }
    
    const tokens = await tokenResponse.json();
    
    // Store the tokens in the database
    await storeMicrosoftToken(session.user.email || '', tokens);
    
    // Redirect back to the settings page with success message
    const redirectUrl = stateData.redirectUrl || '/dashboard/settings';
    const calendarId = stateData.calendarId;
    
    return res.redirect(`${redirectUrl}?success=true&calendarId=${encodeURIComponent(calendarId)}&provider=microsoft`);
  } catch (error: any) {
    console.error('Error handling Microsoft OAuth callback:', error);
    res.redirect(`/dashboard/settings?error=${encodeURIComponent(error.message || 'Failed to complete Microsoft authentication')}`);
  }
}