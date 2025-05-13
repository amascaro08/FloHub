import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { getGoogleTokens, storeGoogleToken } from '../../../../lib/googleMultiAuth';

/**
 * API endpoint to handle Google OAuth callback for additional accounts
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
      console.error('Google OAuth error:', error, error_description);
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

    const tokens = await getGoogleTokens(code as string);
    
    // Store the tokens in the database
    await storeGoogleToken(
      session.user.email || '', 
      stateData.accountLabel || 'Additional Google Account',
      tokens
    );
    
    // Redirect back to the settings page with success message
    const redirectUrl = stateData.redirectUrl || '/dashboard/settings';
    
    return res.redirect(`${redirectUrl}?success=true&accountLabel=${encodeURIComponent(stateData.accountLabel)}&provider=google`);
  } catch (error: any) {
    console.error('Error handling Google OAuth callback:', error);
    res.redirect(`/dashboard/settings?error=${encodeURIComponent(error.message || 'Failed to complete Google authentication')}`);
  }
}