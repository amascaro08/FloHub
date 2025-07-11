// lib/notificationScheduler.ts
// Scheduler for sending notifications for upcoming meetings and tasks

import { query } from './neon';
import fetch from 'node-fetch';

// Time thresholds for notifications (in minutes)
const MEETING_REMINDERS = [15, 5]; // Remind 15 and 5 minutes before meeting
const TASK_REMINDERS = [60 * 24, 60]; // Remind 24 hours and 1 hour before task due date

/**
 * Send a notification to a user
 * @param userEmail - User's email
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data for the notification
 * @param tag - Notification tag for grouping
 * @param actions - Notification actions
 */
async function sendNotification(
  userEmail: string,
  title: string,
  body: string,
  data: any = {},
  tag: string = 'default',
  actions: any[] = []
) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        userEmail,
        title,
        body,
        data,
        tag,
        actions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send notification: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * Check for upcoming meetings and send notifications
 */
export async function checkUpcomingMeetings() {
  try {
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    // Get all users with push subscriptions
    const { rows: subscriptions } = await query(`SELECT DISTINCT "userEmail" FROM "pushSubscriptions"`);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }
    
    // Get unique user emails
    const userEmails = new Set<string>(subscriptions.map(row => row.userEmail));
    
    console.log(`Checking upcoming meetings for ${userEmails.size} users`);
    
    // For each user, check their upcoming meetings
    for (const userEmail of Array.from(userEmails)) {
      // Get user's calendar settings (optional, if needed for filtering/preferences)
      // For now, we'll skip fetching user settings as it's not directly used for the core query
      // If specific settings are needed, a SELECT from 'userSettings' table would be required.
      
      // Get upcoming meetings from Neon
      // Assuming 'calendarEvents' table has 'userId', 'summary', 'start_timestamp' (BIGINT)
      const { rows: events } = await query(
        `SELECT id, summary, start FROM "calendarEvents" WHERE "userId" = $1 AND "start"->>'dateTime' > $2 ORDER BY "start"->>'dateTime' ASC LIMIT 10`,
        [userEmail, now.toISOString()]
      );
      
      if (events.length === 0) {
        console.log(`No upcoming meetings found for user ${userEmail}`);
        continue;
      }
      
      // Check each meeting for notification timing
      for (const event of events) {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const minutesUntilEvent = (eventStart.getTime() - nowTimestamp) / (1000 * 60);
        
        // Check if we should send a notification for this meeting
        for (const reminderMinutes of MEETING_REMINDERS) {
          // If the meeting is within the reminder window (with a 1-minute buffer)
          if (minutesUntilEvent > reminderMinutes - 1 && minutesUntilEvent <= reminderMinutes) {
            console.log(`Sending notification for meeting ${event.summary} to ${userEmail}`);
            
            // Send notification
            await sendNotification(
              userEmail,
              `Meeting Reminder: ${event.summary}`,
              `Your meeting "${event.summary}" starts in ${Math.round(minutesUntilEvent)} minutes`,
              {
                eventId: event.id,
                url: `/dashboard/meetings?id=${event.id}`,
                type: 'meeting',
              },
              `meeting-${event.id}`,
              [
                {
                  action: 'view_meeting',
                  title: 'View Details',
                },
              ]
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking upcoming meetings:', error);
  }
}

/**
 * Check for upcoming tasks and send notifications
 */
export async function checkUpcomingTasks() {
  try {
    const now = new Date();
    const nowTimestamp = now.getTime();
    
    // Get all users with push subscriptions
    const { rows: subscriptions } = await query(`SELECT DISTINCT "userEmail" FROM "pushSubscriptions"`);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }
    
    // Get unique user emails
    const userEmails = new Set<string>(subscriptions.map(row => row.userEmail));
    
    console.log(`Checking upcoming tasks for ${userEmails.size} users`);
    
    // For each user, check their upcoming tasks
    for (const userEmail of Array.from(userEmails)) {
      // Get upcoming tasks from Neon
      // Assuming 'tasks' table has 'userId', 'text', 'done', 'dueDate' (BIGINT)
      const { rows: tasks } = await query(
        `SELECT id, text, done, "dueDate" FROM tasks WHERE "userId" = $1 AND done = FALSE AND "dueDate" > $2 ORDER BY "dueDate" ASC LIMIT 10`,
        [userEmail, nowTimestamp]
      );
      
      if (tasks.length === 0) {
        console.log(`No upcoming tasks found for user ${userEmail}`);
        continue;
      }
      
      // Check each task for notification timing
      for (const task of tasks) {
        const taskDue = new Date(Number(task.dueDate));
        const minutesUntilDue = (taskDue.getTime() - nowTimestamp) / (1000 * 60);
        
        // Check if we should send a notification for this task
        for (const reminderMinutes of TASK_REMINDERS) {
          // If the task is within the reminder window (with a 5-minute buffer)
          if (minutesUntilDue > reminderMinutes - 5 && minutesUntilDue <= reminderMinutes) {
            console.log(`Sending notification for task ${task.text} to ${userEmail}`);
            
            // Format the reminder message based on time
            let reminderText = '';
            if (reminderMinutes >= 60) {
              const hours = Math.round(reminderMinutes / 60);
              reminderText = `due in ${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
              reminderText = `due in ${reminderMinutes} minutes`;
            }
            
            // Send notification
            await sendNotification(
              userEmail,
              `Task Reminder: ${task.text}`,
              `Your task "${task.text}" is ${reminderText}`,
              {
                taskId: task.id,
                url: `/dashboard/tasks?id=${task.id}`,
                type: 'task',
              },
              `task-${task.id}`,
              [
                {
                  action: 'view_task',
                  title: 'View Task',
                },
                {
                  action: 'mark_done',
                  title: 'Mark as Done',
                },
              ]
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking upcoming tasks:', error);
  }
}

/**
 * Run the notification scheduler
 */
export async function runNotificationScheduler() {
  console.log('Running notification scheduler at', new Date().toISOString());
  
  try {
    // Check for upcoming meetings
    await checkUpcomingMeetings();
    
    // Check for upcoming tasks
    await checkUpcomingTasks();
    
    console.log('Notification scheduler completed at', new Date().toISOString());
  } catch (error) {
    console.error('Error running notification scheduler:', error);
  }
}