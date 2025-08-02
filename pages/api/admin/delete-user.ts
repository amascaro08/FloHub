import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { 
  users, 
  accounts, 
  sessions, 
  userSettings, 
  tasks, 
  notes, 
  conversations,
  habits,
  habitCompletions,
  pushSubscriptions,
  calendarEvents,
  analytics,
  feedback,
  backlog,
  journalActivities,
  journalEntries,
  journalMoods,
  journalSleep,
  meetings
} from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin API endpoint to completely delete a user account and all associated data
 * This is a destructive operation that cannot be undone
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get the user making the request
    const requestingUser = await getUserById(decoded.userId);
    if (!requestingUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check admin permissions
    if (requestingUser.email !== 'amascaro08@gmail.com') {
      return res.status(403).json({ 
        error: 'Admin access required to delete user accounts' 
      });
    }

    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    // Prevent admin from deleting themselves
    if (requestingUser.email === userEmail) {
      return res.status(400).json({ 
        error: 'Cannot delete your own admin account' 
      });
    }

    console.log(`🗑️ Admin: [SANITIZED] is deleting user: [SANITIZED]`);

    // Find the user to delete
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.email, userEmail),
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🔍 Found user to delete: ${userToDelete.name} (ID: ${userToDelete.id})`);

    // Track deletion counts for reporting
    const deletionSummary = {
      userId: userToDelete.id,
      userEmail: userToDelete.email,
      userName: userToDelete.name,
      deletedTables: {} as Record<string, number>
    };

    // Delete all user data in the correct order (foreign key constraints)
    // Start with dependent tables first, then work up to the main user record

    try {
      // 1. Delete habit completions (references habits)
      const habitCompletionsResult = await db.delete(habitCompletions)
        .where(eq(habitCompletions.userId, userToDelete.id.toString()));
      deletionSummary.deletedTables.habitCompletions = habitCompletionsResult.rowCount || 0;

      // 2. Delete habits
      const habitsResult = await db.delete(habits)
        .where(eq(habits.userId, userToDelete.id.toString()));
      deletionSummary.deletedTables.habits = habitsResult.rowCount || 0;

      // 3. Delete accounts (OAuth providers)
      const accountsResult = await db.delete(accounts)
        .where(eq(accounts.userId, userToDelete.id));
      deletionSummary.deletedTables.accounts = accountsResult.rowCount || 0;

      // 4. Delete sessions
      const sessionsResult = await db.delete(sessions)
        .where(eq(sessions.userId, userToDelete.id));
      deletionSummary.deletedTables.sessions = sessionsResult.rowCount || 0;

      // 5. Delete user settings
      const userSettingsResult = await db.delete(userSettings)
        .where(eq(userSettings.user_email, userEmail));
      deletionSummary.deletedTables.userSettings = userSettingsResult.rowCount || 0;

      // 6. Delete tasks
      const tasksResult = await db.delete(tasks)
        .where(eq(tasks.user_email, userEmail));
      deletionSummary.deletedTables.tasks = tasksResult.rowCount || 0;

      // 7. Delete notes
      const notesResult = await db.delete(notes)
        .where(eq(notes.user_email, userEmail));
      deletionSummary.deletedTables.notes = notesResult.rowCount || 0;

      // 8. Delete conversations
      const conversationsResult = await db.delete(conversations)
        .where(eq(conversations.userId, userEmail));
      deletionSummary.deletedTables.conversations = conversationsResult.rowCount || 0;

      // 9. Delete push subscriptions
      const pushSubscriptionsResult = await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.user_email, userEmail));
      deletionSummary.deletedTables.pushSubscriptions = pushSubscriptionsResult.rowCount || 0;

      // 10. Delete calendar events
      const calendarEventsResult = await db.delete(calendarEvents)
        .where(eq(calendarEvents.user_email, userEmail));
      deletionSummary.deletedTables.calendarEvents = calendarEventsResult.rowCount || 0;

      // 11. Delete analytics data
      const analyticsResult = await db.delete(analytics)
        .where(eq(analytics.user_email, userEmail));
      deletionSummary.deletedTables.analytics = analyticsResult.rowCount || 0;

      // 12. Delete feedback
      const feedbackResult = await db.delete(feedback)
        .where(eq(feedback.userEmail, userEmail));
      deletionSummary.deletedTables.feedback = feedbackResult.rowCount || 0;

      // 13. Delete backlog items
      const backlogResult = await db.delete(backlog)
        .where(eq(backlog.userId, userEmail));
      deletionSummary.deletedTables.backlog = backlogResult.rowCount || 0;

      // 14. Delete journal data
      const journalActivitiesResult = await db.delete(journalActivities)
        .where(eq(journalActivities.user_email, userEmail));
      deletionSummary.deletedTables.journalActivities = journalActivitiesResult.rowCount || 0;

      const journalEntriesResult = await db.delete(journalEntries)
        .where(eq(journalEntries.user_email, userEmail));
      deletionSummary.deletedTables.journalEntries = journalEntriesResult.rowCount || 0;

      const journalMoodsResult = await db.delete(journalMoods)
        .where(eq(journalMoods.user_email, userEmail));
      deletionSummary.deletedTables.journalMoods = journalMoodsResult.rowCount || 0;

      const journalSleepResult = await db.delete(journalSleep)
        .where(eq(journalSleep.user_email, userEmail));
      deletionSummary.deletedTables.journalSleep = journalSleepResult.rowCount || 0;

      // 15. Delete meetings
      const meetingsResult = await db.delete(meetings)
        .where(eq(meetings.userId, userEmail));
      deletionSummary.deletedTables.meetings = meetingsResult.rowCount || 0;

      // 16. Finally, delete the user record itself
      const userResult = await db.delete(users)
        .where(eq(users.id, userToDelete.id));
      deletionSummary.deletedTables.users = userResult.rowCount || 0;

      console.log('🎯 User deletion summary:', deletionSummary);

      // Calculate total records deleted
      const totalRecordsDeleted = Object.values(deletionSummary.deletedTables)
        .reduce((sum, count) => sum + count, 0);

      return res.status(200).json({
        success: true,
        message: `User account completely deleted. Removed ${totalRecordsDeleted} records across ${Object.keys(deletionSummary.deletedTables).length} tables.`,
        summary: deletionSummary,
        totalRecordsDeleted
      });

    } catch (deleteError) {
      console.error('❌ Error during user deletion:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user data completely',
        details: deleteError instanceof Error ? deleteError.message : 'Unknown error',
        partialDeletion: deletionSummary
      });
    }

  } catch (error) {
    console.error('❌ Admin delete user API error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}