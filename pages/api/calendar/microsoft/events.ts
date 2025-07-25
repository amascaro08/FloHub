import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { Client } from '@microsoft/microsoft-graph-client';
import { getMicrosoftToken, MicrosoftAuthProvider } from '../../../../lib/microsoftAuth';
import { CalendarEvent } from '../../calendar';

type ErrorRes = { error: string };

/**
 * API endpoint to fetch Microsoft calendar events
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarEvent[] | ErrorRes>
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

    // Get query parameters
    const { calendarId, timeMin, timeMax } = req.query;
    
    if (!calendarId) {
      return res.status(400).json({ error: 'Calendar ID is required' });
    }
    
    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'Time range is required' });
    }

    // Initialize Microsoft Graph client
    const authProvider = new MicrosoftAuthProvider(tokens.access_token);
    const graphClient = Client.initWithMiddleware({
      authProvider,
    });

    // Format time range for Microsoft Graph API
    const startDateTime = new Date(timeMin as string).toISOString();
    const endDateTime = new Date(timeMax as string).toISOString();

    // Fetch events from Microsoft Graph API
    const response = await graphClient
      .api(`/me/calendars/${calendarId}/calendarView`)
      .query({
        startDateTime,
        endDateTime,
      })
      .get();

    if (!response || !response.value) {
      return res.status(200).json([]);
    }

    // Map Microsoft events to the expected format
    const events: CalendarEvent[] = response.value.map((event: any) => ({
      id: event.id,
      calendarId: calendarId as string,
      summary: event.subject || 'No Title',
      start: {
        dateTime: event.start.dateTime,
        date: event.isAllDay ? event.start.dateTime.split('T')[0] : undefined,
      },
      end: {
        dateTime: event.end.dateTime,
        date: event.isAllDay ? event.end.dateTime.split('T')[0] : undefined,
      },
      source: 'work', // Default to work for Microsoft calendars
      description: event.bodyPreview || '',
      calendarName: 'Microsoft Calendar',
      tags: ['work'], // Default tag for Microsoft calendars
    }));

    return res.status(200).json(events);
  } catch (error: any) {
    console.error('Error fetching Microsoft calendar events:', error);
    return res.status(500).json({ error: (error instanceof Error ? error.message : String(error)) || 'Failed to fetch Microsoft calendar events' });
  }
}