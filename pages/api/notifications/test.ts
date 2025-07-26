// pages/api/notifications/test.ts
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
  debug?: any;
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
  console.error('Error configuring web-push:', error);
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
    // Check if database is available
    if (!process.env.NEON_DATABASE_URL || process.env.NEON_DATABASE_URL === 'your-neon-database-url-here') {
      return res.status(500).json({ 
        success: false, 
        message: 'Database not configured. In production, this is set in Vercel environment variables. For local development, add NEON_DATABASE_URL to .env.local' 
      });
    }

    // Get user token
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user_email = user.email;
    console.log('Sending test notification to:', user_email);

    // Get push subscriptions for this user
    let subscriptions;
    try {
      subscriptions = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.user_email, user_email));
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      
      // Check for specific database errors
      if (dbError.message?.includes('relation "pushSubscriptions" does not exist') || 
          dbError.message?.includes('pushSubscriptions')) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database table not found. The pushSubscriptions table needs to be created. Run database migrations or contact your administrator.' 
        });
      }
      
      if (dbError.message?.includes('connection') || dbError.message?.includes('ENOTFOUND')) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database connection failed. Please check your database configuration.' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: `Database error: ${dbError.message}` 
      });
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No push subscriptions found. Please enable notifications first.' 
      });
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Send a test notification to each subscription
    const notificationPayload = {
      title: 'FlowHub Test Notification',
      body: 'This is a test notification from FloCat! 🐱',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: '/dashboard',
        type: 'test',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Dashboard'
        }
      ]
    };

    const results = [];
    let successCount = 0;
    const debugInfo = {
      vapidConfigured: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      subscriptionCount: subscriptions.length,
      subscriptionDetails: [] as Array<{ id: string; endpoint: string; hasKeys: boolean; }>
    };

    for (const sub of subscriptions) {
      try {
        console.log(`Sending notification to subscription ${sub.id}`);
        
        // Validate subscription object
        const subscription = sub.subscription as any;
        if (!subscription || !subscription.endpoint) {
          throw new Error('Invalid subscription: missing endpoint');
        }
        
        debugInfo.subscriptionDetails.push({
          id: sub.id,
          endpoint: subscription.endpoint?.substring(0, 50) + '...',
          hasKeys: !!(subscription.keys && subscription.keys.p256dh && subscription.keys.auth)
        });

        // Send notification with timeout
        const sendPromise = webpush.sendNotification(
          subscription,
          JSON.stringify(notificationPayload)
        );
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Notification send timeout (30s)')), 30000);
        });
        
        await Promise.race([sendPromise, timeoutPromise]);
        
        results.push({ subscriptionId: sub.id, success: true });
        successCount++;
        console.log(`✅ Notification sent successfully to ${sub.id}`);
        
      } catch (error: any) {
        console.error(`❌ Error sending notification to subscription ${sub.id}:`, error);
        
        let errorMessage = error.message;
        let shouldRemoveSubscription = false;
        
        // Handle specific error types
        if (error.statusCode) {
          switch (error.statusCode) {
            case 400:
              errorMessage = 'Bad request - Invalid subscription or payload';
              break;
            case 401:
              errorMessage = 'Unauthorized - Invalid VAPID keys';
              break;
            case 404:
              errorMessage = 'Subscription not found - Browser may have unsubscribed';
              shouldRemoveSubscription = true;
              break;
            case 410:
              errorMessage = 'Subscription expired - Browser no longer accepts notifications';
              shouldRemoveSubscription = true;
              break;
            case 413:
              errorMessage = 'Payload too large - Notification content exceeds size limits';
              break;
            case 429:
              errorMessage = 'Rate limited - Too many notifications sent too quickly';
              break;
            case 500:
              errorMessage = 'Push service internal error - Try again later';
              break;
            default:
              errorMessage = `Push service error (${error.statusCode}): ${error.message}`;
          }
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Network timeout - Push service took too long to respond';
        } else if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
          errorMessage = 'Network error - Cannot reach push service';
        } else if (error.message?.includes('Invalid subscription')) {
          errorMessage = 'Invalid subscription format';
          shouldRemoveSubscription = true;
        }
        
        // Remove invalid subscriptions
        if (shouldRemoveSubscription) {
          try {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            console.log(`🗑️ Removed invalid subscription ${sub.id}`);
            errorMessage += ' (Subscription removed)';
          } catch (deleteError) {
            console.error(`Error removing invalid subscription ${sub.id}:`, deleteError);
          }
        }
        
        results.push({ 
          subscriptionId: sub.id, 
          success: false, 
          error: errorMessage,
          statusCode: error.statusCode,
          originalError: error.message
        });
      }
    }

    // Return detailed response
    if (successCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test notification to any subscriptions. Check the results for details.',
        results,
        debug: debugInfo
      });
    }

    if (successCount < results.length) {
      return res.status(207).json({
        success: true,
        message: `Test notification sent to ${successCount} of ${results.length} subscriptions. Some failed - check results.`,
        results,
        debug: debugInfo
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test notification sent successfully to all ${successCount} subscription(s)! 🎉`,
      results,
      debug: debugInfo
    });

  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}