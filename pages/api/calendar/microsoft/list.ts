import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { Client } from '@microsoft/microsoft-graph-client';
import { getMicrosoftToken, MicrosoftAuthProvider } from '../../../../lib/microsoftAuth';

type CalItem = { id: string; summary: string; primary?: boolean };
type ErrorRes = { error: string };

/**
 * API endpoint to list Microsoft calendars
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalItem[] | ErrorRes>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Get the current user user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user || !user.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get Microsoft tokens for the user
    const tokens = await getMicrosoftToken(user.email);
    
    if (!tokens || !tokens.access_token) {
      return res.status(401).json({ error: 'Microsoft authentication required' });
    }

    // Initialize Microsoft Graph client
    const authProvider = new MicrosoftAuthProvider(tokens.access_token);
    const graphClient = Client.initWithMiddleware({
      authProvider,
    });

    // Fetch calendars from Microsoft Graph API
    const response = await graphClient
      .api('/me/calendars')
      .get();

    if (!response || !response.value) {
      return res.status(200).json([]);
    }

    // Map Microsoft calendars to the expected format
    const calendars: CalItem[] = response.value.map((calendar: any) => ({
      id: calendar.id,
      summary: calendar.name,
      primary: calendar.isDefaultCalendar === true,
    }));

    return res.status(200).json(calendars);
  } catch (error: any) {
    console.error('Error fetching Microsoft calendars:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch Microsoft calendars' });
  }
}