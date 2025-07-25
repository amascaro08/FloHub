import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { users, userSettings, sessions, analytics } from '@/db/schema';
import { eq, desc, and, gte, count, sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user and verify admin access
    const decoded = auth(req);
    if (!decoded) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
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
        lastActive: sql<Date | null>`(
          SELECT MAX(timestamp) 
          FROM analytics 
          WHERE user_email = users.email
        )`.as('lastActive'),
        totalSessions: sql<number>`(
          COALESCE((
            SELECT COUNT(DISTINCT DATE(timestamp)) 
            FROM analytics 
            WHERE user_email = users.email
          ), 0)
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

    const activeUsersData = await db
      .select({ user_email: analytics.user_email })
      .from(analytics)
      .where(gte(analytics.timestamp, thirtyDaysAgo))
      .groupBy(analytics.user_email);
    
    const activeUsersCount = activeUsersData.length;

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

    console.log('Users found:', usersWithDetails.length);
    console.log('Sample user:', usersWithDetails[0]);

    res.status(200).json({
      users: usersWithDetails,
      stats: {
        totalUsers: usersWithDetails.length,
        activeUsers30Days: activeUsersCount,
        registrationStats,
      },
    });

  } catch (error) {
    console.error('Error in admin users API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}