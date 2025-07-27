// lib/notificationScheduler.ts
// Scheduler for sending notifications for upcoming meetings and tasks

import { db } from './drizzle';
import { pushSubscriptions, calendarEvents, tasks } from '@/db/schema';
import { and, eq, gt, sql, lte } from 'drizzle-orm';
import fetch from 'node-fetch';

// Time thresholds for notifications (in minutes)
const MEETING_REMINDERS = [15, 5]; // Remind 15 and 5 minutes before meeting
const TASK_REMINDERS = [60 * 24, 60]; // Remind 24 hours and 1 hour before task due date

/**
 * Send a notification to a user
 * @param user_email - User's email
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data for the notification
 * @param tag - Notification tag for grouping
 * @param actions - Notification actions
 */
async function sendNotification(
  user_email: string,
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
        user_email,
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
    
    const subscriptions = await db.selectDistinct({ user_email: pushSubscriptions.user_email }).from(pushSubscriptions);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }
    
    const user_emails = new Set<string>(subscriptions.map(row => row.user_email!));
    
    console.log(`Checking upcoming meetings for ${user_emails.size} users`);
    
    for (const user_email of Array.from(user_emails)) {
      const events = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.user_email, user_email), gt(sql`"start"->>'dateTime'`, now.toISOString())))
        .orderBy(sql`"start"->>'dateTime' ASC`)
        .limit(10);
      
      if (events.length === 0) {
        console.log(`No upcoming meetings found for user ${user_email}`);
        continue;
      }
      
      for (const event of events) {
        const eventStart = new Date((event.start as any).dateTime || (event.start as any).date);
        const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
        
        for (const reminderMinutes of MEETING_REMINDERS) {
          if (minutesUntilEvent > reminderMinutes - 1 && minutesUntilEvent <= reminderMinutes) {
            console.log(`Sending notification for meeting ${event.summary} to ${user_email}`);
            
            await sendNotification(
              user_email,
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
    
    const subscriptions = await db.selectDistinct({ user_email: pushSubscriptions.user_email }).from(pushSubscriptions);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }
    
    const user_emails = new Set<string>(subscriptions.map(row => row.user_email!));
    
    console.log(`Checking upcoming tasks for ${user_emails.size} users`);
    
    for (const user_email of Array.from(user_emails)) {
      const userTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.user_email, user_email), eq(tasks.done, false), gt(tasks.dueDate, now)))
        .orderBy(tasks.dueDate)
        .limit(10);
      
      if (userTasks.length === 0) {
        console.log(`No upcoming tasks found for user ${user_email}`);
        continue;
      }
      
      for (const task of userTasks) {
        const taskDue = new Date(task.dueDate!);
        const minutesUntilDue = (taskDue.getTime() - now.getTime()) / (1000 * 60);
        
        for (const reminderMinutes of TASK_REMINDERS) {
          if (minutesUntilDue > reminderMinutes - 5 && minutesUntilDue <= reminderMinutes) {
            console.log(`Sending notification for task ${task.text} to ${user_email}`);
            
            let reminderText = '';
            if (reminderMinutes >= 60) {
              const hours = Math.round(reminderMinutes / 60);
              reminderText = `due in ${hours} hour${hours > 1 ? 's' : ''}`;
            } else {
              reminderText = `due in ${reminderMinutes} minutes`;
            }
            
            await sendNotification(
              user_email,
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
 * Check for FloChat reminders - tasks that contain "remind" keywords
 */
export async function checkFloChatReminders() {
  try {
    const now = new Date();
    
    const subscriptions = await db.selectDistinct({ user_email: pushSubscriptions.user_email }).from(pushSubscriptions);
    
    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return;
    }
    
    const user_emails = new Set<string>(subscriptions.map(row => row.user_email!));
    
    console.log(`Checking FloChat reminders for ${user_emails.size} users`);
    
    for (const user_email of Array.from(user_emails)) {
      // Look for tasks that contain reminder keywords and are due soon
      const reminderTasks = await db
        .select()
        .from(tasks)
        .where(and(
          eq(tasks.user_email, user_email),
          eq(tasks.done, false),
          sql`(${tasks.text} ILIKE '%remind%' OR ${tasks.text} ILIKE '%reminder%' OR ${tasks.text} ILIKE '%flocat%' OR ${tasks.text} ILIKE '%don''t forget%')`,
          lte(tasks.dueDate, new Date(now.getTime() + 15 * 60 * 1000)) // Due in next 15 minutes
        ))
        .orderBy(tasks.dueDate)
        .limit(5);
      
      if (reminderTasks.length === 0) {
        continue;
      }
      
      for (const task of reminderTasks) {
        const taskDue = new Date(task.dueDate!);
        const minutesUntilDue = Math.round((taskDue.getTime() - now.getTime()) / (1000 * 60));
        
        // Only send if within 15 minutes and not already sent (using tag)
        if (minutesUntilDue <= 15 && minutesUntilDue >= -5) {
          console.log(`Sending FloChat reminder for task ${task.text} to ${user_email}`);
          
          let timeText = '';
          if (minutesUntilDue > 0) {
            timeText = `in ${minutesUntilDue} minute${minutesUntilDue > 1 ? 's' : ''}`;
          } else if (minutesUntilDue === 0) {
            timeText = 'now';
          } else {
            timeText = `${Math.abs(minutesUntilDue)} minute${Math.abs(minutesUntilDue) > 1 ? 's' : ''} ago`;
          }
          
          await sendNotification(
            user_email,
            `🐱 FloChat Reminder`,
            `${task.text} - Due ${timeText}`,
            {
              taskId: task.id,
              url: `/dashboard/tasks?id=${task.id}`,
              type: 'flocat-reminder',
            },
            `flocat-reminder-${task.id}`,
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
  } catch (error) {
    console.error('Error checking FloChat reminders:', error);
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
    
    // Check for FloChat reminders
    await checkFloChatReminders();
    
    console.log('Notification scheduler completed at', new Date().toISOString());
  } catch (error) {
    console.error('Error running notification scheduler:', error);
  }
}