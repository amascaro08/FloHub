#!/usr/bin/env node
// scripts/clean-subscriptions.js
// Clean up old push subscriptions after VAPID key change

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function cleanOldSubscriptions() {
  console.log('🧹 Cleaning up old push subscriptions...');
  
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl || databaseUrl === 'your-neon-database-url-here') {
    console.log('⚠️  Database URL not configured - skipping cleanup');
    console.log('💡 Old subscriptions will be automatically cleaned up when they fail');
    return;
  }
  
  try {
    const sql = neon(databaseUrl);
    
    // Check current subscriptions
    console.log('🔍 Checking existing subscriptions...');
    const subscriptions = await sql`
      SELECT COUNT(*) as count, user_email
      FROM "pushSubscriptions" 
      GROUP BY user_email;
    `;
    
    if (subscriptions.length === 0) {
      console.log('✅ No subscriptions found - nothing to clean');
      return;
    }
    
    console.log('📊 Current subscriptions:');
    subscriptions.forEach(sub => {
      console.log(`   - ${sub.user_email}: ${sub.count} subscription(s)`);
    });
    
    // Clean up all subscriptions
    console.log('\n🗑️ Removing old subscriptions (will be recreated with new VAPID keys)...');
    const result = await sql`
      DELETE FROM "pushSubscriptions";
    `;
    
    console.log(`✅ Cleaned up old subscriptions`);
    console.log('💡 Users will need to re-enable notifications to get new ones with updated VAPID keys');
    
  } catch (error) {
    console.error('❌ Error cleaning subscriptions:', error.message);
    console.log('💡 Don\'t worry - old subscriptions will fail and be automatically removed');
  }
}

// Run the cleanup
cleanOldSubscriptions()
  .then(() => {
    console.log('\n🎉 Cleanup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Go to Settings > Notifications');
    console.log('3. If notifications are enabled, disable and re-enable them');
    console.log('4. Test notifications again');
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error);
  });