import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { habits } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
  
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid habit ID' });
  }

  // Handle PUT request to update habit
  if (req.method === 'PUT') {
    try {
      const { name, description, frequency, customDays } = req.body;
      
      if (!name || !frequency) {
        return res.status(400).json({ error: 'Name and frequency are required' });
      }
      
      const updatedHabit = await db
        .update(habits)
        .set({
          name,
          description: description || '',
          frequency,
          customDays: frequency === 'custom' ? customDays : []
        })
        .where(and(eq(habits.id, parseInt(id)), eq(habits.userId, userId)))
        .returning();
      
      if (updatedHabit.length === 0) {
        return res.status(404).json({ error: 'Habit not found' });
      }
      
      const formattedHabit = {
        ...updatedHabit[0],
        id: String(updatedHabit[0].id),
        description: updatedHabit[0].description || undefined,
        customDays: (updatedHabit[0].customDays as number[]) || [],
        frequency: updatedHabit[0].frequency as 'daily' | 'weekly' | 'custom',
        createdAt: Number(updatedHabit[0].createdAt),
        updatedAt: Number(updatedHabit[0].updatedAt)
      };
      
      return res.status(200).json(formattedHabit);
    } catch (error) {
      console.error('Error updating habit:', error);
      return res.status(500).json({ error: 'Failed to update habit' });
    }
  }

  // Handle DELETE request to delete habit
  if (req.method === 'DELETE') {
    try {
      const deletedHabit = await db
        .delete(habits)
        .where(and(eq(habits.id, parseInt(id)), eq(habits.userId, userId)))
        .returning();
      
      if (deletedHabit.length === 0) {
        return res.status(404).json({ error: 'Habit not found' });
      }
      
      return res.status(200).json({ message: 'Habit deleted successfully' });
    } catch (error) {
      console.error('Error deleting habit:', error);
      return res.status(500).json({ error: 'Failed to delete habit' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}