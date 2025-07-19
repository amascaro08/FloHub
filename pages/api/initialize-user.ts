import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, userSettings, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Move getUserById function here to avoid shared import issues
async function getUserById(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      name: true,
    },
    with: {
      accounts: {
        columns: {
          access_token: true,
        },
      },
    },
  });

  return user || null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== USER INITIALIZATION ===');
    
    // Authenticate user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const userEmail = user.email;
    console.log('Initializing user:', userEmail);
    
    // Check if user_settings exists
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, userEmail),
    });
    
    if (existingSettings) {
      return res.status(200).json({
        message: 'User already initialized',
        email: userEmail,
        hasSettings: true
      });
    }
    
    // Create default user_settings record
    console.log('Creating default user_settings...');
    const newSettings = {
      user_email: userEmail,
      floCatStyle: 'default',
      floCatPersonality: [],
      preferredName: user.name || '',
      selectedCals: ['primary'],
      defaultView: 'month',
      customRange: { 
        start: new Date().toISOString().slice(0, 10), 
        end: new Date().toISOString().slice(0, 10) 
      },
      powerAutomateUrl: '',
      globalTags: [],
      activeWidgets: ['tasks', 'calendar', 'ataglance', 'quicknote', 'habit-tracker'],
      calendarSources: {},
      timezone: 'America/New_York',
      tags: [],
      widgets: [],
      calendarSettings: {
        calendars: [],
      },
      notificationSettings: {
        subscribed: false,
      },
      floCatSettings: {},
      layouts: {}
    };
    
    await db.insert(userSettings).values(newSettings);
    console.log('User settings created successfully');
    
    // Verify creation
    const verifySettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.user_email, userEmail),
    });
    
    return res.status(200).json({
      success: true,
      message: 'User initialized successfully',
      email: userEmail,
      settingsCreated: !!verifySettings,
      settings: verifySettings
    });
    
  } catch (error) {
    console.error('=== USER INITIALIZATION ERROR ===', error);
    return res.status(500).json({ 
      error: 'Failed to initialize user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}