import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleTokens } from "@/lib/googleMultiAuth";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization code from the query parameters
    const { code, state, error } = req.query;

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`/settings?error=oauth_failed&details=${encodeURIComponent(error as string)}`);
    }

    if (!code) {
      return res.redirect('/settings?error=missing_code');
    }

    // Verify the user is authenticated
    const decoded = auth(req);
    if (!decoded) {
      return res.redirect('/login?error=not_authenticated');
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.redirect('/login?error=user_not_found');
    }

    // Exchange the authorization code for tokens
    const tokens = await getGoogleTokens(code as string);

    if (!tokens) {
      return res.redirect('/settings?error=token_exchange_failed');
    }

    // TODO: Store the tokens in your database
    // This would typically involve saving the access token, refresh token, 
    // and other relevant information to your user's account
    console.log('Google tokens received for user:', user.id);
    console.log('Tokens:', { 
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
    });

    // Redirect back to settings with success
    return res.redirect('/settings?success=google_connected');

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect('/settings?error=callback_failed');
  }
}