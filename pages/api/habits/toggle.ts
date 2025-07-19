import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { habitCompletions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

  // Handle POST request to toggle habit completion
  if (req.method === 'POST') {
    try {
      const { habitId, date } = req.body;
      
      if (!habitId || !date) {
        return res.status(400).json({ error: 'Habit ID and date are required' });
      }
      
      // Check if completion already exists
      const existingCompletion = await db
        .select()
        .from(habitCompletions)
        .where(
          and(
            eq(habitCompletions.userId, userId),
            eq(habitCompletions.habitId, parseInt(habitId)),
            eq(habitCompletions.date, date)
          )
        );
      
      if (existingCompletion.length > 0) {
        // Update existing completion (toggle)
        const updatedCompletion = await db
          .update(habitCompletions)
          .set({
            completed: !existingCompletion[0].completed
          })
          .where(
            and(
              eq(habitCompletions.userId, userId),
              eq(habitCompletions.habitId, parseInt(habitId)),
              eq(habitCompletions.date, date)
            )
          )
          .returning();
        
        const formattedCompletion = {
          ...updatedCompletion[0],
          habitId: String(updatedCompletion[0].habitId),
          timestamp: updatedCompletion[0].timestamp ? Number(updatedCompletion[0].timestamp) : Date.now()
        };
        
        return res.status(200).json(formattedCompletion);
      } else {
        // Create new completion
        const newCompletion = await db
          .insert(habitCompletions)
          .values({
            userId,
            habitId: parseInt(habitId),
            date,
            completed: true
          })
          .returning();
        
        const formattedCompletion = {
          ...newCompletion[0],
          habitId: String(newCompletion[0].habitId),
          timestamp: newCompletion[0].timestamp ? Number(newCompletion[0].timestamp) : Date.now()
        };
        
        return res.status(201).json(formattedCompletion);
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      return res.status(500).json({ error: 'Failed to toggle habit completion' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}