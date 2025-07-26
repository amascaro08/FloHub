#!/usr/bin/env node
// scripts/create-push-table.js
// Script to create the pushSubscriptions table

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function createPushSubscriptionsTable() {
  console.log('🔧 Creating pushSubscriptions table...');
  
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl || databaseUrl === 'your-neon-database-url-here') {
    console.log('❌ Database URL not configured');
    console.log('📝 To fix this:');
    console.log('1. Get your Neon database URL from your Neon dashboard');
    console.log('2. Update NEON_DATABASE_URL in .env.local');
    console.log('3. Or run this script in production where URL is configured');
    console.log('');
    console.log('💡 Alternative: Run the SQL manually in your Neon console:');
    console.log('   See: scripts/create-push-subscriptions-table.sql');
    process.exit(1);
  }
  
  try {
    const sql = neon(databaseUrl);
    
    // Test connection
    console.log('🔗 Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if table already exists
    console.log('🔍 Checking if pushSubscriptions table exists...');
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pushSubscriptions'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ pushSubscriptions table already exists');
      
      // Show current structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'pushSubscriptions' 
        ORDER BY ordinal_position;
      `;
      
      console.log('📋 Current table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
      
      return;
    }
    
    // Create the table
    console.log('🔨 Creating pushSubscriptions table...');
    await sql`
      CREATE TABLE "pushSubscriptions" (
        "id" text PRIMARY KEY NOT NULL,
        "user_email" varchar(255) NOT NULL,
        "subscription" jsonb NOT NULL
      );
    `;
    
    // Add index for performance
    console.log('🔨 Adding index on user_email...');
    await sql`
      CREATE INDEX "idx_pushSubscriptions_user_email" ON "pushSubscriptions" ("user_email");
    `;
    
    // Verify creation
    const newColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'pushSubscriptions' 
      ORDER BY ordinal_position;
    `;
    
    console.log('✅ pushSubscriptions table created successfully!');
    console.log('📋 Table structure:');
    newColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Test insert/delete to verify it works
    console.log('🧪 Testing table functionality...');
    const testId = 'test-subscription-' + Date.now();
    
    await sql`
      INSERT INTO "pushSubscriptions" ("id", "user_email", "subscription")
      VALUES (${testId}, 'test@example.com', ${'{"test": true}'})
    `;
    
    await sql`
      DELETE FROM "pushSubscriptions" WHERE "id" = ${testId}
    `;
    
    console.log('✅ Table functionality test passed!');
    console.log('');
    console.log('🎉 pushSubscriptions table is ready for notifications!');
    console.log('💡 You can now test notifications in your app');
    
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Verify your database URL is correct');
    console.log('2. Check that your database is running');
    console.log('3. Ensure you have permission to create tables');
    console.log('4. Try running the SQL manually in Neon console');
    process.exit(1);
  }
}

// Run the table creation
createPushSubscriptionsTable()
  .then(() => {
    console.log('✅ Script completed successfully');
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });