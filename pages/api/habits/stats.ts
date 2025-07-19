import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { habitCompletions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
  // Check authentication
  const decoded = auth(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Not signed in' });
  }
  const user = await getUserById(decoded.userId);
  if (!user?.email) {
    return res.status(401).json({ error: 'User not found' });
  }
  const userId = user.email;

  // Handle GET request to calculate habit stats
  if (req.method === 'GET') {
    try {
      const { habitId } = req.query;
      
      if (!habitId || typeof habitId !== 'string') {
        return res.status(400).json({ error: 'Habit ID is required' });
      }
      
      // Get all completions for this habit
      const completions = await db
        .select()
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.userId, userId),
            eq(habitCompletions.habitId, parseInt(habitId))
          )
        )
        .orderBy(desc(habitCompletions.date));
      
      // Calculate statistics
      const totalCompletions = completions.length;
      const completedCount = completions.filter(c => c.completed).length;
      const completionRate = totalCompletions > 0 ? (completedCount / totalCompletions) * 100 : 0;
      
      // Calculate current streak
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      
      // Sort completions by date (most recent first)
      const sortedCompletions = completions.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      for (const completion of sortedCompletions) {
        if (completion.completed && completion.date <= today) {
          currentStreak++;
        } else if (completion.date <= today) {
          break;
        }
      }
      
      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      
      // Sort by date (oldest first) for streak calculation
      const chronologicalCompletions = completions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      for (const completion of chronologicalCompletions) {
        if (completion.completed) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      
      // Calculate weekly stats (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyCompletions = completions.filter(c => 
        new Date(c.date) >= oneWeekAgo && c.completed
      );
      
      // Calculate monthly stats (last 30 days)
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      const monthlyCompletions = completions.filter(c => 
        new Date(c.date) >= oneMonthAgo && c.completed
      );
      
      const stats = {
        totalCompletions,
        completedCount,
        completionRate: Math.round(completionRate),
        currentStreak,
        longestStreak,
        weeklyCompletions: weeklyCompletions.length,
        monthlyCompletions: monthlyCompletions.length,
        lastCompletionDate: sortedCompletions.find(c => c.completed)?.date || null
      };
      
      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error calculating habit stats:', error);
      return res.status(500).json({ error: 'Failed to calculate habit statistics' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}