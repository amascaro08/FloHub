// scripts/generate-vapid-keys.js
// Script to generate VAPID keys for push notifications

const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n=== VAPID Keys for Push Notifications ===\n');
console.log(`Public Key:\n${vapidKeys.publicKey}\n`);
console.log(`Private Key:\n${vapidKeys.privateKey}\n`);

console.log('=== Instructions ===\n');
console.log('1. Add these keys to your .env.local file:');
console.log(`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_MAILTO=your-email@example.com  # Replace with your email
`);

console.log('2. Make sure to replace VAPID_MAILTO with your actual email address.');
console.log('3. Restart your development server for the changes to take effect.');
console.log('\nThese keys are used to authenticate your server when sending push notifications.');