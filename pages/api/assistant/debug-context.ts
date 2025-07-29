import type { NextApiRequest, NextApiResponse } from "next";
import { auth } from "@/lib/auth";
import { getUserById } from "@/lib/user";
import { db } from "@/lib/drizzle";
import { 
  tasks, 
  notes, 
  habits, 
  habitCompletions, 
  journalEntries, 
  journalMoods, 
  conversations, 
  userSettings,
  calendarEvents,
  meetings 
} from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Debug context endpoint called');
  
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Test authentication
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Testing database queries for user:', user.email);
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const queryTests = {
      userEmail: user.email,
      databaseConnection: true,
      queries: {} as any
    };

    // Test each query individually
    console.log('Testing tasks query...');
    try {
      const userTasks = await db.select().from(tasks)
        .where(and(
          eq(tasks.user_email, user.email),
          gte(tasks.createdAt, thirtyDaysAgo)
        ))
        .orderBy(desc(tasks.createdAt))
        .limit(5);
      queryTests.queries.tasks = { success: true, count: userTasks.length, sample: userTasks[0] || null };
      console.log('Tasks query successful:', userTasks.length, 'results');
    } catch (error) {
      queryTests.queries.tasks = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('Tasks query failed:', error);
    }

    console.log('Testing notes query...');
    try {
      const userNotes = await db.select().from(notes)
        .where(and(
          eq(notes.user_email, user.email),
          gte(notes.createdAt, thirtyDaysAgo)
        ))
        .orderBy(desc(notes.createdAt))
        .limit(5);
      queryTests.queries.notes = { success: true, count: userNotes.length, sample: userNotes[0] || null };
      console.log('Notes query successful:', userNotes.length, 'results');
    } catch (error) {
      queryTests.queries.notes = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('Notes query failed:', error);
    }

    console.log('Testing habits query...');
    try {
      const userHabits = await db.select().from(habits)
        .where(eq(habits.userId, user.email))
        .orderBy(desc(habits.createdAt))
        .limit(5);
      queryTests.queries.habits = { success: true, count: userHabits.length, sample: userHabits[0] || null };
      console.log('Habits query successful:', userHabits.length, 'results');
    } catch (error) {
      queryTests.queries.habits = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('Habits query failed:', error);
    }

    console.log('Testing habit completions query...');
    try {
      const userHabitCompletions = await db.select().from(habitCompletions)
        .where(and(
          eq(habitCompletions.userId, user.email),
          gte(habitCompletions.timestamp, thirtyDaysAgo)
        ))
        .orderBy(desc(habitCompletions.timestamp))
        .limit(5);
      queryTests.queries.habitCompletions = { success: true, count: userHabitCompletions.length, sample: userHabitCompletions[0] || null };
      console.log('Habit completions query successful:', userHabitCompletions.length, 'results');
    } catch (error) {
      queryTests.queries.habitCompletions = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('Habit completions query failed:', error);
    }

    console.log('Testing user settings query...');
    try {
      const settings = await db.select().from(userSettings)
        .where(eq(userSettings.user_email, user.email))
        .limit(1);
      queryTests.queries.userSettings = { success: true, count: settings.length, sample: settings[0] || null };
      console.log('User settings query successful:', settings.length, 'results');
    } catch (error) {
      queryTests.queries.userSettings = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      console.error('User settings query failed:', error);
    }

    return res.status(200).json({
      message: 'Database query tests completed',
      results: queryTests
    });

  } catch (error) {
    console.error('Debug context error:', error);
    return res.status(500).json({ 
      error: 'Debug context failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}