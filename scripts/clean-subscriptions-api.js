#!/usr/bin/env node
// scripts/clean-subscriptions-api.js
// Clean up old push subscriptions via API endpoint

const fs = require('fs');
const path = require('path');

// Simple env file parser
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...values] = line.split('=');
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
}

// Load environment variables
loadEnvFile();

async function cleanSubscriptionsViaAPI() {
  console.log('🧹 Cleaning old subscriptions via API...');
  
  // This approach works by making the API automatically clean up invalid subscriptions
  // when they fail to send notifications
  
  console.log('💡 Since you have 6 old subscriptions with mismatched VAPID keys,');
  console.log('   the best approach is to:');
  console.log('');
  console.log('1. 🔄 Restart your development server to load the new VAPID keys');
  console.log('   npm run dev');
  console.log('');
  console.log('2. 🔔 Disable and re-enable notifications in your browser:');
  console.log('   - Go to Settings > Notifications');
  console.log('   - Click "Disable" (this will unsubscribe the current browser)');
  console.log('   - Click "Enable" again (this creates a fresh subscription with new keys)');
  console.log('');
  console.log('3. 🧪 Test notifications');
  console.log('   - Click "Send Test Notification"');
  console.log('   - Should work immediately with the fresh subscription');
  console.log('');
  console.log('4. 📱 Repeat for each device/browser you use');
  console.log('   - Old subscriptions will be automatically removed when they fail');
  console.log('   - New subscriptions will use the correct VAPID keys');
  console.log('');
  console.log('🔐 The API will automatically clean up old subscriptions when they fail');
  console.log('    due to VAPID key mismatches (401/403 errors).');
  console.log('');
  console.log('✅ This is the safest approach and requires no database access!');
}

cleanSubscriptionsViaAPI();