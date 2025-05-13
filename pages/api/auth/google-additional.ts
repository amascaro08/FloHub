import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { getGoogleOAuthUrl } from '../../../lib/googleMultiAuth';

/**
 * API endpoint to initiate Google OAuth flow for additional accounts
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Log environment variables for debugging
  console.log("Environment variables in Google OAuth endpoint:", {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "Set" : "Not set",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NODE_ENV: process.env.NODE_ENV
  });

  try {
    // Get the current user session
    const session = await getSession({ req });
    
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the account label from the query parameters
    const { accountLabel } = req.query;
    
    if (!accountLabel) {
      return res.status(400).json({ error: 'Account label is required' });
    }

    // Generate a state parameter to prevent CSRF attacks
    // In a real implementation, you would store this state in a database or session
    const state = Buffer.from(JSON.stringify({
      userId: session.user.email || '',
      accountLabel: accountLabel as string,
      redirectUrl: req.query.redirectUrl || '/dashboard/settings',
    })).toString('base64');

    // Generate the Google OAuth URL
    const authUrl = getGoogleOAuthUrl(state);
    
    // Redirect to Google OAuth page
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate Google OAuth' });
  }
}