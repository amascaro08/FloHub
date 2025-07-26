#!/usr/bin/env node
// scripts/test-push-notification.js
// Diagnostic script for push notification issues

require('dotenv').config({ path: '.env.local' });
const webpush = require('web-push');

async function testPushNotificationSetup() {
  console.log('🔍 Diagnosing Push Notification Setup...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidMailto = process.env.VAPID_MAILTO;
  
  console.log(`- VAPID Public Key: ${vapidPublic ? `${vapidPublic.substring(0, 20)}...` : '❌ Missing'}`);
  console.log(`- VAPID Private Key: ${vapidPrivate ? `${vapidPrivate.substring(0, 20)}...` : '❌ Missing'}`);
  console.log(`- VAPID Mailto: ${vapidMailto || '❌ Missing'}`);
  
  if (!vapidPublic || !vapidPrivate || !vapidMailto) {
    console.log('\n❌ Missing VAPID configuration');
    console.log('Run: npm run notifications:generate-keys');
    process.exit(1);
  }
  
  // Test VAPID configuration
  console.log('\n🔧 Testing VAPID Configuration:');
  try {
    webpush.setVapidDetails(
      'mailto:' + vapidMailto,
      vapidPublic,
      vapidPrivate
    );
    console.log('✅ VAPID configuration is valid');
  } catch (error) {
    console.log('❌ VAPID configuration error:', error.message);
    process.exit(1);
  }
  
  // Test sample subscription format
  console.log('\n🧪 Testing Sample Push Subscription:');
  const sampleSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/sample',
    keys: {
      p256dh: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
      auth: 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTWKSKHw'
    }
  };
  
  try {
    // This will fail with the sample endpoint, but should validate the format
    await webpush.sendNotification(
      sampleSubscription,
      JSON.stringify({
        title: 'Test',
        body: 'Test notification'
      })
    );
  } catch (error) {
    if (error.statusCode === 400 && error.message.includes('InvalidRegistration')) {
      console.log('✅ Subscription format validation passed (expected error for sample endpoint)');
    } else if (error.statusCode === 401) {
      console.log('❌ VAPID authentication failed - check your keys');
      console.log('Error:', error.message);
      process.exit(1);
    } else {
      console.log('⚠️ Unexpected error (may be normal for sample endpoint):', error.message);
    }
  }
  
  // Common issues guide
  console.log('\n📖 Common Push Notification Issues:');
  console.log('1. "Received unexpected response code" - Usually means:');
  console.log('   - Browser push service is temporarily unavailable');
  console.log('   - Network connectivity issues');
  console.log('   - Invalid subscription (browser unsubscribed)');
  console.log('   - Rate limiting from push service');
  
  console.log('\n2. "Unauthorized" (401) - Usually means:');
  console.log('   - Invalid VAPID keys');
  console.log('   - VAPID keys don\'t match the subscription');
  console.log('   - VAPID mailto is invalid');
  
  console.log('\n3. "Subscription not found" (404/410) - Usually means:');
  console.log('   - Browser has unsubscribed');
  console.log('   - Subscription has expired');
  console.log('   - User cleared browser data');
  
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. Try refreshing the page and re-enabling notifications');
  console.log('2. Clear browser cache and cookies');
  console.log('3. Check browser console for errors');
  console.log('4. Try in an incognito/private window');
  console.log('5. Test on a different browser/device');
  
  console.log('\n✅ VAPID setup appears correct!');
  console.log('💡 If test notifications still fail, the issue is likely:');
  console.log('   - Temporary push service issues (try again later)');
  console.log('   - Network connectivity problems');
  console.log('   - Browser subscription has become invalid');
}

// Run the diagnostic
testPushNotificationSetup()
  .then(() => {
    console.log('\n🎉 Diagnostic complete!');
  })
  .catch((error) => {
    console.error('\n💥 Diagnostic failed:', error);
    process.exit(1);
  });