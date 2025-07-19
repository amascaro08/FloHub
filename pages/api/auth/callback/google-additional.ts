import type { NextApiRequest, NextApiResponse } from "next";
import { getGoogleTokens } from "@/lib/googleMultiAuth";

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

    // Get user information from the OAuth state parameter
    let userEmail: string;
    try {
      if (state) {
        const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString());
        userEmail = decodedState.email;
      } else {
        return res.redirect('/settings?error=missing_state');
      }
    } catch (error) {
      console.error('Error decoding OAuth state:', error);
      return res.redirect('/settings?error=invalid_state');
    }

    if (!userEmail) {
      return res.redirect('/settings?error=missing_user_email');
    }

    console.log('Google OAuth callback for additional account, user:', userEmail);

    // Exchange the authorization code for tokens
    const tokens = await getGoogleTokens(code as string);

    if (!tokens) {
      return res.redirect('/settings?error=token_exchange_failed');
    }

    // Store the tokens and add additional calendar source
    console.log('Google tokens received for user:', userEmail);
    console.log('Tokens:', { 
      access_token: tokens.access_token ? 'Present' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
    });

    try {
      // Get current user settings
      const userSettingsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings?userId=${encodeURIComponent(userEmail)}`);
      const currentSettings = await userSettingsRes.json();

      // Add the new additional Google calendar source
      const existingGoogleSources = (currentSettings.calendarSources || []).filter((source: any) => source.type === 'google').length;
      const newCalendarSource = {
        id: `google_additional_${Date.now()}`,
        name: `Google Calendar ${existingGoogleSources + 1}`,
        type: 'google' as const,
        enabled: true,
        connectionData: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date,
        }),
      };

      const updatedSources = [...(currentSettings.calendarSources || []), newCalendarSource];

      // Update user settings with new calendar source
      const updateRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/userSettings/update?userId=${encodeURIComponent(userEmail)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentSettings,
          calendarSources: updatedSources,
        }),
      });

      if (!updateRes.ok) {
        console.error('Failed to update user settings with additional Google calendar source');
      } else {
        console.log('Successfully added additional Google calendar source for user:', userEmail);
      }
    } catch (error) {
      console.error('Error storing additional calendar source:', error);
    }

    // Redirect back to settings with success
    return res.redirect('/settings?success=google_connected');

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect('/settings?error=callback_failed');
  }
}