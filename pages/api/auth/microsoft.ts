import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { getMicrosoftOAuthUrl } from '../../../lib/microsoftAuth';

/**
 * API endpoint to initiate Microsoft OAuth flow
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

    // Generate a state parameter to prevent CSRF attacks
    // In a real implementation, you would store this state in a database or session
    const state = Buffer.from(JSON.stringify({
      userId: session.user.email || '',
      calendarId: req.query.calendarId || '',
      redirectUrl: req.query.redirectUrl || '/dashboard/settings',
    })).toString('base64');

    // Generate the Microsoft OAuth URL
    const authUrl = getMicrosoftOAuthUrl(state);
    
    // Redirect to Microsoft OAuth page
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Error initiating Microsoft OAuth:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate Microsoft OAuth' });
  }
}