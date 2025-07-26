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
      body: 'This is a test notification from FloCat!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: '/dashboard',
        type: 'test'
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

    for (const sub of subscriptions) {
      try {
        console.log(`Sending notification to subscription ${sub.id}`);
        await webpush.sendNotification(
          sub.subscription as any,
          JSON.stringify(notificationPayload)
        );
        results.push({ subscriptionId: sub.id, success: true });
        successCount++;
      } catch (error: any) {
        console.error(`Error sending notification to subscription ${sub.id}:`, error);
        
        // If subscription is invalid, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          try {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
            console.log(`Removed invalid subscription ${sub.id}`);
          } catch (deleteError) {
            console.error(`Error removing invalid subscription ${sub.id}:`, deleteError);
          }
        }
        
        results.push({ 
          subscriptionId: sub.id, 
          success: false, 
          error: error.message 
        });
      }
    }

    if (successCount === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test notification to any subscriptions',
        results
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test notification sent to ${successCount} of ${results.length} subscriptions`
    });

  } catch (error: any) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}