// pages/api/debug-notification.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { getUserById } from '@/lib/user';
import webpush from 'web-push';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user
    const decoded = auth(req);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await getUserById(decoded.userId);
    if (!user?.email) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get VAPID configuration
    const vapidMailto = process.env.VAPID_MAILTO || 'example@example.com';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    console.log('=== NOTIFICATION DEBUG ===');
    console.log('VAPID Public Key:', vapidPublicKey?.substring(0, 20) + '...');
    console.log('VAPID Private Key:', vapidPrivateKey?.substring(0, 20) + '...');
    console.log('VAPID Mailto:', vapidMailto);

    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({
        error: 'VAPID keys not configured',
        debug: {
          hasPublicKey: !!vapidPublicKey,
          hasPrivateKey: !!vapidPrivateKey,
          mailto: vapidMailto
        }
      });
    }

    // Test VAPID key configuration
    try {
      webpush.setVapidDetails(
        'mailto:' + vapidMailto,
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('✅ VAPID configuration successful');
    } catch (vapidError: any) {
      console.error('❌ VAPID configuration failed:', vapidError);
      return res.status(500).json({
        error: 'VAPID configuration failed',
        vapidError: vapidError.message,
        debug: {
          publicKeyLength: vapidPublicKey.length,
          privateKeyLength: vapidPrivateKey.length,
          mailto: vapidMailto
        }
      });
    }

    // Get the subscription from request body
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        error: 'No subscription provided',
        receivedBody: req.body
      });
    }

    console.log('Subscription endpoint:', subscription.endpoint);
    console.log('Subscription keys:', Object.keys(subscription.keys || {}));
    console.log('Full subscription object:', JSON.stringify(subscription, null, 2));

    // Test notification payload - start with minimal payload
    const testPayload = {
      title: 'Test',
      body: 'Hello'
    };

    console.log('Attempting to send test notification...');

    // Test different payload and options
    const options = {
      TTL: 60, // Time to live in seconds
      headers: {
        'Urgency': 'normal'
      }
    };

    console.log('Using options:', options);
    console.log('Payload:', testPayload);

    try {
      // Try without options first
      console.log('Trying without options...');
      const result = await webpush.sendNotification(subscription, JSON.stringify(testPayload));
      console.log('✅ Notification sent successfully!');
      console.log('Send result:', result);
      
      return res.status(200).json({
        success: true,
        message: 'Debug notification sent successfully',
        debug: {
          vapidConfigured: true,
          subscriptionValid: true,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          hasKeys: !!(subscription.keys && subscription.keys.p256dh && subscription.keys.auth)
        }
      });

    } catch (sendError: any) {
      console.error('❌ Send notification failed:', sendError);
      
      return res.status(500).json({
        error: 'Failed to send notification',
        errorMessage: sendError.message,
        statusCode: sendError.statusCode,
        debug: {
          vapidConfigured: true,
          subscriptionEndpoint: subscription.endpoint,
          errorType: sendError.name,
          fullError: sendError.toString()
        }
      });
    }

  } catch (error: any) {
    console.error('Debug API error:', error);
    return res.status(500).json({
      error: 'Internal error',
      message: error.message
    });
  }
}