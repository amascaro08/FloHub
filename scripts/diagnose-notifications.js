#!/usr/bin/env node
// scripts/diagnose-notifications.js
// Comprehensive notification system diagnostic

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

function checkEnvironmentConfig() {
  console.log('🔧 Environment Configuration Check:');
  console.log('=====================================');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const envExists = fs.existsSync(envPath);
  
  console.log(`✓ .env.local file exists: ${envExists ? 'YES' : 'NO'}`);
  
  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log(`✓ NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'SET' : 'MISSING'}`);
    console.log(`✓ VAPID_PRIVATE_KEY: ${process.env.VAPID_PRIVATE_KEY ? 'SET' : 'MISSING'}`);
    console.log(`✓ VAPID_MAILTO: ${process.env.VAPID_MAILTO ? process.env.VAPID_MAILTO : 'MISSING'}`);
    console.log(`✓ NEON_DATABASE_URL: ${process.env.NEON_DATABASE_URL ? 'SET' : 'MISSING'}`);
    
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      console.log(`✓ Public key length: ${process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.length} characters`);
    }
  } else {
    console.log('❌ .env.local file not found!');
    console.log('💡 Run: node scripts/generate-vapid-keys.js');
  }
  
  console.log('');
}

function checkServiceWorker() {
  console.log('🔧 Service Worker File Check:');
  console.log('==============================');
  
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const swExists = fs.existsSync(swPath);
  
  console.log(`✓ Service worker file exists: ${swExists ? 'YES' : 'NO'}`);
  
  if (swExists) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    console.log(`✓ File size: ${(swContent.length / 1024).toFixed(2)} KB`);
    console.log(`✓ Contains push handler: ${swContent.includes('addEventListener(\'push\'') ? 'YES' : 'NO'}`);
    console.log(`✓ Contains notification handler: ${swContent.includes('showNotification') ? 'YES' : 'NO'}`);
  }
  
  console.log('');
}

function checkAppConfiguration() {
  console.log('🔧 App Configuration Check:');
  console.log('============================');
  
  const appPath = path.join(process.cwd(), 'pages', '_app.tsx');
  const appExists = fs.existsSync(appPath);
  
  if (appExists) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    const swRegistered = appContent.includes('serviceWorker.register') && !appContent.includes('/*');
    console.log(`✓ Service worker registration: ${swRegistered ? 'ENABLED' : 'DISABLED'}`);
    
    if (!swRegistered) {
      console.log('❌ Service worker registration is commented out or missing!');
      console.log('💡 Check pages/_app.tsx and uncomment the service worker registration code');
    }
  } else {
    console.log('❌ pages/_app.tsx not found!');
  }
  
  console.log('');
}

async function checkDatabase() {
  console.log('🔧 Database Connection Check:');
  console.log('==============================');
  
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl || databaseUrl === 'your-neon-database-url-here') {
    console.log('⚠️  Database URL not configured');
    console.log('💡 Add NEON_DATABASE_URL to your .env.local file for full functionality');
    console.log('');
    return;
  }
  
  try {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(databaseUrl);
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✓ Database connection: SUCCESS');
    
    // Check if table exists
    const tables = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pushSubscriptions'
      );
    `;
    
    console.log(`✓ pushSubscriptions table exists: ${tables[0].exists ? 'YES' : 'NO'}`);
    
    if (tables[0].exists) {
      const count = await sql`SELECT COUNT(*) as count FROM "pushSubscriptions"`;
      console.log(`✓ Current subscriptions: ${count[0].count}`);
    }
    
  } catch (error) {
    console.log('❌ Database connection: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('');
}

function checkNotificationFiles() {
  console.log('🔧 Notification Component Check:');
  console.log('=================================');
  
  const files = [
    'lib/notifications.ts',
    'components/ui/NotificationManager.tsx',
    'components/ui/NotificationDebug.tsx',
    'pages/api/notifications/test.ts',
    'pages/api/notifications/send.ts'
  ];
  
  files.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    console.log(`✓ ${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
  });
  
  console.log('');
}

function provideTroubleshootingSteps() {
  console.log('🔧 Troubleshooting Steps:');
  console.log('==========================');
  
  console.log('1. 🔄 Restart your development server');
  console.log('   npm run dev');
  console.log('');
  
  console.log('2. 🧹 Clear browser data (if on mobile/Android)');
  console.log('   - Open Chrome settings');
  console.log('   - Privacy and Security > Clear browsing data');
  console.log('   - Select "All time" and clear site data');
  console.log('');
  
  console.log('3. 🔔 Re-enable notifications');
  console.log('   - Go to Settings > Notifications');
  console.log('   - If enabled, click "Disable" then "Enable" again');
  console.log('   - This creates fresh subscriptions with new VAPID keys');
  console.log('');
  
  console.log('4. 🧪 Test notifications');
  console.log('   - Click "Send Test Notification" button');
  console.log('   - Check browser console for errors');
  console.log('   - Use "Show Debug" for detailed information');
  console.log('');
  
  console.log('5. 📱 Android-specific tips');
  console.log('   - Use Chrome browser (not Samsung Internet or others)');
  console.log('   - Ensure Chrome is updated to latest version');
  console.log('   - Check Android notification settings allow notifications');
  console.log('');
}

async function runDiagnostics() {
  console.log('🚀 FlowHub Push Notification Diagnostics');
  console.log('=========================================\n');
  
  checkEnvironmentConfig();
  checkServiceWorker();
  checkAppConfiguration();
  await checkDatabase();
  checkNotificationFiles();
  provideTroubleshootingSteps();
  
  console.log('✅ Diagnostic complete!');
  console.log('📝 Review the output above to identify any issues.');
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('💥 Diagnostic failed:', error);
});