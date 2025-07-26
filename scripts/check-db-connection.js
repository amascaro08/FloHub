#!/usr/bin/env node
// scripts/check-db-connection.js
// Script to check database connectivity and ensure tables exist

require('dotenv').config({ path: '.env.local' });
const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...');
  
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl || databaseUrl === 'your-neon-database-url-here') {
    console.log('❌ Database URL not configured');
    console.log('📝 To fix this:');
    console.log('1. Get your Neon database URL from your Neon dashboard');
    console.log('2. Update NEON_DATABASE_URL in .env.local');
    console.log('3. Format: postgresql://username:password@hostname/database?sslmode=require');
    console.log('');
    console.log('💡 In production, this is already configured in Vercel environment variables');
    return false;
  }
  
  try {
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    
    // Test basic connection
    console.log('🔗 Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check if pushSubscriptions table exists
    console.log('🔍 Checking pushSubscriptions table...');
    try {
      const result = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'pushSubscriptions'
        );
      `;
      
      const tableExists = result[0].exists;
      
      if (tableExists) {
        console.log('✅ pushSubscriptions table exists');
        
        // Check table structure
        const columns = await sql`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'pushSubscriptions' 
          ORDER BY ordinal_position;
        `;
        
        console.log('📋 Table columns:');
        columns.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
        
        return true;
      } else {
        console.log('❌ pushSubscriptions table does not exist');
        console.log('🔧 To create the table, run: npm run db:push');
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking table:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Verify your database URL is correct');
    console.log('2. Check that your database is running');
    console.log('3. Ensure your IP is allowed to connect');
    console.log('4. Verify SSL/TLS settings');
    return false;
  }
}

// Run the check
checkDatabaseConnection()
  .then((success) => {
    if (success) {
      console.log('');
      console.log('🎉 Database is ready for notifications!');
    } else {
      console.log('');
      console.log('⚠️  Database setup required for notifications to work');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });