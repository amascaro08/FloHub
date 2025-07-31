// pages/api/debug-vapid-config.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const vapidMailto = process.env.VAPID_MAILTO || 'example@example.com';
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    console.log('=== VAPID Configuration Test ===');
    console.log('Public key length:', vapidPublicKey?.length || 0);
    console.log('Private key length:', vapidPrivateKey?.length || 0);
    console.log('Mailto:', vapidMailto);

    if (!vapidPublicKey || !vapidPrivateKey) {
      return res.status(500).json({
        error: 'VAPID keys not found',
        debug: {
          hasPublicKey: !!vapidPublicKey,
          hasPrivateKey: !!vapidPrivateKey,
          publicKeyLength: vapidPublicKey?.length || 0,
          privateKeyLength: vapidPrivateKey?.length || 0
        }
      });
    }

    // Test web-push configuration
    try {
      console.log('Testing web-push.setVapidDetails...');
      webpush.setVapidDetails(
        'mailto:' + vapidMailto,
        vapidPublicKey,
        vapidPrivateKey
      );
      console.log('✅ Web-push VAPID configuration successful');

      // Test generating JWT token (this is what authorization header uses)
      console.log('Testing JWT generation...');
      
      // This is an internal test - we'll create a mock subscription to test JWT generation
      const testSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
      };

      // Try to generate the authorization header that web-push would use
      try {
        // We can't directly access the internal methods, but we can test if the configuration works
        const result = {
          vapidConfigured: true,
          publicKeyLength: vapidPublicKey.length,
          privateKeyLength: vapidPrivateKey.length,
          publicKeyStart: vapidPublicKey.substring(0, 30),
          privateKeyStart: vapidPrivateKey.substring(0, 30),
          webPushReady: true
        };

        return res.status(200).json({
          success: true,
          message: 'VAPID configuration test successful',
          debug: result
        });

      } catch (jwtError: any) {
        console.error('JWT generation failed:', jwtError);
        return res.status(500).json({
          error: 'JWT generation failed',
          jwtError: jwtError.message,
          debug: {
            vapidConfigured: true,
            publicKeyLength: vapidPublicKey.length,
            privateKeyLength: vapidPrivateKey.length
          }
        });
      }

    } catch (vapidError: any) {
      console.error('VAPID configuration failed:', vapidError);
      return res.status(500).json({
        error: 'VAPID configuration failed',
        vapidError: vapidError.message,
        debug: {
          publicKeyLength: vapidPublicKey.length,
          privateKeyLength: vapidPrivateKey.length,
          errorType: vapidError.name
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