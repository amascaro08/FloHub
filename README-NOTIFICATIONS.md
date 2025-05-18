# Setting Up Push Notifications in FlowHub

This guide explains how to properly set up push notifications in FlowHub.

## VAPID Keys Setup

Push notifications in FlowHub use the Web Push API, which requires VAPID (Voluntary Application Server Identification) keys for authentication. Follow these steps to set up VAPID keys:

### 1. Generate VAPID Keys

Run the following command in your terminal:

```bash
node scripts/generate-vapid-keys.js
```

This will output a public key and a private key.

### 2. Add VAPID Keys to Environment Variables

Create a `.env.local` file in the root directory of your project (if it doesn't exist already) and add the following:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_MAILTO=your-email@example.com  # Replace with your email
```

Replace `your_public_key_here`, `your_private_key_here`, and `your-email@example.com` with the values generated in step 1 and your actual email address.

### 3. Restart Your Development Server

After adding the environment variables, restart your development server for the changes to take effect:

```bash
npm run dev
```

## Troubleshooting
test
### "VAPID public key is not configured" Error

If you see this error when trying to enable notifications, it means the VAPID public key is not properly configured. Check that:

1. You've generated VAPID keys using the script
2. You've added the keys to your `.env.local` file
3. You've restarted your development server

### Mobile Device Issues

#### Android

Push notifications on Android require:
- A valid VAPID key
- HTTPS connection (or localhost for development)
- Chrome or compatible browser

#### iOS

Push notifications on iOS have limited support:
- Safari on iOS has limited support for the Web Push API
- Make sure notifications are enabled in Safari settings
- For best results, add the app to the home screen

## Default Configuration

For development purposes, FlowHub includes default VAPID keys in the code. However, **these should not be used in production**. Always generate your own VAPID keys for production environments.

## Additional Resources

- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Worker API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Notification)