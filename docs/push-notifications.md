# Push Notifications in FlowHub

This document explains how to set up and use push notifications in FlowHub.

## Overview

FlowHub uses the Web Push API to send push notifications to users about upcoming meetings and tasks. The system consists of:

1. A service worker that receives push events and displays notifications
2. A client-side library for managing notification permissions and subscriptions
3. Server-side endpoints for storing subscriptions and sending notifications
4. A scheduler that checks for upcoming meetings and tasks and sends notifications

## Setup Instructions

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to authenticate your server when sending push notifications. To generate these keys:

```bash
node scripts/generate-vapid-keys.js
```

This will output a public key and a private key. Add these to your `.env.local` file:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_MAILTO=your-email@example.com  # Replace with your email
```

### 2. Set Up Internal API Key

For secure communication between your notification scheduler and the API endpoints, set an internal API key:

```
INTERNAL_API_KEY=your_secure_random_string
```

### 3. Set Base URL

Set the base URL for your application:

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # For development
NEXT_PUBLIC_BASE_URL=https://your-domain.com  # For production
```

### 4. Restart Your Development Server

After adding these environment variables, restart your development server for the changes to take effect.

## How It Works

### User Subscription Flow

1. User visits the Settings page and clicks "Enable" in the Notifications section
2. Browser prompts for notification permission
3. If granted, the app subscribes to push notifications and stores the subscription in Firestore
4. User can test notifications by clicking "Send Test Notification"
5. User can disable notifications by clicking "Disable"

### Notification Sending Flow

1. The notification scheduler runs periodically (via cron job or manual trigger)
2. It checks for upcoming meetings and tasks
3. For each upcoming event, it sends a notification to the user's subscribed devices
4. The service worker receives the push event and displays the notification
5. When the user clicks the notification, they are taken to the relevant page in the app

## Notification Types

### Meeting Reminders

- Sent 15 minutes and 5 minutes before a meeting starts
- Contains the meeting title, start time, and a link to view the meeting details

### Task Reminders

- Sent 24 hours and 1 hour before a task is due
- Contains the task description, due date, and options to view or mark as done

## Testing

You can test the notification system by:

1. Enabling notifications in the Settings page
2. Clicking "Send Test Notification" to receive a test notification
3. Manually triggering the scheduler by making a POST request to `/api/notifications/scheduler` with the appropriate API key

## Troubleshooting

### Notifications Not Working

1. Check that your browser supports push notifications
2. Ensure notification permission is granted (check browser settings)
3. Verify that the service worker is registered (check browser developer tools)
4. Check for errors in the browser console or server logs

### Common Issues

- **Permission Denied**: The user has denied notification permission. They need to update their browser settings.
- **Subscription Failed**: There might be an issue with the VAPID keys or network connectivity.
- **Notifications Not Received**: The service worker might not be registered or the push subscription might be invalid.

## Production Deployment

For production deployment:

1. Ensure all environment variables are set correctly
2. Set up a cron job to trigger the notification scheduler regularly (e.g., every 5 minutes)
3. Consider implementing rate limiting to prevent abuse
4. Monitor server logs for errors

## Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Notification)