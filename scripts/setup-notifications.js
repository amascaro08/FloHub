#!/usr/bin/env node
// scripts/setup-notifications.js
// Setup script for notifications

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔔 Setting up FlowHub Notifications...\n');

// Check if web-push is installed
try {
  require('web-push');
  console.log('✅ web-push package is installed');
} catch (error) {
  console.log('📦 Installing web-push package...');
  execSync('npm install web-push', { stdio: 'inherit' });
  console.log('✅ web-push package installed');
}

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('📝 Please create .env.local file with required variables');
  console.log('💡 You can copy from .env.example and update the values');
  console.log('\nRequired variables:');
  console.log('- NEXT_PUBLIC_VAPID_PUBLIC_KEY');
  console.log('- VAPID_PRIVATE_KEY');
  console.log('- VAPID_MAILTO');
  console.log('- INTERNAL_API_KEY');
  console.log('- NEXT_PUBLIC_BASE_URL');
  
  console.log('\n🔑 Run the following to generate VAPID keys:');
  console.log('node scripts/generate-vapid-keys.js');
  process.exit(1);
}

console.log('✅ .env.local file found');

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
const requiredVars = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_MAILTO',
  'INTERNAL_API_KEY'
];

let missingVars = [];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.log(`   - ${varName}`));
  console.log('\n🔑 Run the following to generate VAPID keys:');
  console.log('node scripts/generate-vapid-keys.js');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Test VAPID configuration
try {
  const webpush = require('web-push');
  webpush.setVapidDetails(
    'mailto:' + process.env.VAPID_MAILTO,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('✅ VAPID configuration is valid');
} catch (error) {
  console.log('❌ VAPID configuration error:', error.message);
  process.exit(1);
}

// Check service worker
const swPath = path.join(process.cwd(), 'public', 'sw.js');
if (!fs.existsSync(swPath)) {
  console.log('❌ Service worker not found at public/sw.js');
  process.exit(1);
}

const swContent = fs.readFileSync(swPath, 'utf8');
if (swContent.trim().length === 0) {
  console.log('❌ Service worker file is empty');
  process.exit(1);
}

console.log('✅ Service worker is configured');

console.log('\n🎉 Notification setup complete!');
console.log('\nNext steps:');
console.log('1. Start your development server: npm run dev');
console.log('2. Go to Settings > Notifications');
console.log('3. Click "Enable" to test notifications');
console.log('4. Send a test notification to verify everything works');

console.log('\n📅 To enable automatic reminders:');
console.log('Set up a cron job to run: node -e "fetch(\'http://localhost:3000/api/notifications/scheduler\', { method: \'POST\', headers: { \'x-api-key\': \'your-internal-api-key\' } })"');
console.log('Recommended: Every 5 minutes (*/5 * * * *)');

console.log('\n📝 For production:');
console.log('1. Update NEXT_PUBLIC_BASE_URL to your production domain');
console.log('2. Generate new VAPID keys for production');
console.log('3. Set up proper cron job or scheduled task');
console.log('4. Configure email settings for user notifications');