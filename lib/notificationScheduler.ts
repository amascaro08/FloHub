// lib/notificationScheduler.ts
// Scheduler for sending notifications for upcoming meetings and tasks

import { firestore } from './firebaseAdmin';
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
    const subscriptionsSnapshot = await firestore
      .collection('pushSubscriptions')
      .get();
    
    if (subscriptionsSnapshot.empty) {
      console.log('No push subscriptions found');
      return;
    }
    
    // Get unique user emails
    const userEmails = new Set<string>();
    subscriptionsSnapshot.docs.forEach(doc => {
      userEmails.add(doc.data().userEmail);
    });
    
    console.log(`Checking upcoming meetings for ${userEmails.size} users`);
    
    // For each user, check their upcoming meetings
    for (const userEmail of Array.from(userEmails)) {
      // Get user's calendar settings
      const userSettingsDoc = await firestore
        .collection('users')
        .doc(userEmail)
        .get();
      
      if (!userSettingsDoc.exists) {
        console.log(`No settings found for user ${userEmail}`);
        continue;
      }
      
      // Get upcoming meetings from Firestore
      // This assumes you have a collection of calendar events
      // You may need to adjust this based on your actual data structure
      const eventsSnapshot = await firestore
        .collection('users')
        .doc(userEmail)
        .collection('calendarEvents')
        .where('start.dateTime', '>', now.toISOString())
        .orderBy('start.dateTime', 'asc')
        .limit(10)
        .get();
      
      if (eventsSnapshot.empty) {
        console.log(`No upcoming meetings found for user ${userEmail}`);
        continue;
      }
      
      // Check each meeting for notification timing
      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data();
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
                eventId: eventDoc.id,
                url: `/dashboard/meetings?id=${eventDoc.id}`,
                type: 'meeting',
              },
              `meeting-${eventDoc.id}`,
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
    const subscriptionsSnapshot = await firestore
      .collection('pushSubscriptions')
      .get();
    
    if (subscriptionsSnapshot.empty) {
      console.log('No push subscriptions found');
      return;
    }
    
    // Get unique user emails
    const userEmails = new Set<string>();
    subscriptionsSnapshot.docs.forEach(doc => {
      userEmails.add(doc.data().userEmail);
    });
    
    console.log(`Checking upcoming tasks for ${userEmails.size} users`);
    
    // For each user, check their upcoming tasks
    for (const userEmail of Array.from(userEmails)) {
      // Get upcoming tasks from Firestore
      const tasksSnapshot = await firestore
        .collection('users')
        .doc(userEmail)
        .collection('tasks')
        .where('done', '==', false)
        .where('dueDate', '>', now)
        .orderBy('dueDate', 'asc')
        .limit(10)
        .get();
      
      if (tasksSnapshot.empty) {
        console.log(`No upcoming tasks found for user ${userEmail}`);
        continue;
      }
      
      // Check each task for notification timing
      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        const taskDue = task.dueDate.toDate();
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
                taskId: taskDoc.id,
                url: `/dashboard/tasks?id=${taskDoc.id}`,
                type: 'task',
              },
              `task-${taskDoc.id}`,
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