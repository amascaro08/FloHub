// pages/api/notifications/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { query } from '@/lib/neon';
import webpush from 'web-push';

type Data = {
  success: boolean;
  message?: string;
};

// Configure web-push with VAPID keys
// Use default values if environment variables are not set
const vapidMailto = process.env.VAPID_MAILTO || 'example@example.com';
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ||
  'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTWKSKHw';

try {
  webpush.setVapidDetails(
    'mailto:' + vapidMailto,
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('Web-push configured with VAPID keys');
} catch (error) {
  console.error('Failed to configure web-push with VAPID keys:', error);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get user token
    const user = await auth(req);
    
    if (!user?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userEmail = user.id;
    
    // Get user's subscriptions from Firestore
    const { rows: subscriptions } = await query(
      `SELECT id, subscription FROM "pushSubscriptions" WHERE "userEmail" = $1`,
      [userEmail]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No push subscriptions found for this user'
      });
    }

    // Send a test notification to each subscription
    const notificationPayload = {
      title: 'FlowHub Test Notification',
      body: 'This is a test notification from FloCat!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: '/dashboard',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view_dashboard',
          title: 'View Dashboard'
        }
      ]
    };

    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = sub.subscription; // Assuming subscription is already an object
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(notificationPayload)
        );
        return { success: true, subscriptionId: sub.id };
      } catch (error: any) {
        console.error(`Error sending notification to subscription ${sub.id}:`, error);
        
        // If subscription is expired or invalid, delete it
        if (error.statusCode === 404 || error.statusCode === 410) {
          await query('DELETE FROM "pushSubscriptions" WHERE id = $1', [sub.id]);
          return {
            success: false,
            subscriptionId: sub.id,
            error: 'Subscription expired or invalid, removed from database'
          };
        }
        
        return {
          success: false,
          subscriptionId: sub.id,
          error: error.message
        };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;
    
    return res.status(200).json({ 
      success: true, 
      message: `Test notification sent to ${successCount} of ${results.length} subscriptions` 
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    
    // Check if the error is related to VAPID keys
    if (error.message && (
      error.message.includes('VAPID') ||
      error.message.includes('vapid') ||
      error.message.includes('key')
    )) {
      return res.status(500).json({
        success: false,
        message: 'VAPID keys are not properly configured. Please run the generate-vapid-keys.js script and add the keys to your environment variables.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`
    });
  }
}