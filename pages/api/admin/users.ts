import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { db } from '@/db/db';
import { users, userSettings, sessions, analyticsUsersDurations } from '@/db/schema';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user and verify admin access
    const session = await getServerSession(req, res, authOptions);
    const user = session?.user;

    if (!user || user.email !== 'amascaro08@gmail.com') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch all users with their settings and last activity
    const usersWithDetails = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        lastActive: sql<Date>`(
          SELECT MAX(timestamp) 
          FROM analytics_users_durations 
          WHERE user_email = users.email
        )`.as('lastActive'),
        totalSessions: sql<number>`(
          SELECT COUNT(*) 
          FROM analytics_users_durations 
          WHERE user_email = users.email
        )`.as('totalSessions'),
        floCatStyle: userSettings.floCatStyle,
        preferredName: userSettings.preferredName,
        timezone: userSettings.timezone,
        activeWidgets: userSettings.activeWidgets,
      })
      .from(users)
      .leftJoin(userSettings, eq(users.email, userSettings.user_email))
      .orderBy(desc(users.createdAt));

    // Calculate activity stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersCount = await db
      .select({ count: count() })
      .from(analyticsUsersDurations)
      .where(gte(analyticsUsersDurations.timestamp, thirtyDaysAgo))
      .groupBy(analyticsUsersDurations.user_email);

    // Get user registration stats over time
    const registrationStats = await db
      .select({
        date: sql<string>`DATE(created_at)`.as('date'),
        count: count(),
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    res.status(200).json({
      users: usersWithDetails,
      stats: {
        totalUsers: usersWithDetails.length,
        activeUsers30Days: activeUsersCount.length,
        registrationStats,
      },
    });

  } catch (error) {
    console.error('Error in admin users API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}