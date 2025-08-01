import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // SECURITY FIX: Disable debug endpoints in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  // Add CORS headers
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const authResult = auth(req);
    
    if (!authResult) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user settings to check calendar sources
    const userSettingsResult = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, authResult.email),
    });

    const calendarSources = Array.isArray(userSettingsResult?.calendarSources) 
      ? userSettingsResult.calendarSources 
      : [];
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      success: true,
      user: {
        id: authResult.userId,
        email: authResult.email,
      },
      calendarSources: {
        count: calendarSources.length,
        sources: calendarSources.map((source: any) => ({
          id: source.id,
          name: source.name,
          type: source.type,
          color: source.color,
          selected: source.selected,
          // Don't expose sensitive tokens
          hasAccessToken: !!source.access_token,
          hasRefreshToken: !!source.refresh_token,
        }))
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      }
    };

    res.status(200).json(diagnostics);
  } catch (error) {
    console.error('Google calendar sources test error:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}