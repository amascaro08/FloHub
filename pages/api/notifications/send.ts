// pages/api/notifications/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import { db } from '@/lib/drizzle';
import { pushSubscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import webpush from 'web-push';

type Data = {
  success: boolean;
  message?: string;
  results?: any[];
};

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_MAILTO!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get user token for authentication
    const decoded = auth(req);
    let user = null;
    if (decoded) {
      user = await getUserById(decoded.userId);
    }
    
    // Check if request is from an authorized source (either a logged-in user or an internal API)
    const isInternalRequest = req.headers['x-api-key'] === process.env.INTERNAL_API_KEY;
    
    if (!user?.email && !isInternalRequest) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Get notification data from request body
    const { 
      user_email, 
      title, 
      body, 
      icon = '/icons/icon-192x192.png',
      badge = '/icons/icon-72x72.png',
      tag,
      data = {},
      actions = []
    } = req.body;
    
    // Validate required fields
    if (!user_email || !title || !body) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: user_email, title, body' 
      });
    }

    // If it's a user request, ensure they can only send to themselves
    if (user?.email && user.email !== user_email && !isInternalRequest) {
      return res.status(403).json({
        success: false,
        message: 'You can only send notifications to yourself'
      });
    }
    
    // Get user's subscriptions from Firestore
    const subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.user_email, user_email));
    
    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No push subscriptions found for this user'
      });
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body,
      icon,
      badge,
      tag: tag || 'default',
      data: {
        ...data,
        timestamp: Date.now()
      },
      actions
    };

    // Send notification to each subscription
    const sendPromises = subscriptions.map(async (sub) => {
      const subscription = sub.subscription as webpush.PushSubscription; // Assuming subscription is already an object
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
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
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
      message: `Notification sent to ${successCount} of ${results.length} subscriptions`,
      results
    });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}