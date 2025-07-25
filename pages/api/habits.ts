import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { habits } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS for production
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://flohub.xyz',
    'https://www.flohub.xyz',
    'https://flohub.vercel.app'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

  // Handle GET request to fetch habits
  if (req.method === 'GET') {
    try {
      const rows = await db
        .select()
        .from(habits)
        .where(eq(habits.userId, userId))
        .orderBy(desc(habits.createdAt));
        
      const userHabits = rows.map(row => ({
        ...row,
        id: String(row.id),
        description: row.description || undefined,
        customDays: (row.customDays as number[]) || [],
        frequency: row.frequency as 'daily' | 'weekly' | 'custom',
        createdAt: row.createdAt ? Number(row.createdAt) : Date.now(),
        updatedAt: row.updatedAt ? Number(row.updatedAt) : Date.now()
      }));
      
      return res.status(200).json(userHabits);
    } catch (error) {
      console.error('Error fetching habits:', error);
      return res.status(500).json({ error: 'Failed to fetch habits' });
    }
  }

  // Handle POST request to create new habit
  if (req.method === 'POST') {
    try {
      const { name, description, frequency, customDays } = req.body;
      
      if (!name || !frequency) {
        return res.status(400).json({ error: 'Name and frequency are required' });
      }
      
      const newHabit = await db.insert(habits).values({
        userId,
        name,
        description: description || '',
        frequency,
        customDays: frequency === 'custom' ? customDays : []
      }).returning();
      
      const formattedHabit = {
        ...newHabit[0],
        id: String(newHabit[0].id),
        description: newHabit[0].description || undefined,
        customDays: (newHabit[0].customDays as number[]) || [],
        frequency: newHabit[0].frequency as 'daily' | 'weekly' | 'custom',
        createdAt: Number(newHabit[0].createdAt),
        updatedAt: Number(newHabit[0].updatedAt)
      };
      
      return res.status(201).json(formattedHabit);
    } catch (error) {
      console.error('Error creating habit:', error);
      return res.status(500).json({ error: 'Failed to create habit' });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}