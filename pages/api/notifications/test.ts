// pages/api/notifications/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { firestore } from '@/lib/firebaseAdmin';
import webpush from 'web-push';

type Data = {
  success: boolean;
  message?: string;
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
    // Get user token
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    if (!token?.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userEmail = token.email as string;
    
    // Get user's subscriptions from Firestore
    const subscriptionsSnapshot = await firestore
      .collection('pushSubscriptions')
      .where('userEmail', '==', userEmail)
      .get();
    
    if (subscriptionsSnapshot.empty) {
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

    const sendPromises = subscriptionsSnapshot.docs.map(async (doc) => {
      const subscription = doc.data().subscription;
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(notificationPayload)
        );
        return { success: true, subscriptionId: doc.id };
      } catch (error: any) {
        console.error(`Error sending notification to subscription ${doc.id}:`, error);
        
        // If subscription is expired or invalid, delete it
        if (error.statusCode === 404 || error.statusCode === 410) {
          await firestore.collection('pushSubscriptions').doc(doc.id).delete();
          return { 
            success: false, 
            subscriptionId: doc.id, 
            error: 'Subscription expired or invalid, removed from database' 
          };
        }
        
        return { 
          success: false, 
          subscriptionId: doc.id, 
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
    return res.status(500).json({ 
      success: false, 
      message: `Internal server error: ${error.message}` 
    });
  }
}